import eventlet
from eventlet import tpool
from flask_socketio import SocketIO
from .utils.video_processing import process_video_frame # .utils varsayımıyla
from models.video_segment import VideoSegment
from datetime import datetime, timezone # <--- timezone'u import edin
import threading
from collections import OrderedDict
import time
import logging

logger = logging.getLogger(__name__)
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

"""
def _process_frame_job(source_id: str, frame_payload: dict): # Artık tüm payload'ı alıyoruz
    """"""
    Frame işleme ve sıralama.
    frame_payload: {'source_id': ..., 'frame': b64_str, 'sequence': int, 'client_timestamp_abs': float, 'client_timestamp_rel': int}
    """"""
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
"""

def _process_single_frame_from_batch(source_id: str, frame_data_in_batch: dict):
    client_sequence = frame_data_in_batch.get('sequence', 'N/A') # Log için alalım
    try:
        frame_b64 = frame_data_in_batch.get('frame_b64')
        client_ts_abs = frame_data_in_batch.get('client_timestamp_abs')
        client_ts_rel = frame_data_in_batch.get('client_timestamp_rel') # İstemciden gelen göreceli zaman damgasını al

        if client_ts_rel is None: # Göreceli zaman damgası yoksa veya None ise logla (bu olmamalı)
            logger.warning(f"[_PROCESSOR] Missing client_timestamp_rel in batch frame. Source: {source_id}, ClientSeq: {client_sequence}")
            # Burada bir varsayılan değer atayabilir veya frame'i işlemeyebilirsiniz.
            # Şimdilik, eğer VideoStream.tsx'in buna ihtiyacı varsa, bu frame'in atlanmasına neden olabilir.
            
        if not frame_b64 or client_ts_abs is None:
            logger.warning(f"[_PROCESSOR] Missing frame_b64 in batch frame. Source: {source_id}, ClientSeq: {client_sequence}")
            return

        # AI İşleme
        result = tpool.execute(process_video_frame, source_id, frame_b64)
        if not result: return    
        
         # DB Kaydı
        db_timestamp_utc = datetime.fromtimestamp(client_ts_rel, tz=timezone.utc)
            
        segment = VideoSegment(
            source_id=source_id,
            frame_data=frame_b64.encode('utf-8'),
            timestamp=db_timestamp_utc,
            anomaly_detected=result['anomaly_detected'],
            confidence=result.get('confidence', 0.0),
            # client_sequence=client_sequence # DB'ye de eklenebilir
        )
        tpool.execute(segment.save) # DB kaydını da tpool'a veriyoruz


            # Sıralama ve Web'e Gönderme
        frames_for_source, source_specific_lock = get_or_create_sequence(source_id)
        
        with source_specific_lock:
            key_for_ordering = client_ts_abs # İstemci zaman damgası ile sırala

            payload_to_web = {
                'source_id': source_id,
                'frame': result['frame'], # AI modelinden gelen (muhtemelen base64)
                'server_timestamp_iso': db_timestamp_utc.isoformat(),
                'client_sequence': client_sequence,
                'client_timestamp_abs': client_ts_abs,
                'client_timestamp_rel': client_ts_rel,
                'anomaly_detected': result['anomaly_detected'],
                'confidence': result.get('confidence')
            }
            frames_for_source[key_for_ordering] = payload_to_web
            logger.debug(f"[_PROCESSOR] Frame added to ordering queue. Source: {source_id}, ClientSeq: {client_sequence}, QueueSize: {len(frames_for_source)}")
            
            while frames_for_source:
                # OrderedDict anahtarları zaten eklendikleri sırayla tutar.
                # Eğer anahtarlar (client_ts_abs) her zaman artan sırada eklenmiyorsa
                # (farklı green thread'ler farklı zamanlarda bitirebileceği için),
                # en düşük anahtarlı olanı almak için OrderedDict'i yeniden sıralamamız gerekir
                # veya farklı bir veri yapısı (örn: heapq veya SortedDict) kullanmamız gerekir.

                # Python 3.7+ OrderedDict ekleme sırasını korur.
                # Anahtarlar (client_ts_abs) float olduğu için, OrderedDict'in anahtarlarını
                # alıp sıralayarak en küçüğünü bulabiliriz.
                
                # En düşük anahtarı (en eski client_timestamp_abs) bul
                if not frames_for_source: # Ekstra kontrol
                    break
                 # OrderedDict'in anahtarları üzerinde sıralama yaparak en küçüğünü almak yerine,
                # OrderedDict'in kendisi zaten ekleme sırasını koruduğu için,
                # ve biz client_ts_abs'yi anahtar olarak kullandığımız için,
                # eğer greenlet'ler client_ts_abs sırasına yakın bir sırada ekleme yapıyorsa,
                # next(iter(frames_for_source.keys())) genellikle en eskiyi verir.
                # Ancak greenlet'lerin bitiş sırası garanti olmadığından, bu varsayım risklidir.

                # Doğru ve güvenli yöntem: Kuyruktaki tüm anahtarların en küçüğünü bul.
                # Bu, OrderedDict için çok verimli olmayabilir eğer sık sık yapılıyorsa.
                # Daha iyi bir yapı SortedDict (örn: sortedcontainers kütüphanesinden) veya heapq olabilir.
                # Şimdilik basit bir yaklaşımla devam edelim:
                
                # YAKLAŞIM 1: OrderedDict'i her seferinde sıralı anahtarlara göre işle (daha az verimli ama doğru)
                # oldest_key = min(frames_for_source.keys()) # Bu, tüm key'ler üzerinde iterasyon yapar

                # YAKLAŞIM 2: OrderedDict'in ilk elemanını al (ekleme sırasına göre)
                # Bu, greenlet'lerin kabaca sıralı bittiği varsayımına dayanır.
                # Loglardaki ClientSeq karışıklığı, bu varsayımın her zaman doğru olmadığını gösteriyor.
                # ANCAK, OrderedDict'e client_ts_abs anahtarıyla ekleme yapıyoruz.
                # OrderedDict, anahtarları sıralı tutmaz, ekleme sırasını korur.
                # Bu yüzden, emit etmeden önce anahtarlara göre sıralanmış bir görünüm elde etmeliyiz.

                # DÜZELTİLMİŞ MANTIK:
                # Kuyruktaki en düşük client_ts_abs'ye sahip frame'i bul ve gönder.
                # Bu, kuyrukta birden fazla frame biriktiğinde doğru sıralamayı sağlar.
                
                # Eğer kuyrukta eleman varsa
                # Anahtarları (client_ts_abs) al ve en küçüğünü bul.
                # Bu, kuyruğun her zaman en eski frame'i göndermesini sağlar.
                # Not: Bu, OrderedDict'in O(1) erişim avantajını biraz azaltır,
                # ama sıralı gönderim için gereklidir.
                # Daha performanslı bir çözüm için priority queue (heapq) düşünülebilir.
                
                # En basit ve anlaşılır yol:
                # OrderedDict'in anahtarları zaten eklendikleri sırayla gelir.
                # Eğer biz her zaman en düşük client_ts_abs'li olanı istiyorsak,
                # ve greenlet'ler karışık sırada bitiriyorsa, OrderedDict'in ilk elemanı
                # her zaman en düşük client_ts_abs'li olmayabilir.
                
                # GERÇEK ÇÖZÜM:
                # OrderedDict'i (source_id için olan) anahtarlarına göre sıralanmış bir listeye çevirip
                # ilk elemanı almak ve onu OrderedDict'ten çıkarmak.
                
                # Anahtarları (client_ts_abs) sıralı bir şekilde al
                sorted_keys = sorted(list(frames_for_source.keys()))
                if not sorted_keys: # Kuyruk boşaldıysa (başka bir thread tarafından)
                    break
                # Sıralı anahtarların en küçüğünü al
                oldest_key = sorted_keys[0]
                
                # TODO: Burada bir "threshold" eklenebilir.
                # Eğer oldest_key, o anki zamana göre çok eskiyse (belirli bir gecikme eşiğini aştıysa)
                # veya kuyruk boyutu çok büyüdüyse, birden fazla frame gönderilebilir (catch-up).
                # Şimdilik sadece en eskiyi gönderiyoruz.
                frame_to_emit = frames_for_source.pop(oldest_key)
                emit_client_seq = frame_to_emit.get('client_sequence', 'N/A')
                logger.info(f"[_PROCESSOR] Emitting 'processed_frame' to web. Source: {source_id}, ClientSeq: {emit_client_seq}, EmitKey (client_ts_abs): {oldest_key:.4f}, QueueSize after pop: {len(frames_for_source)}")
                socketio.emit('processed_frame', frame_to_emit, room=source_id)
                # Bu if koşulu genellikle gereksiz olacak çünkü OrderedDict zaten sıralı
                # if oldest_key > key_for_ordering: # Eğer bir şekilde daha yeni bir frame emit etmeye çalışırsak (olmamalı)
                #     logger.warning(f"[_PROCESSOR] Attempted to emit a frame (key {oldest_key}) newer than current processing key ({key_for_ordering}). This should not happen with OrderedDict.")
                #     frames_for_source[oldest_key] = frame_to_emit # Geri koy
                #     break
                                
    except Exception as e:
        logger.error(f"[_PROCESSOR] Error processing single frame. Source: {source_id}, ClientSeq: {client_sequence}, Error: {e}", exc_info=True)
    finally:
        eventlet.sleep(0) # Eventlet'e kontrolü bırak