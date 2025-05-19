from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from models.video_segment import VideoSegment

replay_bp = Blueprint('replay', __name__)

@replay_bp.route('/api/replay/<string:source_id>/segments', methods=['GET'])
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
        start_time = datetime.fromisoformat(start_iso) if start_iso else one_hour_ago
        end_time   = datetime.fromisoformat(end_iso)   if end_iso   else now
    except ValueError:
        return jsonify({ "error": "Invalid start/end format" }), 400

    segments = (
        VideoSegment.objects(
            source_id=source_id,
            timestamp__gte=start_time,
            timestamp__lte=end_time
        )
        .order_by('timestamp')
        .only('timestamp', 'anomaly_detected', 'confidence')
    )

    return jsonify({
        "segments": [
            {
                "timestamp": seg.timestamp.isoformat(),
                "anomaly": seg.anomaly_detected,
                "confidence": seg.confidence
            }
            for seg in segments
        ]
    }), 200
