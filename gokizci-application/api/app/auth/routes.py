from datetime import datetime
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import create_access_token, get_csrf_token, jwt_required, get_jwt_identity
from bson import ObjectId
from models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200

    try:    
        data = request.get_json() or {}
        # Zorunlu alanlar
        for field in ('username', 'email', 'password'):
            if not data.get(field):
                return jsonify({'error': f'Missing field: {field}'}), 400

        # Aynı email yoksa devam
        if User.find_by_email(data['email']):
            return jsonify({'error': 'Email already registered'}), 400

        # Yeni alanlar default False
        sms_notif = bool(data.get('sms_notification', False))
        email_notif = bool(data.get('email_notification', False))

        user = User(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            sms_notification=sms_notif,
            email_notification=email_notif
        )
        user.save()

        access_token = create_access_token(identity=str(user.id))
        response = make_response(jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }))
        response.set_cookie(
            'access_token', access_token,
            httponly=True, secure=False, samesite='Lax',
            max_age=86400, path='/'
        )
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()
        user = User.find_by_email(data['email'])

        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401

        access_token = create_access_token(identity=str(user.id))
        csrf_token = get_csrf_token(access_token)

        response = make_response(jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        }))
        response.set_cookie('access_token', access_token,
                            httponly=True, secure=False, samesite='Lax',
                            max_age=86400, path='/')
        response.set_cookie('csrf_access_token', csrf_token,
                            httponly=True, secure=False, samesite='Lax',
                            max_age=3600, path='/')
        response.headers['X-CSRF-Token'] = csrf_token
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_user():
    current = get_jwt_identity()
    if not current:
        return jsonify({'user': None}), 200

    user = User.find_by_id(ObjectId(current))
    if not user:
        return jsonify({'user': None}), 200

    return jsonify({'user': user.to_dict()}),200

@auth_bp.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    if request.method == 'OPTIONS':
        return '', 200
    response = make_response(jsonify({'message': 'Logout successful'}))
    response.delete_cookie('access_token', path='/')
    return response

@auth_bp.route('/changePassword', methods=['POST', 'OPTIONS'])
@jwt_required()
def change_password():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        old_password = data.get('oldPassword')
        new_password = data.get('newPassword')

        if not all([old_password, new_password]):
            return jsonify({'error': 'Missing required fields'}), 400

        user = User.find_by_id(ObjectId(current_user_id))
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.check_password(old_password):
            return jsonify({'error': 'Current password is incorrect'}), 400

        user.password = new_password
        user.last_password_change = datetime.now()
        user.save()

        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/csrf-token', methods=['GET'])
def get_csrf_token_route():
    try:
        temp_token = create_access_token(identity='temp')
        csrf_token = get_csrf_token(temp_token)

        response = make_response(jsonify({
            'csrf_token': csrf_token,
            'message': 'CSRF token generated successfully'
        }))
        response.set_cookie('csrf_access_token', csrf_token,
                            httponly=True, secure=False, samesite='Lax',
                            max_age=3600, path='/')
        response.headers['X-CSRF-Token'] = csrf_token
        return response
    except Exception as e:
        return jsonify({'error': 'Failed to generate CSRF token'}), 500
