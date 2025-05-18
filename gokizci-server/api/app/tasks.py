from datetime import datetime
from app.celery_app import celery
from .utils.video_processing import process_video_frame
from models.video_segment import VideoSegment
from app.extensions import socketio

@celery.task
def process_frame_task(source_id: str, frame_b64: str):
    """
    Celery worker task:
    - Runs inference via process_video_frame
    - Persists result to MongoDB as VideoSegment
    - Emits processed_frame event via Socket.IO
    """
    # 1) AI modülü: anomaly skoru ve işlenmiş frame’i al
    result = process_video_frame(source_id, frame_b64)
    if not result:
        return

    # 2) Veritabanına segment kaydı
    VideoSegment(
        source_id=source_id,
        frame_data=frame_b64.encode('utf-8'),
        timestamp=datetime.fromisoformat(result['timestamp']),
        anomaly_detected=result['anomaly_detected'],
        confidence=result.get('confidence', 0.0)
    ).save()

    # 3) SocketIO ile odadaki tüm client’lara yayınla
    socketio.emit(
        'processed_frame',
        {
            'source_id': source_id,
            'frame': result['frame'],
            'timestamp': result['timestamp'],
            'anomaly_detected': result['anomaly_detected'],
            'confidence': result.get('confidence')
        },
        room=source_id
    )

