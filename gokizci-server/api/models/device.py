"""api/models/device.py"""

from mongoengine import Document, StringField, DateTimeField, BooleanField, IntField
from datetime import datetime

class Device(Document):
    name = StringField(required=True)
    source_id = StringField(required=True, unique=True)
    type = StringField(required=True, choices=['drone', 'ip_camera', 'webcam'])
    status = StringField(default='offline', choices=['online', 'offline', 'error'])
    last_seen = DateTimeField(default=datetime.utcnow)
    stream_url = StringField()
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'source_id': self.source_id,
            'type': self.type,
            'status': self.status,
            'last_seen': self.last_seen.isoformat(),
            'stream_url': self.stream_url,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    meta = {
        'collection': 'devices',
        'indexes': ['source_id', 'type', 'status']
    } 