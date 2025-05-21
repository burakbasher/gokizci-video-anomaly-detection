"""api/app/replay/routes.py"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from models.video_segment import VideoSegment
from models.replay_meta import ReplayMeta
import urllib.parse

replay_bp = Blueprint('replay', __name__)

@replay_bp.route('/<string:source_id>/segments', methods=['GET'])
@jwt_required()
def get_replay_segments(source_id):
    """
    Son 1 saate ait segment metadata'sını (timestamp, anomaly, confidence) döner.
    Opsiyonel query params:
      - start: ISO timestamp (e.g. 2025-05-19T10:00:00Z)
      - end:   ISO timestamp
    """
    # parametreleri al
    start_iso = request.args.get('start')
    end_iso   = request.args.get('end')
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)

    try:
        # URL decode ve timestamp parse
        if start_iso:
            start_iso = urllib.parse.unquote(start_iso)
            start_time = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
        else:
            start_time = one_hour_ago

        if end_iso:
            end_iso = urllib.parse.unquote(end_iso)
            end_time = datetime.fromisoformat(end_iso.replace('Z', '+00:00'))
        else:
            end_time = now

    except ValueError as e:
        return jsonify({ "error": f"Invalid timestamp format: {str(e)}" }), 400

    try:
        segments = (
            VideoSegment.objects(
                source_id=source_id,
                timestamp__gte=start_time,
                timestamp__lte=end_time
            )
            .order_by('timestamp')
            .only('timestamp', 'anomaly_detected', 'confidence', 'frame_data')
        )

        return jsonify({
            "segments": [
                {
                    "timestamp": seg.timestamp.isoformat(),
                    "anomaly": seg.anomaly_detected,
                    "confidence": seg.confidence,
                    "frame": seg.frame_data.decode('utf-8') if seg.frame_data else None
                }
                for seg in segments
            ]
        }), 200

    except Exception as e:
        return jsonify({ "error": f"Database error: {str(e)}" }), 500

@replay_bp.route('/<string:source_id>/meta', methods=['GET'])
@jwt_required()
def get_replay_meta(source_id):
    """
    Son 1 saatlik pencere için anomaly ve doluluk bitlerini döner.
    Query param: window_start (ör: 2025-05-19T12:00:00)
    """
    window_start_iso = request.args.get('window_start')
    if not window_start_iso:
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        window_start = now
    else:
        window_start = datetime.fromisoformat(window_start_iso.replace('Z', '+00:00'))

    meta = ReplayMeta.objects(source_id=source_id, window_start=window_start).first()
    if not meta:
        return jsonify({"error": "No meta found"}), 404

    return jsonify({
        "minute_anomaly_bits": list(meta.minute_anomaly_bits),
        "second_filled_bits": list(meta.second_filled_bits),
        "window_start": meta.window_start.isoformat()
    })
