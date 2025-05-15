"\api\app\devices\routes.py"

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from models.device import Device
from models.video_segment import VideoSegment
import uuid

device_bp = Blueprint('devices', __name__)

@device_bp.route('', methods=['GET'])
@jwt_required()
def get_devices():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
    except ValueError:
        page, limit = 1, 10
    skip = (page - 1) * limit

    total = Device.objects.count()
    devices = Device.objects.skip(skip).limit(limit)

    return jsonify({
        'devices': [device.to_dict() for device in devices],
        'total': total
    })

@device_bp.route('/<device_id>/segments', methods=['GET'])
@jwt_required()
def get_device_segments(device_id):
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    segments = VideoSegment.objects(
        source_id=device_id,
        timestamp__gte=one_hour_ago
    ).order_by('-timestamp')

    return jsonify({
        'segments': [segment.to_dict() for segment in segments]
    })

@device_bp.route('', methods=['POST'])
def create_device():
    try:
        data = request.get_json()
        required_fields = ['name', 'type', 'stream_url']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        device_id = str(uuid.uuid4())
        new_device = Device(
            name=data['name'],
            source_id=device_id,
            type=data['type'],
            stream_url=data['stream_url'],
            status='offline'
        )
        new_device.save()

        return jsonify({
            'message': 'Device created successfully',
            'device': new_device.to_dict()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_bp.route('/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    try:
        device = Device.objects(source_id=device_id).first()
        if not device:
            return jsonify({'error': 'Device not found'}), 404

        device.delete()
        return jsonify({'message': 'Device deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
