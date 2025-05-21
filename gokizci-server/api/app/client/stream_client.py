"""api/app/client/stream_client.py"""

import cv2
import socketio
from datetime import datetime, timezone
import base64
import numpy as np
import logging
import time

# Logging yapılandırması
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VideoStreamClient:
    def __init__(self, source_id, server_url='http://127.0.0.1:5000', batch_size=5):
        self.source_id = source_id
        self.server_url = server_url
        self.frame_sequence_number = 0 # Frame sıra numarası
        self.stream_start_time = 0 # Akışın başladığı zaman (göreceli timestamp için)
        self.sio = socketio.Client()
        self.cap = None
        self.is_running = False
        self.fps = 0
        self.frame_time = 0

        self.batch_size = batch_size
        self.frame_batch = []

        self.sio.on('connect', self.on_connect)
        self.sio.on('disconnect', self.on_disconnect)
        self.sio.on('status', self.on_status)

    def on_connect(self):
        logger.info(f"Connected to server with ID: {self.sio.sid}")
        self.sio.emit('join', {'source_id': self.source_id})
        self.stream_start_time = datetime.now(timezone.utc).timestamp() # Akış başladığında zamanı kaydet
        self.frame_sequence_number = 0 # Bağlantı kurulduğunda sıra numarasını sıfırla


    def on_disconnect(self):
        logger.info("Disconnected from server")
        self.stop()

    def on_status(self, data):
        logger.info(f"Status update: {data}")
        
        
    def send_batch_if_ready(self):
        if len(self.frame_batch) >= self.batch_size:
            if self.sio.connected:
                # logger.info(f"Emitting batch of {len(self.frame_batch)} frames for {self.source_id}")
                logger.info(f"Emitting batch of {len(self.frame_batch)} frames for {self.source_id}")

                self.sio.emit('video_frame_batch', { # Yeni event adı
                    'source_id': self.source_id,
                    'frames': list(self.frame_batch) # Batch'in bir kopyasını gönder
                })
                self.frame_batch.clear() # Batch'i temizle
            else:
                logger.warning("Socket not connected, cannot send batch. Clearing batch.")
                self.frame_batch.clear()

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
            self.frame_batch.clear() # Akış başlarken batch'i temizle

            while self.is_running and self.cap.isOpened():
                loop_start_time = datetime.now(timezone.utc).timestamp()

                ret, frame = self.cap.read()
                if not ret:
                    logger.info("End of video reached. Resetting to beginning.")
                    self.send_batch_if_ready()
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                # Frame işleme zamanını yakala (yaklaşık)
                # Daha kesin bir timestamp için frame'in video kaynağından alındığı an kullanılabilir (mümkünse)
                current_client_timestamp_abs = datetime.now(timezone.utc).timestamp()
                current_client_timestamp_rel = int((current_client_timestamp_abs - self.stream_start_time) * 1000) # Milisaniye cinsinden göreceli
                
                
                frame = cv2.resize(frame, (640, 480))
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                self.frame_sequence_number += 1

                payload = {
                    'frame_b64': frame_base64,
                    'sequence': self.frame_sequence_number,
                    'client_timestamp_abs': current_client_timestamp_abs, # Mutlak Unix zaman damgası
                    'client_timestamp_rel': current_client_timestamp_rel   # Akış başlangıcına göre milisaniye
                }
                self.frame_batch.append(payload)
                self.send_batch_if_ready()

                processing_time = datetime.now(timezone.utc).timestamp() - loop_start_time
                sleep_duration = self.frame_time - processing_time
                if sleep_duration > 0:
                    time.sleep(sleep_duration)
                # else:
                #     logger.warning(f"Processing time ({processing_time:.4f}s) exceeded frame time ({self.frame_time:.4f}s). No sleep.")
        except socketio.exceptions.ConnectionError as e:
            logger.error(f"Socket.IO ConnectionError: {e}. Server might be down or unreachable.")
        except Exception as e:
            logger.error(f"Error in video stream: {e}")
        finally:
            if self.is_running and len(self.frame_batch) > 0: # Durdurulurken kalan frame'ler varsa gönder
                logger.info(f"Sending remaining {len(self.frame_batch)} frames before stopping.")
                self.send_batch_if_ready() # Bu aslında tüm batch'i göndermeyebilir, batch_size kontrolü var.
                                          # Doğrudan self.sio.emit ile kalanları göndermek daha iyi olabilir.
                                          # Veya send_batch_if_ready'yi buna göre modifiye et.
            self.stop()

    def stop(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
        if self.sio.connected:
            self.sio.disconnect()
