"""api/app/client/stream_client.py"""

import cv2
import socketio
import time
import base64
import numpy as np
import logging

# Logging yapılandırması
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VideoStreamClient:
    def __init__(self, source_id, server_url='http://127.0.0.1:5000'):
        self.source_id = source_id
        self.server_url = server_url
        self.sio = socketio.Client()
        self.cap = None
        self.is_running = False
        self.fps = 0
        self.frame_time = 0

        self.sio.on('connect', self.on_connect)
        self.sio.on('disconnect', self.on_disconnect)
        self.sio.on('status', self.on_status)

    def on_connect(self):
        logger.info(f"Connected to server with ID: {self.sio.sid}")
        self.sio.emit('join', {'source_id': self.source_id})

    def on_disconnect(self):
        logger.info("Disconnected from server")
        self.stop()

    def on_status(self, data):
        logger.info(f"Status update: {data}")

    def start(self, video_path):
        try:
            self.cap = cv2.VideoCapture(video_path)
            if not self.cap.isOpened():
                raise Exception(f"Could not open video file: {video_path}")

            self.fps = self.cap.get(cv2.CAP_PROP_FPS)
            if self.fps <= 0:
                self.fps = 50  # Varsayılan FPS
            self.frame_time = 1.0 / self.fps
            logger.info(f"Video FPS: {self.fps}")

            self.sio.connect(self.server_url)
            self.is_running = True

            while self.is_running and self.cap.isOpened():
                start_time = time.time()

                ret, frame = self.cap.read()
                if not ret:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                frame = cv2.resize(frame, (640, 480))
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                logger.info(f"Emitting frame for {self.source_id}, size={len(frame_base64)} bytes")
                self.sio.emit('video_frame', {
                    'source_id': self.source_id,
                    'frame': frame_base64
                })

                time.sleep(max(0, self.frame_time - (time.time() - start_time)))
        except Exception as e:
            logger.error(f"Error in video stream: {e}")
        finally:
            self.stop()

    def stop(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
        if self.sio.connected:
            self.sio.disconnect()
