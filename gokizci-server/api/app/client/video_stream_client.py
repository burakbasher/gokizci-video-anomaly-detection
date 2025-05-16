"""api/app/client/video_stream_client.py"""

import os
import argparse
import logging
from .stream_client import VideoStreamClient
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description='Simulate a device source using test_video.mp4')
    parser.add_argument('--source-id', required=True, help='Unique source ID for the device')
    parser.add_argument('--server', default='http://localhost:5000', help='Server URL')

    args = parser.parse_args()

    # Get the absolute path to test_video.mp4
    current_dir = os.path.dirname(os.path.abspath(__file__))
    video_path = os.path.join(current_dir, '..', 'test_video.mp4')
    video_path = os.path.abspath(video_path)  # Normalize path

    if not os.path.exists(video_path):
        logger.error(f"Error: test_video.mp4 not found at {video_path}")
        return

    logger.info(f"Starting video stream simulation with source ID: {args.source_id}")
    logger.info(f"Using video file: {video_path}")
    logger.info(f"Server URL: {args.server}")

    client = VideoStreamClient(
        source_id=args.source_id,
        server_url=args.server
    )

    try:
        logger.info("Starting video stream...")
        client.start(video_path)
    except KeyboardInterrupt:
        logger.info("\nShutting down simulation...")
        client.stop()
    except Exception as e:
        logger.error(f"Error during simulation: {e}")
        client.stop()

if __name__ == "__main__":
    main()
