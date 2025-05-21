# api/models/video_segment.py
from mongoengine import Document, StringField, DateTimeField, BooleanField, BinaryField, FloatField
from datetime import datetime, timezone

class VideoSegment(Document):
    source_id = StringField(required=True)
    frame_data = BinaryField(required=True)  # Base64 encoded frame
    timestamp = DateTimeField(default=lambda: datetime.now(timezone.utc))
    anomaly_detected = BooleanField(default=False)
    confidence = FloatField()

    def to_dict(self):
        return {
            'id': str(self.id),
            'source_id': self.source_id,
            'timestamp': self.timestamp.isoformat(),
            'anomaly_detected': self.anomaly_detected,
            'confidence': self.confidence
        }

    meta = {
        'collection': 'video_segments',
        'indexes': [
            'source_id',
            # 'timestamp', # Bu satırı değiştiriyoruz
            {'fields': ['timestamp'], 'expireAfterSeconds': 3600, 'background': True}, # TTL index tanımı
            'anomaly_detected',
            ('source_id', 'timestamp')  # Compound index for efficient querying
        ],
        # index_background: True # Genel background ayarı, bireysel indexlerde belirtildiği için kaldırılabilir veya kalabilir.
                                  # Yukarıdaki TTL index tanımına background:True ekledim.
    }
