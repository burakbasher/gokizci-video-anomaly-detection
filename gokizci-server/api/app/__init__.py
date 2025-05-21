"""api/app/__init__.py"""

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from mongoengine import connect
from app.extensions import socketio
from app.settings import Config
from app.replay.routes import replay_bp
from apscheduler.schedulers.background import BackgroundScheduler
from app.replay.scheduler import initial_replay_meta_update, scheduled_replay_meta_job


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
    import app.socket.replay_handlers
    # CORS
    CORS(flask_app)

    # Scheduler'ı başlat
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(scheduled_replay_meta_job, 'interval', seconds=300)
    scheduler.start()
    flask_app.logger.info("APScheduler started for replay_meta jobs.")
    
    # Uygulama ilk kez ayağa kalktığında meta verilerini güncelle
    # Bunu bir app context'i içinde yapmak daha güvenli olabilir
    # eğer DB bağlantısı gibi app'e özgü kaynaklara erişiyorsa
    with flask_app.app_context():
        initial_replay_meta_update()

    # Uygulama kapanırken scheduler'ı düzgünce kapat
    import atexit
    atexit.register(lambda: scheduler.shutdown())

    # Blueprint'leri kaydet
    from app.auth.routes import auth_bp
    from app.devices.routes import device_bp
    from app.users.routes import user_bp
    from app.replay.routes import replay_bp
    flask_app.register_blueprint(auth_bp, url_prefix='/api/auth')
    flask_app.register_blueprint(device_bp, url_prefix='/api/devices')
    flask_app.register_blueprint(user_bp, url_prefix='/api/users')
    flask_app.register_blueprint(replay_bp, url_prefix='/api/replay')
    
    
    
    return flask_app
