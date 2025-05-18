# api/app/extensions.py

from flask_socketio import SocketIO

# Redis üzerinden publish/subscribe ile hem Flask hem Celery'den emit edilebilsin
socketio = SocketIO(
    message_queue='redis://127.0.0.1:6379/2',
    cors_allowed_origins='*',
    async_mode='eventlet'
)
