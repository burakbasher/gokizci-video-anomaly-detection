# api/app/config.py

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
    CORS_RESOURCES = {r"/*": {"origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.100:3000",
        "http://192.168.1.101:3000",
        "http://192.168.1.102:3000",
        "http://192.168.1.103:3000",
        "http://192.168.1.104:3000",
    ]}}
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_METHODS            = ["GET","POST","PUT","DELETE","OPTIONS"]
    CORS_ALLOW_HEADERS      = ["Content-Type","Authorization","X-CSRF-Token"]
    CORS_EXPOSE_HEADERS     = ["Content-Type","Authorization","X-CSRF-Token"]
    CORS_MAX_AGE            = 3600

    # MongoDB
    MONGODB_DB = 'Gokizci'
    MONGODB_HOST = 'mongodb://127.0.0.1:27017'
