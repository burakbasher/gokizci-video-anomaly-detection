"""api/app/replay/meta_utils.py"""

from datetime import datetime, timedelta
from models.video_segment import VideoSegment
from models.replay_meta import ReplayMeta
import logging

logger = logging.getLogger(__name__)

def compute_replay_meta(source_id, window_start):
    window_end = window_start + timedelta(hours=1)
    
    logger.info(f"COMPUTE_META: Querying segments for source_id={source_id}, "
        f"window_start_utc={window_start.isoformat()}, window_end_utc={window_end.isoformat()}")
    
    segments = VideoSegment.objects(
        source_id=source_id,
        timestamp__gte=window_start,
        timestamp__lt=window_end
    )
    found_segments_count = segments.count() # Sayıyı bir kere alalım

    logger.info(f"COMPUTE_META: Found {found_segments_count} segments for this window.") # Kaç segment bulundu?
    minute_anomaly = [0] * 60
    second_filled = [0] * 3600

    minute_anomaly_bytes = int(''.join(map(str, minute_anomaly)), 2).to_bytes(8, 'big')[-8:]
    second_filled_bytes = int(''.join(map(str, second_filled)), 2).to_bytes(450, 'big')[-450:]
    if not segments:
        logger.warning(f"COMPUTE_META: No segments found for source_id={source_id} in window {window_start.isoformat()}. Meta will be empty.")
        return ReplayMeta(
            source_id=source_id,
            window_start=window_start,
            minute_anomaly_bits=minute_anomaly_bytes,
            second_filled_bits=second_filled_bytes
        )

    # Saniye ve dakika bazında frame ve anomaly sayılarını hesapla
    second_frames = [[] for _ in range(3600)]
    minute_anomaly_counts = [0] * 60
    minute_total_counts = [0] * 60

    for seg in segments:
        try:
            time_diff_seconds = (seg.timestamp - window_start).total_seconds()
        except TypeError:
            logger.error(f"COMPUTE_META: Error calculating time difference for segment {seg.id}. "
                         f"Timestamp: {seg.timestamp}, Window start: {window_start}")
            continue

        sec_idx = int(time_diff_seconds)
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

    
    # Hesaplamalardan sonra bit dizilerinin içeriğini loglayın (kısaca)
    minute_anomaly_str = ''.join(map(str, minute_anomaly))
    second_filled_str = ''.join(map(str, second_filled))
    logger.info(f"COMPUTE_META: Minute Anomaly Bits (first 10): {minute_anomaly_str[:10]}")
    logger.info(f"COMPUTE_META: Second Filled Bits (first 30): {second_filled_str[:30]}")
    
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
    else:
        meta.minute_anomaly_bits = minute_anomaly_bytes
        meta.second_filled_bits = second_filled_bytes
        
        
    meta.save()
    return meta
