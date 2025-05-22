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
    window_start_iso = request.args.get('window_start')
    if not window_start_iso:
        # Eğer window_start gelmezse, içinde bulunulan saatin metasını dön (veya hata ver)
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        window_start = now
    else:
        try:
            window_start = datetime.fromisoformat(window_start_iso.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid window_start format"}), 400

    meta = ReplayMeta.objects(source_id=source_id, window_start=window_start).first()

    if not meta:
        # Kayıt bulunamazsa, tüm bitleri 0 olan bir varsayılan meta döndür
        # Bu, frontend'in her zaman bir meta objesi almasını sağlar.
        minute_anomaly_bits_default = [0] * 60 # Backend byte[] gönderiyorsa ona göre ayarla
        second_filled_bits_default = [0] * 3600 # Backend byte[] gönderiyorsa ona göre ayarla
        # Eğer backend byte[] gönderiyorsa:
        # minute_anomaly_bits_default_bytes = b'\x00' * 8
        # second_filled_bits_default_bytes = b'\x00' * 450

        return jsonify({
            "minute_anomaly_bits": minute_anomaly_bits_default,
            "second_filled_bits": second_filled_bits_default,
            "window_start": window_start.isoformat() # İstenen pencerenin başlangıcını yine de dön
        }), 200 # 200 OK ama içerik "boş" olduğunu belirtiyor

    def bytes_to_bit_list(byte_data, expected_length):
        if not byte_data:
            return [0] * expected_length
        
        # byte_data'yı (örneğin b'\x01\x80') bir tam sayıya çevir
        # int.from_bytes(byte_data, 'big') -> örneğin 0b0000000110000000
        # sonra bunu '0b' prefix'i olmadan binary string'e çevir: bin(...)[2:]
        # ve expected_length kadar sola sıfırla doldur: .zfill(expected_length)
        # sonra her karakteri int'e çevirerek listeye al: [int(bit) for bit in bit_string]
        
        bit_string = bin(int.from_bytes(byte_data, 'big'))[2:].zfill(expected_length)
        return [int(bit) for bit in bit_string]

    minute_anomaly_list = bytes_to_bit_list(meta.minute_anomaly_bits, 60)
    second_filled_list = bytes_to_bit_list(meta.second_filled_bits, 3600)

    return jsonify({
        "minute_anomaly_bits": minute_anomaly_list,
        "second_filled_bits": second_filled_list,
        "window_start": meta.window_start.isoformat()
    })



@replay_bp.route('/<string:source_id>/meta/available_windows', methods=['GET'])
@jwt_required()
def get_available_replay_windows(source_id):
    try:
        # Sadece window_start alanını al ve benzersiz olanları listele, en yeniden eskiye doğru sırala
        # Son 24 saate ait pencereleri getirmek gibi bir filtreleme de eklenebilir.
        # Örneğin, son 1 gün içindeki mevcut meta pencereleri:
        # one_day_ago = datetime.utcnow() - timedelta(days=1)
        # distinct_windows = ReplayMeta.objects(
        #     source_id=source_id,
        #     window_start__gte=one_day_ago
        # ).distinct('window_start')

        # Veya tüm mevcut pencereler:
        distinct_windows = ReplayMeta.objects(source_id=source_id).distinct('window_start')
        
        # Tarihleri ISO formatında string listesine çevir
        # ve en yeniden eskiye doğru sırala (distinct sıralamayı garanti etmeyebilir)
        sorted_windows = sorted([dt.isoformat() for dt in distinct_windows], reverse=True)

        return jsonify({"available_windows": sorted_windows}), 200
    except Exception as e:
        logger.error(f"Error fetching available windows for {source_id}: {e}", exc_info=True)
        return jsonify({"error": "Could not fetch available replay windows"}), 500

