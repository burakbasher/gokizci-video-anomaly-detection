# api/models/replay_meta.py
from mongoengine import Document, StringField, DateTimeField, BinaryField

class ReplayMeta(Document):
    source_id = StringField(required=True)
    window_start = DateTimeField(required=True)  # 1 saatlik pencerenin başlangıcı (ör: 12:00:00)
    minute_anomaly_bits = BinaryField(required=True)  # 60 bit
    second_filled_bits = BinaryField(required=True)   # 3600 bit

    meta = {
        'indexes': [
            ('source_id', 'window_start')
        ],
        'collection': 'replay_meta' # Koleksiyon adını da belirtmek iyi bir pratiktir.
    }