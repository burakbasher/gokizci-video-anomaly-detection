"""api/models/video_segment.py"""

from mongoengine import Document, StringField, DateTimeField, BooleanField, BinaryField, FloatField
from datetime import datetime

class VideoSegment(Document):
    source_id = StringField(required=True)
    frame_data = BinaryField(required=True)  # Base64 encoded frame
    timestamp = DateTimeField(default=datetime.utcnow)
    anomaly_detected = BooleanField(default=False)
    anomaly_type = StringField()  # Optional: specific type of anomaly detected
    confidence = FloatField()  # Optional: confidence score of anomaly detection

    def to_dict(self):
        return {
            'id': str(self.id),
            'source_id': self.source_id,
            'timestamp': self.timestamp.isoformat(),
            'anomaly_detected': self.anomaly_detected,
            'anomaly_type': self.anomaly_type,
            'confidence': self.confidence
        }

    meta = {
        'collection': 'video_segments',
        'indexes': [
            'source_id',
            'timestamp',
            'anomaly_detected',
            ('source_id', 'timestamp')  # Compound index for efficient querying
        ],
        'index_background': True
    } 