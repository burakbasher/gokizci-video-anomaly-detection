import eventlet
from eventlet import tpool
from flask_socketio import SocketIO
from .utils.video_processing import process_video_frame
from models.video_segment import VideoSegment
from datetime import datetime

# Socket.IO uygulaması (Eventlet ile). index.py'de eventlet.monkey_patch() çağrıldıktan sonra yüklenmeli
socketio = SocketIO(
    cors_allowed_origins='*',
    async_mode='eventlet'
)

# Aynı anda maksimum WORKER_COUNT kadar frame işleyebilecek bir pool
WORKER_COUNT = 32
pool = eventlet.GreenPool(size=WORKER_COUNT)

def _process_frame_job(source_id: str, frame_b64: str):
    """
    1) process_video_frame: CPU-bound, offload to thread pool
    2) MongoDB save: blocking I/O, offload to thread pool
    3) socketio.emit: non-blocking
    """
    try:
        # 1) AI modülü
        result = tpool.execute(process_video_frame, source_id, frame_b64)
        if not result:
            return

        # 2) Veritabanına segment kaydı
        segment = VideoSegment(
            source_id=source_id,
            frame_data=frame_b64.encode('utf-8'),
            timestamp=datetime.fromisoformat(result['timestamp']),
            anomaly_detected=result['anomaly_detected'],
            confidence=result.get('confidence', 0.0)
        )
        # Save in thread pool to avoid blocking
        tpool.execute(segment.save)

        # 3) Emit
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
    finally:
        # Yield control to scheduler to allow other greenlets to run
        eventlet.sleep(0)
