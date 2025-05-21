import eventlet
from eventlet import tpool
from flask_socketio import SocketIO
from .utils.video_processing import process_video_frame # .utils varsayımıyla
from models.video_segment import VideoSegment
from datetime import datetime, timezone # <--- timezone'u import edin
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
frame_processing_lock = threading.Lock() # Bu global lock performansı etkileyebilir, dikkatli kullanılmalı

# Her kaynak için frame sıralaması
frame_sequences = {}
sequence_locks = {} # Her kaynak için ayrı lock daha iyi olabilir

def get_or_create_sequence(source_id: str):
    # Bu fonksiyon thread-safe değil, dikkatli olunmalı.
    # sequence_locks[source_id] = threading.Lock() kısmı her çağrıda yeni lock oluşturur.
    # Daha iyi bir yaklaşım:
    if source_id not in sequence_locks:
        sequence_locks[source_id] = threading.Lock() # Kaynağa özel lock
    if source_id not in frame_sequences:
        frame_sequences[source_id] = OrderedDict()
    return frame_sequences[source_id], sequence_locks[source_id]

def _process_frame_job(source_id: str, frame_payload: dict): # Artık tüm payload'ı alıyoruz
    """
    Frame işleme ve sıralama.
    frame_payload: {'source_id': ..., 'frame': b64_str, 'sequence': int, 'client_timestamp_abs': float, 'client_timestamp_rel': int}
    """
    try:
        frame_b64 = frame_payload.get('frame')
        client_sequence = frame_payload.get('sequence')
        client_ts_abs = frame_payload.get('client_timestamp_abs')
        # client_ts_rel = frame_payload.get('client_timestamp_rel') # Bu da kullanılabilir

        if not frame_b64:
            print(f"Missing frame data in payload for {source_id}", flush=True)
            return

        # Global lock yerine, kaynağa özel bir lock veya daha az kısıtlayıcı bir mekanizma düşünülebilir.
        with frame_processing_lock:
            result = tpool.execute(process_video_frame, source_id, frame_b64)
            if not result:
                return

            # Veritabanı için timestamp: İstemciden gelen mutlak zaman damgasını kullanmak daha doğru olabilir
            # Eğer istemci ve sunucu saatleri senkronize ise. Değilse, sunucu zamanı (time.time()) tercih edilebilir.
            # Şimdilik sunucu zamanını kullanalım ama istemci zamanını da loglayabiliriz.
            server_received_unix_ts = time.time()
            db_timestamp_utc = datetime.fromtimestamp(server_received_unix_ts, tz=timezone.utc)
            
            # Eğer istemci zamanını kullanmak isterseniz:
            # if client_ts_abs:
            #    db_timestamp_utc = datetime.fromtimestamp(client_ts_abs, tz=timezone.utc)

            segment = VideoSegment(
                source_id=source_id,
                frame_data=frame_b64.encode('utf-8'), # frame_b64 string ise
                timestamp=db_timestamp_utc,
                anomaly_detected=result['anomaly_detected'],
                confidence=result.get('confidence', 0.0)
                # İsterseniz client_sequence ve client_ts_rel'i de buraya kaydedebilirsiniz
            )
            tpool.execute(segment.save)

            frames_for_source, source_specific_lock = get_or_create_sequence(source_id)
            with source_specific_lock:
                # Sıralama için istemci sıra numarasını veya zaman damgasını kullanabiliriz.
                # Unix timestamp (float) hala iyi bir anahtar olabilir.
                # Ya da (client_sequence, server_received_unix_ts) gibi bir tuple.
                # Şimdilik server_received_unix_ts'i kullanalım, çünkü bu artan ve benzersiz olmaya daha yakın.
                
                key_for_ordering = server_received_unix_ts # Veya client_sequence

                frames_for_source[key_for_ordering] = {
                    'source_id': source_id,
                    'frame': result['frame'], # AI modelinden gelen frame
                    'server_timestamp_iso': db_timestamp_utc.isoformat(), # Sunucu zamanı (ISO)
                    'client_sequence': client_sequence,
                    # 'client_timestamp_rel': client_ts_rel, # İsteğe bağlı
                    'anomaly_detected': result['anomaly_detected'],
                    'confidence': result.get('confidence')
                }
                
                # Sıralı gönderim (OrderedDict en eski ekleneni (en düşük anahtar) önce verir)
                while frames_for_source:
                    oldest_key = next(iter(frames_for_source))
                    # Bu kontrol, eğer key_for_ordering her zaman artıyorsa (örn: time.time())
                    # ve tek bir thread ekleme yapıyorsa (source_specific_lock sayesinde)
                    # aslında if oldest_key <= key_for_ordering: her zaman doğru olur.
                    # Ama birden fazla worker aynı anda bu bloğa girebilseydi önemli olurdu.
                    # Şimdilik mantığı koruyalım.
                    if oldest_key <= key_for_ordering:
                        frame_to_emit = frames_for_source.pop(oldest_key)
                        socketio.emit('processed_frame', frame_to_emit, room=source_id)
                    else:
                        break
    except Exception as e:
        print(f"Frame processing error in _process_frame_job for {source_id} (seq: {frame_payload.get('sequence')}): {e}", flush=True)
    finally:
        eventlet.sleep(0)
