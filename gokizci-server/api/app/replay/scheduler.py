# api/app/replay/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from .meta_utils import compute_replay_meta
from models.device import Device
import logging

logger = logging.getLogger(__name__)

def get_all_source_ids():
    return [d.source_id for d in Device.objects.only('source_id')]

def scheduled_replay_meta_job():
    """
    Her 5 dakikada bir (saatin 0, 5, 10... dakikalarında) çalışacak olan iş.
    """
    now = datetime.utcnow()
    current_window_start = now.replace(minute=0, second=0, microsecond=0)
    logger.info(f"Scheduler running for current window_start: {current_window_start}")
    source_ids = get_all_source_ids() # Aktif cihazların source_id'leri
    if not source_ids:
        logger.info("No source_ids found to process for replay meta.")
        return

    for source_id in source_ids:
        try:
            logger.info(f"Computing replay meta for source_id: {source_id}, window: {current_window_start}")
            compute_replay_meta(source_id, current_window_start)
        except Exception as e:
            logger.error(f"Error computing replay meta for {source_id} at {current_window_start}: {e}", exc_info=True)
    logger.info(f"Replay meta computation complete for window_start: {current_window_start}")
    # Ek olarak, bir önceki saatin meta verisinin "son halini" garantilemek için
    # saat başlarında (örn: XX:01:00) bir önceki saat için de bir hesaplama tetiklenebilir.
    # Ama sürekli güncelleme genellikle yeterli olacaktır.

# Uygulama başlangıcında meta verilerini bir kez yenileme fonksiyonu
def initial_replay_meta_update():
    logger.info("Performing initial replay meta update...")
    now = datetime.utcnow()
    # Mevcut saat diliminin başını al
    window_start = now.replace(minute=0, second=0, microsecond=0)
    source_ids = get_all_source_ids()
    if not source_ids:
        logger.info("No source_ids found for initial replay meta update.")
        return

    for source_id in source_ids:
        try:
            logger.info(f"Initial compute replay meta for source_id: {source_id}, window: {window_start}")
            compute_replay_meta(source_id, window_start)
        except Exception as e:
            logger.error(f"Error in initial replay meta for {source_id} at {window_start}: {e}", exc_info=True)
    logger.info("Initial replay meta update complete.")