import os
import base64
import random
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
# from PIL import Image # PIL'e artık gerek yok, sadece base64 çevirimi yapıyoruz

# --- Konfigürasyon ---
MONGO_URI = "mongodb://127.0.0.1:27017/"
DB_NAME = "Gokizci"
COLLECTION_NAME = "video_segments" # Koleksiyon adınızı kontrol edin!

IMAGE_FOLDER_PATH = "gokizci-server/5._Video_normalized" # Bu yolu kendi sisteminize göre düzeltin
SOURCE_ID = "ff77f3d0-3a30-4ced-90de-a57dc6ebe916"
FPS = 30 # İsteğiniz üzerine 30 FPS
TOTAL_DURATION_MINUTES = 52 # İsteğiniz üzerine 52 dakika

# Başlangıç Zamanı (UTC)
# 23 Mayıs 2025, 06:13:00 UTC (DB'deki örneğe ve isteğinize göre)
start_timestamp_utc = datetime(2025, 5, 23, 6, 13, 0, tzinfo=timezone.utc)

# 529 frame'lik döngü için ANOMALİ ARALIKLARI (1-tabanlı frame numaraları)
# Grafiksel orantılamaya göre güncellenmiştir.
ANOMALY_RANGES_IN_CYCLE = [
    (42, 62),    # ~20 frame
    (98, 342),   # ~245 frame
    (452, 513)   # ~62 frame
]

# --- Yardımcı Fonksiyonlar ---
def get_image_files(folder_path):
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".jpg")]
    files.sort()
    return files

def is_anomalous(frame_number_in_cycle, anomaly_ranges):
    for start, end in anomaly_ranges:
        if start <= frame_number_in_cycle <= end:
            return True
    return False

def image_to_base64_bytes(image_path):
    """Bir görüntü dosyasını okuyup base64 ile decode edilmiş bytes olarak döndürür."""
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read())
            return encoded_string # Saklarken base64 string olarak saklayalım, DB örneğinizdeki gibi
                                  # Binary.createFromBase64() backend'de decode eder.
                                  # Eğer Pymongo doğrudan Binary istiyorsa: return base64.b64decode(encoded_string)
                                  # DB'deki örnek `Binary.createFromBase64(STRING, TYPE)` şeklinde.
                                  # Bu, base64 string'inin saklandığını ve MongoDB driver'ının veya MongoEngine'in bunu
                                  # okurken/yazarken Binary tipine çevirdiğini gösterir.
                                  # Python'dan pymongo ile yazarken, eğer alan BSON Binary ise, bytes vermelisiniz.
                                  # Saklanan `frame_data` doğrudan base64 string ise, bu fonksiyon sadece encode edip string dönmeli.
                                  # DB'deki örnek `Binary.createFromBase64('LzlqLzRBQ... VFV0aExmdWhUcm1oRi...', 0)` şeklinde.
                                  # Bu, 'LzlqLzR...' kısmının base64 string olduğunu gösterir.
                                  # Dolayısıyla, base64 string'ini saklayacağız.
            # return base64.b64encode(image_file.read()).decode('utf-8') # Base64 string olarak
    except FileNotFoundError:
        print(f"Hata: {image_path} bulunamadı.")
        return None
    except Exception as e:
        print(f"Base64 çevrim hatası ({image_path}): {e}")
        return None

