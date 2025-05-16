"""api/index.py"""

from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    app.logger.setLevel("DEBUG")
    app.logger.debug("Flask app starting with SocketIO...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
