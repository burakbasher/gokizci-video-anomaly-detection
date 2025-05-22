# api/app/utils/video_processing.py

import cv2
import numpy as np
import base64
from datetime import datetime

VIDEO_QUALITY = 85  # JPEG kalite ayarı

def process_video_frame(source_id, frame_data):
    """
    # TODO: GPU ile çalışan AI modelini buraya entegre et
    # frame decode → inference → base64 encode
    """
    try:
        return {
            'frame': frame_data,
            'timestamp': datetime.utcnow().isoformat(),
            'anomaly_detected': True,
            'source_id': source_id,
            'confidence': 0.0

        }

    except Exception as e:
        print(f"[{source_id}] Frame processing error: {e}")
        return None
