"""api/app/replay/meta_utils.py"""

from datetime import datetime, timedelta
from models.video_segment import VideoSegment
from models.replay_meta import ReplayMeta

def compute_replay_meta(source_id, window_start):
    window_end = window_start + timedelta(hours=1)
    segments = VideoSegment.objects(
        source_id=source_id,
        timestamp__gte=window_start,
        timestamp__lt=window_end
    )

    # 60 dakika, 3600 saniye
    minute_anomaly = [0] * 60
    second_filled = [0] * 3600

    # Saniye ve dakika bazında frame ve anomaly say
    second_frames = [[] for _ in range(3600)]
    minute_anomaly_counts = [0] * 60
    minute_total_counts = [0] * 60

    for seg in segments:
        dt = seg.timestamp.replace(tzinfo=None)
        sec_idx = int((dt - window_start).total_seconds())
        min_idx = sec_idx // 60
        if 0 <= sec_idx < 3600 and 0 <= min_idx < 60:
            second_frames[sec_idx].append(seg.anomaly_detected)
            minute_total_counts[min_idx] += 1
            if seg.anomaly_detected:
                minute_anomaly_counts[min_idx] += 1

    # Doluluk ve anomaly bitlerini hesapla
    for i in range(3600):
        if len(second_frames[i]) >= 0.9 * 25:  # saniyede 25 frame'in %90'ı varsa dolu
            second_filled[i] = 1

    for i in range(60):
        if minute_total_counts[i] > 0 and (minute_anomaly_counts[i] / minute_total_counts[i]) >= 0.8:
            minute_anomaly[i] = 1

    # Bit dizilerini bytes'a çevir
    minute_anomaly_bytes = int(''.join(map(str, minute_anomaly)), 2).to_bytes(8, 'big')[-8:]
    second_filled_bytes = int(''.join(map(str, second_filled)), 2).to_bytes(450, 'big')[-450:]

    
    # DB'ye kaydet/güncelle
    # meta, _ = ReplayMeta.objects.get_or_create(  # <--- ORİJİNAL SATIR
    #     source_id=source_id,
    #     window_start=window_start,
    #     defaults={
    #         'minute_anomaly_bits': minute_anomaly_bytes,
    #         'second_filled_bits': second_filled_bytes
    #     }
    # )

    # ALTERNATİF (get_or_create doğrudan çalışmazsa):
    meta = ReplayMeta.objects(source_id=source_id, window_start=window_start).first()
    created = False
    if not meta:
        meta = ReplayMeta(
            source_id=source_id,
            window_start=window_start,
            minute_anomaly_bits=minute_anomaly_bytes, # defaults içeriği buraya gelir
            second_filled_bits=second_filled_bytes
        )
        created = True # Eğer bu bilgiye ihtiyacınız varsa
        
    meta.minute_anomaly_bits = minute_anomaly_bytes
    meta.second_filled_bits = second_filled_bytes
    meta.save()
    return meta
