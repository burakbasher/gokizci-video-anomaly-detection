import eventlet
from flask_socketio import SocketIO
from .utils.video_processing import process_video_frame
from models.video_segment import VideoSegment
from datetime import datetime

# SocketIO zaten kurulmuş
socketio = SocketIO(
    cors_allowed_origins='*',
    async_mode='eventlet'
)

# 1. In-memory queue: frame’leri buraya ekleyeceğiz
frame_queue = eventlet.Queue()

# 2. İşlem havuzu (concurrency ayarı)
WORKER_COUNT = 8
pool = eventlet.GreenPool(size=WORKER_COUNT)

def _process_frame_job(source_id, frame_b64):
    """
    Gerçek frame işleme + DB kaydetme + emit
    """
    result = process_video_frame(source_id, frame_b64)
    if not result:
        return
    # 2.a) Veritabanına kaydet
    VideoSegment(
        source_id=source_id,
        frame_data=frame_b64.encode('utf-8'),
        timestamp=datetime.fromisoformat(result['timestamp']),
        anomaly_detected=result['anomaly_detected'],
        confidence=result.get('confidence', 0.0)
    ).save()
    # 2.b) Socket.IO ile yayınla
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

def _frame_queue_worker():
    """
    Kuyruktan frame al, havuza gönder
    Sürekli döner.
    """
    while True:
        source_id, frame_b64 = frame_queue.get()
        # pool içinden bir worker seç ve işlemi başlat
        pool.spawn_n(_process_frame_job, source_id, frame_b64)

# 3. Server ayağa kalkarken bu fonksiyonu başlat
eventlet.spawn_n(_frame_queue_worker)
