"""api/index.py"""
import eventlet
eventlet.monkey_patch()


from app import create_app, socketio


app = create_app()

if __name__ == '__main__':
    app.logger.setLevel("DEBUG")
    app.logger.debug("Flask app starting with SocketIO...")
    socketio.run(app, debug=True, host='127.0.0.1', port=5000)
