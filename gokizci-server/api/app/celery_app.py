# api/app/celery_app.py

from celery import Celery
from kombu import Exchange, Queue
from mongoengine import connect
from app.settings import Config

# 1) Flask uygulamasını oluştur
connect(
    db=Config.MONGODB_DB,
    host=Config.MONGODB_HOST
)

import celery.app.trace

_orig_fast = celery.app.trace.fast_trace_task
def safe_fast_trace_task(*args, **kwargs):
    try:
        return _orig_fast(*args, **kwargs)
    except ValueError:
        # eksik header gelse bile patlatma
        return (None, None, None)
    
celery.app.trace.fast_trace_task = safe_fast_trace_task

# 2) Celery örneğini yarat ve ayarlarını yapılandır
celery = Celery(
    'app',
    broker='redis://127.0.0.1:6379/0',
    backend='redis://127.0.0.1:6379/1',
    include=['app.tasks'],
)

# 3) Kuyruk ayarları
celery.conf.task_default_queue = 'web'
celery.conf.task_default_exchange = 'web'
celery.conf.task_default_routing_key = 'web'

celery.conf.task_queues = (
    Queue('web', Exchange('web'), routing_key='web'),
    Queue('video', Exchange('video'), routing_key='video'),
)

celery.conf.task_routes = {
    'app.tasks.process_frame_task': {
        'queue': 'video',
        'routing_key': 'video'
    }
}

# 4) Diğer temel Celery ayarları
celery.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
    worker_send_task_events=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


