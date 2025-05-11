from flask import Flask, request, jsonify, make_response
from mongoengine import connect
from models.user import User
import bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_csrf_token
from flask_cors import CORS
from datetime import timedelta
import os
from bson import ObjectId
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
import cv2
import numpy as np
import base64
from datetime import datetime
import threading
import queue
import json
from models.device import Device
from models.video_segment import VideoSegment
import uuid
import time
from concurrent.futures import ThreadPoolExecutor
import logging

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# CORS Configuration
CORS(app,
     resources={r"/*": {
         "origins": ["http://localhost:3000"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "X-CSRF-Token"],
         "supports_credentials": True,
         "expose_headers": ["Content-Type", "Authorization", "X-CSRF-Token"],
         "max_age": 3600
     }},
     supports_credentials=True)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['JWT_COOKIE_SECURE'] = False  # Development için False, production'da True olmalı
app.config['JWT_COOKIE_HTTPONLY'] = True
app.config['JWT_COOKIE_SAMESITE'] = 'Lax'
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_COOKIE_NAME'] = 'access_token'
app.config['JWT_COOKIE_CSRF_PROTECT'] = True
app.config['JWT_CSRF_CHECK_FORM'] = True
app.config['JWT_CSRF_IN_COOKIES'] = True
app.config['JWT_CSRF_METHODS'] = ['POST', 'PUT', 'DELETE', 'PATCH']
jwt = JWTManager(app)

# MongoDB connection
connect(
    db='Gokizci',
    host='mongodb://localhost:27017'
)

# Video processing configuration
MAX_WORKERS = 4
FRAME_BUFFER_SIZE = 5
VIDEO_QUALITY = 85

# Create thread pool for video processing
video_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

# Frame buffer for each device
frame_buffers = {}

# Device status tracking
device_rooms = {}
last_frame_times = {}
FRAME_TIMEOUT_SECONDS = 10

def process_video_frame(source_id, frame_data):
    """Process video frame and return optimized frame"""
    try:
        # Decode base64 frame
        frame_bytes = base64.b64decode(frame_data)
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            print(f"Error: Failed to decode frame for source {source_id}")
            return None

        # Optimize frame for transmission
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), VIDEO_QUALITY]
        _, optimized_buffer = cv2.imencode('.jpg', frame, encode_param)
        optimized_frame = base64.b64encode(optimized_buffer).decode('utf-8')

        return {
            'frame': optimized_frame,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error processing frame: {e}")
        return None

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on('join')
def handle_join(data):
    source_id = data.get('source_id')
    if not source_id:
        return
    
    print(f"Client {request.sid} joining room: {source_id}")
    join_room(source_id)
    emit('status', {'status': 'connected', 'room': source_id})

@socketio.on('leave')
def handle_leave(data):
    source_id = data.get('source_id')
    if source_id:
        print(f"Client {request.sid} leaving room: {source_id}")
        leave_room(source_id)

@socketio.on('video_frame')
def handle_video_frame(data):
    try:
        source_id = data.get('source_id')
        frame_data = data.get('frame')
        
        if not source_id or not frame_data:
            return

        # Process frame in thread pool
        future = video_executor.submit(process_video_frame, source_id, frame_data)
        result = future.result()

        if result:
            # Update last frame time
            last_frame_times[source_id] = datetime.utcnow()

            # Send processed frame
            emit('processed_frame', {
                'source_id': source_id,
                'frame': result['frame'],
                'timestamp': result['timestamp']
            }, room=source_id)
            
    except Exception as e:
        print(f"Video frame handling error: {e}")

@app.route('/api/devices', methods=['GET'])
@jwt_required()
def get_devices():
    # Pagination parameters
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
    except ValueError:
        page = 1
        limit = 10
    skip = (page - 1) * limit

    # Query all devices
    total = Device.objects.count()
    devices = Device.objects.skip(skip).limit(limit)
    return jsonify({
        'devices': [device.to_dict() for device in devices],
        'total': total
    })

@app.route('/api/devices/<device_id>/segments', methods=['GET'])
@jwt_required()
def get_device_segments(device_id):
    # Get segments from last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    segments = VideoSegment.objects(
        source_id=device_id,
        timestamp__gte=one_hour_ago
    ).order_by('-timestamp')
    
    return jsonify({
        'segments': [segment.to_dict() for segment in segments]
    })

