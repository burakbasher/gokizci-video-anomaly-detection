import cv2
import socketio
import time
import argparse
import logging
import base64
import numpy as np

# Logging ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoStreamClient:
    def __init__(self, source_id, server_url='http://localhost:5000'):
        self.source_id = source_id
        self.server_url = server_url
        self.sio = socketio.Client()
        self.cap = None
        self.is_running = False
        self.fps = 0
        self.frame_time = 0
        
        # Socket.IO event handlers
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
            # Video dosyasını aç
            self.cap = cv2.VideoCapture(video_path)
            if not self.cap.isOpened():
                raise Exception(f"Could not open video file: {video_path}")
            
            # Video FPS'ini al
            self.fps = self.cap.get(cv2.CAP_PROP_FPS)
            self.frame_time = 1.0 / self.fps
            logger.info(f"Video FPS: {self.fps}")
            
            # Socket.IO bağlantısını başlat
            self.sio.connect(self.server_url)
            self.is_running = True
            
            logger.info(f"Starting video stream for source: {self.source_id}")
            
            # Video akışını başlat
            while self.is_running and self.cap.isOpened():
                start_time = time.time()
                
                ret, frame = self.cap.read()
                if not ret:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                
                # Frame'i optimize et
                frame = cv2.resize(frame, (640, 480))  # Boyutu küçült
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
                _, buffer = cv2.imencode('.jpg', frame, encode_param)
                
                # Base64'e çevir
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                # Frame'i sunucuya gönder
                self.sio.emit('video_frame', {
                    'source_id': self.source_id,
                    'frame': frame_base64
                })
                
                # FPS kontrolü
                elapsed = time.time() - start_time
                sleep_time = max(0, self.frame_time - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)
            
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

def main():
    parser = argparse.ArgumentParser(description='Video Stream Client')
    parser.add_argument('--source-id', required=True, help='Source ID for the video stream')
    parser.add_argument('--video-path', default='test_video.mp4', help='Path to video file')
    parser.add_argument('--server-url', default='http://localhost:5000', help='Server URL')
    
    args = parser.parse_args()
    
    client = VideoStreamClient(args.source_id, args.server_url)
    try:
        client.start(args.video_path)
    except KeyboardInterrupt:
        logger.info("Stopping video stream...")
        client.stop()

if __name__ == '__main__':
    main()
