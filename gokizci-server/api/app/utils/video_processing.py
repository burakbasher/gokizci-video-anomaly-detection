import cv2
import numpy as np
import base64
from datetime import datetime

VIDEO_QUALITY = 85  # JPEG kalite ayarı

def process_video_frame(source_id, frame_data):
    """
    Base64 ile gelen video karesini optimize edip yeniden base64'e çevirir.
    """
    try:
        # Base64'ten çöz
        frame_bytes = base64.b64decode(frame_data)
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            print(f"[{source_id}] Frame decode error.")
            return None

        # Görüntü kalitesini ayarlayarak yeniden kodla
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), VIDEO_QUALITY]
        _, buffer = cv2.imencode('.jpg', frame, encode_param)

        # Base64 formatına geri çevir
        encoded_frame = base64.b64encode(buffer).decode('utf-8')

        return {
            'frame': encoded_frame,
            'timestamp': datetime.utcnow().isoformat()
        }

    except Exception as e:
        print(f"[{source_id}] Frame processing error: {e}")
        return None
