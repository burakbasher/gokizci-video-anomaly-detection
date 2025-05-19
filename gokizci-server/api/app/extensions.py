import eventlet
from eventlet import tpool
from flask_socketio import SocketIO
from .utils.video_processing import process_video_frame
from models.video_segment import VideoSegment
from datetime import datetime
import threading
from collections import OrderedDict
import time

# Socket.IO uygulaması (Eventlet ile). index.py'de eventlet.monkey_patch() çağrıldıktan sonra yüklenmeli
socketio = SocketIO(
    cors_allowed_origins='*',
    async_mode='eventlet'
)

# Aynı anda maksimum WORKER_COUNT kadar frame işleyebilecek bir pool
WORKER_COUNT = 32
pool = eventlet.GreenPool(size=WORKER_COUNT)

# Thread-safe frame işleme için lock
frame_processing_lock = threading.Lock()

# Her kaynak için frame sıralaması
frame_sequences = {}
sequence_locks = {}

def get_or_create_sequence(source_id: str):
    if source_id not in frame_sequences:
        frame_sequences[source_id] = OrderedDict()
        sequence_locks[source_id] = threading.Lock()
    return frame_sequences[source_id], sequence_locks[source_id]

def _process_frame_job(source_id: str, frame_b64: str):
    """
    Thread-safe frame işleme ve sıralama:
    1) process_video_frame: CPU-bound, offload to thread pool
    2) MongoDB save: blocking I/O, offload to thread pool
    3) socketio.emit: non-blocking
    """
    try:
        with frame_processing_lock:
            # 1) AI modülü - thread pool'da çalıştır
            result = tpool.execute(process_video_frame, source_id, frame_b64)
            if not result:
                return

            # Frame sıralaması için timestamp
            timestamp = time.time()
            
            # 2) Veritabanına segment kaydı - thread pool'da çalıştır
            segment = VideoSegment(
                source_id=source_id,
                frame_data=frame_b64.encode('utf-8'),
                timestamp=datetime.fromtimestamp(timestamp),
                anomaly_detected=result['anomaly_detected'],
                confidence=result.get('confidence', 0.0)
            )
            tpool.execute(segment.save)

            # Frame'i sıralı gönder
            frames, lock = get_or_create_sequence(source_id)
            with lock:
                frames[timestamp] = {
                    'source_id': source_id,
                    'frame': result['frame'],
                    'timestamp': timestamp,
                    'anomaly_detected': result['anomaly_detected'],
                    'confidence': result.get('confidence')
                }
                
                # Sıralı gönderim için kontrol
                while frames:
                    oldest_timestamp = next(iter(frames))
                    if oldest_timestamp <= timestamp:
                        frame_data = frames.pop(oldest_timestamp)
                        socketio.emit('processed_frame', frame_data, room=source_id)
                    else:
                        break

    except Exception as e:
        print(f"Frame processing error: {e}")
    finally:
        # Yield control to scheduler
        eventlet.sleep(0)
