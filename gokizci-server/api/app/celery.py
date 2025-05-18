# api/app/celery.py

from celery import Celery
from kombu import Exchange, Queue

def make_celery(app_name: str = "app"):
    celery = Celery(
        app_name,
        broker='redis://127.0.0.1:6379/0',
        backend='redis://127.0.0.1:6379/1',
        include=['app.tasks']
    )

    # Default “web” queue for non-video tasks
    celery.conf.task_default_queue    = 'web'
    celery.conf.task_default_exchange = 'web'
    celery.conf.task_default_routing_key = 'web'

    # Define both web & video queues
    celery.conf.task_queues = (
        Queue('web',   Exchange('web'),   routing_key='web'),
        Queue('video', Exchange('video'), routing_key='video'),
    )

    # Route only the frame‐processing task to “video”
    celery.conf.task_routes = {
        'app.tasks.process_frame_task': {
            'queue': 'video',
            'routing_key': 'video'
        }
    }

    celery.conf.update(
        task_serializer='json',
        result_serializer='json',
        accept_content=['json'],
        timezone='UTC',
        enable_utc=True,
        worker_prefetch_multiplier=1,
        task_acks_late=True,
    )

    return celery
