"""api/app/__init__.py"""

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from mongoengine import connect
from app.extensions import socketio
from app.settings import Config

jwt = JWTManager()

def create_app():
    flask_app = Flask(__name__)
    flask_app.config.from_object(Config)

    # MongoDB bağlantısı
    connect(
        db=flask_app.config['MONGODB_DB'],
        host=flask_app.config['MONGODB_HOST']
    )

    # JWT ve SocketIO başlat
    jwt.init_app(flask_app)
    socketio.init_app(flask_app)

    import app.socket.handlers

    # CORS
    CORS(flask_app)

    # Blueprint'leri kaydet
    from app.auth.routes import auth_bp
    from app.devices.routes import device_bp
    from app.users.routes import user_bp
    flask_app.register_blueprint(auth_bp, url_prefix='/api/auth')
    flask_app.register_blueprint(device_bp, url_prefix='/api/devices')
    flask_app.register_blueprint(user_bp, url_prefix='/api/users')
    
    return flask_app
