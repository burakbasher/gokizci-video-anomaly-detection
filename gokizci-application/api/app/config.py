"\api\app\config.py"

import os
from datetime import timedelta

class Config:
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_HTTPONLY = True
    JWT_COOKIE_SAMESITE = 'Lax'
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_ACCESS_COOKIE_NAME = 'access_token'
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_CSRF_CHECK_FORM = True
    JWT_CSRF_IN_COOKIES = True
    JWT_CSRF_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']

    # CORS
    CORS_SETTINGS = {
        "resources": {r"/*": {"origins": ["http://localhost:3000"]}},
        "supports_credentials": True,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-CSRF-Token"],
        "expose_headers": ["Content-Type", "Authorization", "X-CSRF-Token"],
        "max_age": 3600
    }

    # MongoDB
    MONGODB_DB = 'Gokizci'
    MONGODB_HOST = 'mongodb://localhost:27017'