@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()

        if not data:
            app.logger.warning("Invalid JSON payload in register endpoint.")
            return jsonify({'error': 'Invalid JSON payload'}), 400

        app.logger.info(f"Register Payload: {data}")

        if User.find_by_email(data['email']):
            return jsonify({'error': 'Email already registered'}), 400

        user = User(
            username=data['username'],
            email=data['email'],
            password=data['password']
        )
        user.save()

        access_token = create_access_token(identity=str(user.id))

        response = make_response(jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }))
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=86400,
            path='/'
        )
        return response

    except Exception as e:
        app.logger.error(f"REGISTER ERROR: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()
        app.logger.info(f"Login Payload: {data}")
        user = User.find_by_email(data['email'])

        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Access token oluştur
        access_token = create_access_token(identity=str(user.id))
        
        # CSRF token oluştur
        csrf_token = get_csrf_token(access_token)

        response = make_response(jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        }))
        
        # Access token cookie'sini ayarla
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=86400,
            path='/'
        )
        
        # CSRF token cookie'sini ayarla
        response.set_cookie(
            'csrf_access_token',
            csrf_token,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=3600,
            path='/'
        )
        
        # CSRF token'ı header'a ekle
        response.headers['X-CSRF-Token'] = csrf_token
        
        return response

    except Exception as e:
        app.logger.error(f"LOGIN ERROR: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_user():
    if request.method == 'OPTIONS':
        return '', 200

    current_user_id = get_jwt_identity()
    app.logger.info(f"Authenticated user ID: {current_user_id}")

    user = User.find_by_id(ObjectId(current_user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': user.to_dict()})

@app.route('/api/auth/logout', methods=['POST', 'OPTIONS'])
def logout():
    if request.method == 'OPTIONS':
        return '', 200

    app.logger.info("User logged out.")
    response = make_response(jsonify({'message': 'Logout successful'}))
    response.delete_cookie('access_token', path='/')
    return response

@app.route('/api/changePassword', methods=['POST', 'OPTIONS'])
@jwt_required()
def change_password():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        # JWT'den kullanıcı ID'sini al
        current_user_id = get_jwt_identity()
        app.logger.info(f"Password change request for user: {current_user_id}")

        data = request.get_json()
        old_password = data.get('oldPassword')
        new_password = data.get('newPassword')

        if not all([old_password, new_password]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Kullanıcıyı JWT'den gelen ID ile bul
        user = User.find_by_id(ObjectId(current_user_id))
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Eski şifreyi kontrol et
        if not user.check_password(old_password):
            return jsonify({'error': 'Current password is incorrect'}), 400

        # Yeni şifreyi güncelle
        user.password = new_password
        user.save()

        app.logger.info(f"Password changed successfully for user: {current_user_id}")
        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        app.logger.error(f"PASSWORD CHANGE ERROR: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices', methods=['POST'])
def create_device():
    try:
        data = request.get_json()
        
        # Gerekli alanları kontrol et
        required_fields = ['name', 'type', 'stream_url']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Benzersiz device ID oluştur
        device_id = str(uuid.uuid4())
        
        # Yeni cihaz oluştur
        new_device = Device(
            name=data['name'],
            source_id=device_id,
            type=data['type'],
            stream_url=data['stream_url'],
            status='offline'
        )
        new_device.save()
        
        # Socket odası oluştur
        device_rooms[device_id] = {
            'status': 'offline',
            'clients': set()
        }
        
        # Cihaz bilgilerini döndür
        return jsonify({
            'message': 'Device created successfully',
            'device': new_device.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Error creating device: {str(e)}")
        return jsonify({'error': 'Failed to create device'}), 500

@app.route('/api/devices/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    try:
        # Cihazı veritabanından sil
        device = Device.objects(source_id=device_id).first()
        if not device:
            return jsonify({'error': 'Device not found'}), 404
            
        device.delete()
        
        # Socket odasını temizle
        if device_id in device_rooms:
            # Odadaki tüm istemcilere bildir
            for client in device_rooms[device_id]['clients']:
                emit('device_disconnected', {
                    'device_id': device_id,
                    'message': 'Device has been removed'
                }, room=client)
            
            # Odayı sil
            del device_rooms[device_id]
        
        return jsonify({'message': 'Device deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error deleting device: {str(e)}")
        return jsonify({'error': 'Failed to delete device'}), 500

@socketio.on('device_connect')
def handle_device_connect(data):
    """Handle device connection"""
    try:
        source_id = data.get('source_id')
        if not source_id:
            print("No source_id provided in device_connect")
            return

        # Initialize room if not exists
        if source_id not in device_rooms:
            device_rooms[source_id] = {
                'clients': set(),
                'status': 'offline',
                'last_frame': datetime.utcnow()
            }

        # Add device to room
        join_room(source_id)
        device_rooms[source_id]['clients'].add(request.sid)
        print(f'Device {source_id} connected to room')

        # Update device status
        device = Device.objects(source_id=source_id).first()
        if device:
            update_device_status(source_id, 'online')
            
            # Initialize video processing if not already started
            if source_id not in video_queues:
                video_queues[source_id] = queue.Queue()
                thread = threading.Thread(
                    target=video_processing_worker,
                    args=(source_id, video_queues[source_id])
                )
                thread.daemon = True
                thread.start()
                processing_threads[source_id] = thread
        else:
            print(f"Device {source_id} not found in database")

    except Exception as e:
        print(f"Error in device_connect: {str(e)}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    try:
        # Find all rooms the client is in
        for source_id, room_data in device_rooms.items():
            if request.sid in room_data['clients']:
                # Remove client from room
                room_data['clients'].remove(request.sid)
                leave_room(source_id)
                print(f'Client left room: {source_id}')

                # If no clients left, cleanup resources
                if not room_data['clients']:
                    if source_id in video_queues:
                        video_queues[source_id].put(None)  # Signal thread to stop
                        del video_queues[source_id]
                        del processing_threads[source_id]
                    del device_rooms[source_id]
                    update_device_status(source_id, 'offline')
    except Exception as e:
        print(f"Error in disconnect: {str(e)}")

@socketio.on('device_command')
def handle_device_command(data):
    """
    Handle device control commands
    """
    try:
        device_id = data.get('device_id')
        command = data.get('command')
        params = data.get('params', {})
        
        if not device_id or not command:
            emit('error', {'message': 'Device ID and command are required'})
            return
            
        room = f'device_{device_id}'
        if room in rooms():
            # Forward command to device
            socketio.emit('execute_command', {
                'command': command,
                'params': params
            }, room=room)
        else:
            emit('error', {'message': 'Device not connected'})
            
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('device_data')
def handle_device_data(data):
    """
    Handle device data updates (telemetry, status, etc.)
    """
    try:
        device_id = data.get('device_id')
        data_type = data.get('type')
        payload = data.get('payload')
        
        if not device_id or not data_type:
            emit('error', {'message': 'Device ID and data type are required'})
            return
            
        # Store data in database if needed
        if data_type == 'telemetry':
            # Handle telemetry data
            pass
        elif data_type == 'status':
            # Update device status
            device = Device.objects(source_id=device_id).first()
            if device:
                device.status = payload.get('status', device.status)
                device.save()
        
        # Broadcast data to all clients monitoring this device
        room = f'device_{device_id}'
        socketio.emit('device_data_update', {
            'device_id': device_id,
            'type': data_type,
            'payload': payload
        }, room=room)
        
    except Exception as e:
        emit('error', {'message': str(e)})

@app.route('/api/csrf-token', methods=['GET'])
def get_csrf_token_route():
    try:
        # Geçici bir access token oluştur
        temp_token = create_access_token(identity='temp')
        
        # Bu token için CSRF token oluştur
        csrf_token = get_csrf_token(temp_token)
        
        # Response oluştur
        response = make_response(jsonify({
            'csrf_token': csrf_token,
            'message': 'CSRF token generated successfully'
        }))
        
        # CSRF token'ı cookie olarak ayarla
        response.set_cookie(
            'csrf_access_token',
            csrf_token,
            httponly=True,
            secure=False,  # Development için False, production'da True olmalı
            samesite='Lax',
            max_age=3600,
            path='/'
        )
        
        # CSRF token'ı header'a ekle
        response.headers['X-CSRF-Token'] = csrf_token
        
        return response
    except Exception as e:
        app.logger.error(f"CSRF token generation error: {e}")
        return jsonify({'error': 'Failed to generate CSRF token'}), 500

if __name__ == '__main__':
    app.logger.setLevel("DEBUG")
    app.logger.debug("Logging system initialized.")
    socketio.run(app, debug=True, port=5000, host='0.0.0.0')
