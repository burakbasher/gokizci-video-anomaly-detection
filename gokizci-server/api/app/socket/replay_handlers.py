"""api/app/socket/replay_handlers.py"""

from flask import request
from flask_socketio import emit
from datetime import datetime, timedelta
from app.extensions import socketio
from models.video_segment import VideoSegment
import logging
import eventlet
from bson.binary import Binary

replay_flags = {}

logger = logging.getLogger(__name__)

@socketio.on('start_replay')
def handle_start_replay(data):
    source_id = data.get('source_id')
    fps = data.get('fps', 10)
    delay = 1.0 / fps

    if not source_id:
        emit('error', {'message': 'source_id is required for replay'})
        return

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    segments = VideoSegment.objects(
        source_id=source_id,
        timestamp__gte=one_hour_ago
    ).order_by('timestamp')

    logger.info(f"[REPLAY] Starting replay for {source_id} with {len(segments)} frames")

    replay_flags[source_id] = True

    for segment in segments:
        try:
            if not replay_flags[source_id]:
                break

            frame_base64 = segment.frame_data.decode("utf-8") \
                if isinstance(segment.frame_data, Binary) else segment.frame_data

            emit('replay_frame', {
                'frame': frame_base64,
                'timestamp': segment.timestamp.isoformat(),
                'anomaly_detected': segment.anomaly_detected,
                'confidence': segment.confidence,
                'source_id': source_id
            }, room=request.sid)

            eventlet.sleep(delay)
        except Exception as e:
            logger.error(f"[REPLAY] Error during replay: {e}")
            break
        
        
@socketio.on('stop_replay')
def handle_stop_replay(data):
    source_id = data.get('source_id')
    if source_id:
        replay_flags[source_id] = False
        emit('status', {'message': f'replay for {source_id} stopped'})