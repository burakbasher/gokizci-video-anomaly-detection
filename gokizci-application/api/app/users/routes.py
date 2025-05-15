"\api\app\users\routes.py"

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from bson import ObjectId
from models.user import User

user_bp = Blueprint('users', __name__)

@user_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 6))
        skip = (page - 1) * limit

        total = User.objects.count()
        users = User.objects.skip(skip).limit(limit)

        return jsonify({
            'users': [user.to_dict() for user in users],
            'total': total
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('', methods=['POST'])
@jwt_required()
def add_user():
    try:
        current = get_jwt_identity()
        me = User.find_by_id(ObjectId(current))
        if not me.role == "admin":
            return jsonify({'error': 'Admin privileges required'}), 403

        data = request.get_json() or {}
        required = ['username', 'email', 'password', 'role']
        for f in required:
            if not data.get(f):
                return jsonify({'error': f'Missing required field: {f}'}), 400

        if User.find_by_email(data['email']):
            return jsonify({'error': 'Email already registered'}), 400

        user = User(
            username           = data['username'],
            email              = data['email'],
            password           = data['password'],
            role               = data['role'],
            sms_notification   = bool(data.get('sms_notification', False)),
            email_notification = bool(data.get('email_notification', False)),
            profile_completion = int(data.get('profile_completion', 100))
        )
        user.validate()
        user.save()

        return jsonify({
            'message': 'User added successfully',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@user_bp.route('/<user_id>', methods=['PUT'])
@jwt_required()
def edit_user(user_id):
    try:
        current = get_jwt_identity()
        me = User.find_by_id(ObjectId(current))
        if not me.role == "admin":
            return jsonify({'error': 'Admin privileges required'}), 403

        
        user = User.find_by_id(ObjectId(user_id))
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Güncellenebilir alanlar
        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            user.email = data['email']
        if 'password' in data:
            user.password = data['password']
        if 'role' in data:
            user.role = data['role']
        if 'sms_notification' in data:
            user.sms_notification = bool(data['sms_notification'])
        if 'email_notification' in data:
            user.email_notification = bool(data['email_notification'])

        user.validate()
        user.save()

        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@user_bp.route('/me', methods=['PUT'])
@jwt_required()
def edit_self():
    try:
        current = get_jwt_identity()
        user = User.find_by_id(ObjectId(current))
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Kullanıcı sadece kendi temel bilgilerini değiştirebilir
        for fld in ('username', 'email', 'password'):
            if fld in data:
                setattr(user, fld, data[fld])

        if 'sms_notification' in data:
            user.sms_notification = bool(data['sms_notification'])
        if 'email_notification' in data:
            user.email_notification = bool(data['email_notification'])
        # Profil tamamlama kullanıcı kendisi ayarlamasın; admin POST/PUT metotunda yapılıyor

        user.validate()
        user.save()

        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@user_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        # Sadece admin silebilir
        current = get_jwt_identity()
        me = User.find_by_id(ObjectId(current))
        if not me or me.role != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403

        user = User.find_by_id(ObjectId(user_id))
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.delete()
        return jsonify({'message': 'User deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500