# --- Ana Script ---
def main():
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        print(f"MongoDB'ye bağlandı: {DB_NAME}.{COLLECTION_NAME}")
    except Exception as e:
        print(f"MongoDB bağlantı hatası: {e}")
        return

    image_files = get_image_files(IMAGE_FOLDER_PATH)
    if not image_files:
        print(f"'{IMAGE_FOLDER_PATH}' klasöründe hiç JPG dosyası bulunamadı.")
        return

    num_images_in_cycle = len(image_files)
    if num_images_in_cycle != 529: # Kontrol
        print(f"Uyarı: Klasörde {num_images_in_cycle} resim bulundu, ancak 529 bekleniyordu. Yine de devam ediliyor...")
        if num_images_in_cycle == 0:
            return


    print(f"Bulunan JPG dosyası sayısı (bir döngü için): {num_images_in_cycle}")
    print(f"Kullanılacak anomali aralıkları (1-tabanlı, döngü başına): {ANOMALY_RANGES_IN_CYCLE}")

    total_frames_to_generate = TOTAL_DURATION_MINUTES * 60 * FPS
    current_timestamp = start_timestamp_utc
    time_increment_per_frame = timedelta(seconds=1/FPS)

    print(f"Toplam {TOTAL_DURATION_MINUTES} dakika ({TOTAL_DURATION_MINUTES*60} saniye) için {total_frames_to_generate} frame üretilecek.")
    print(f"FPS: {FPS}. Saniyede bir frame için zaman artışı: {time_increment_per_frame.total_seconds()} saniye.")
    print(f"Başlangıç zamanı (UTC): {current_timestamp.isoformat()}")

    segments_to_insert = []
    for frame_count in range(total_frames_to_generate):
        current_image_index_in_cycle = frame_count % num_images_in_cycle
        image_filename = image_files[current_image_index_in_cycle]
        image_path = os.path.join(IMAGE_FOLDER_PATH, image_filename)
        frame_number_in_cycle = current_image_index_in_cycle + 1

        # frame_data'yı base64 string olarak alalım (DB'deki örneğe göre)
        frame_base64_str = image_to_base64_bytes(image_path) # Bu fonksiyon artık base64 string dönüyor
        if frame_base64_str is None:
            print(f"Frame {frame_count + 1} için {image_filename} işlenemedi, atlanıyor.")
            current_timestamp += time_increment_per_frame
            continue

        anomaly = is_anomalous(frame_number_in_cycle, ANOMALY_RANGES_IN_CYCLE)
        confidence = round(random.uniform(0.35, 0.55), 3) if anomaly else 0.0 # 3 ondalık hassasiyet

        segment_data = {
            "source_id": SOURCE_ID,
            "frame_data": frame_base64_str.decode('utf-8'), # Bytes'dan string'e çeviriyoruz, DB'deki örneğe uygun.
            "timestamp": current_timestamp, # Bu zaten datetime objesi
            "anomaly_detected": anomaly,
            "confidence": confidence
        }
        segments_to_insert.append(segment_data)

        if (frame_count + 1) % (FPS * 10) == 0: # Her 10 saniyede bir logla
            print(f"Hazırlanan toplam segment: {frame_count + 1}/{total_frames_to_generate} | Son Timestamp: {current_timestamp.isoformat()} | Döngü Frame: {frame_number_in_cycle} | Anomali: {anomaly}")

        if len(segments_to_insert) >= 1000: # Her 1000 segmentte bir DB'ye yaz
            try:
                collection.insert_many(segments_to_insert)
                print(f"===> {len(segments_to_insert)} segment başarıyla DB'ye yazıldı. (Toplam işlenen: {frame_count + 1})")
                segments_to_insert = []
            except Exception as e:
                print(f"DB'ye yazma hatası: {e}")
                # Hata durumunda devam etmeyi veya durmayı seçebilirsiniz. Şimdilik devam ediyor.

        current_timestamp += time_increment_per_frame

    if segments_to_insert:
        try:
            collection.insert_many(segments_to_insert)
            print(f"===> Kalan {len(segments_to_insert)} segment başarıyla DB'ye yazıldı.")
        except Exception as e:
            print(f"DB'ye yazma hatası (kalanlar): {e}")

    print(f"Veri oluşturma ve kaydetme tamamlandı. Toplam {total_frames_to_generate} frame işlendi.")
    print(f"Son timestamp (UTC): {current_timestamp.isoformat()}")
    client.close()

if __name__ == "__main__":
    # Klasör yolunu script'in bulunduğu dizine göre ayarla (opsiyonel ama daha sağlam)
    # SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    # IMAGE_FOLDER_PATH = os.path.join(SCRIPT_DIR, "gokizci-server/5._Video_normalized")
    # if not os.path.isdir(IMAGE_FOLDER_PATH):
    #     print(f"HATA: Görüntü klasörü bulunamadı: {IMAGE_FOLDER_PATH}")
    #     print("Lütfen IMAGE_FOLDER_PATH değişkenini doğru ayarlayın.")
    # else:
    #     main()
    main() # Eğer script ve klasör yapısı sabitse bu yeterli.