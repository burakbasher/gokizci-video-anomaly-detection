from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
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
        data = request.get_json()
        required_fields = ['username', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field): 
                return jsonify({'error': f'Missing required field: {field}'}), 400

        if User.find_by_email(data['email']):
            return jsonify({'error': 'Email already registered'}), 400

        user = User(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=data['role']
        )

        user.validate()  # raise ValidationError if something missing or invalid

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

        user.validate()
        user.save()

        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500