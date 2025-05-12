from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from mongoengine import connect
from flask_socketio import SocketIO
from app.config import Config

# Global SocketIO ve JWT instance'ları
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # MongoDB bağlantısı
    connect(
        db=app.config['MONGODB_DB'],
        host=app.config['MONGODB_HOST']
    )

    # JWT ve SocketIO başlat
    jwt.init_app(app)
    socketio.init_app(app)

    # CORS
    CORS(app, **Config.CORS_SETTINGS)

    # Blueprint'leri kaydet
    from app.auth.routes import auth_bp
    from app.devices.routes import device_bp
    from app.users.routes import user_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(device_bp, url_prefix='/api/devices')
    app.register_blueprint(user_bp, url_prefix='/api/users')

    # SocketIO event handler'larını yükle
    from app.socket import handlers  # event'leri tetikler

    return app
