from flask import request
from flask_socketio import emit, join_room, leave_room
from datetime import datetime
from app import socketio
from models.device import Device
from app.utils.video_processing import process_video_frame
import threading
import queue

# Global state (geçici olarak burada tutulabilir, kalıcı depolama gerekirse ayrı çözümler gerekir)
device_rooms = {}
video_queues = {}
processing_threads = {}
FRAME_TIMEOUT_SECONDS = 10

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    for source_id, room_data in device_rooms.items():
        if request.sid in room_data['clients']:
            room_data['clients'].remove(request.sid)
            leave_room(source_id)
            print(f'Client left room: {source_id}')
            if not room_data['clients']:
                if source_id in video_queues:
                    video_queues[source_id].put(None)  # Kapatma sinyali
                    del video_queues[source_id]
                    del processing_threads[source_id]
                del device_rooms[source_id]
                update_device_status(source_id, 'offline')

@socketio.on('join')
def handle_join(data):
    source_id = data.get('source_id')
    if source_id:
        join_room(source_id)
        print(f"Client {request.sid} joined room {source_id}")
        emit('status', {'status': 'connected', 'room': source_id})

@socketio.on('video_frame')
def handle_video_frame(data):
    try:
        source_id = data.get('source_id')
        frame_data = data.get('frame')
        if not source_id or not frame_data:
            return

        result = process_video_frame(source_id, frame_data)
        if result:
            emit('processed_frame', {
                'source_id': source_id,
                'frame': result['frame'],
                'timestamp': result['timestamp']
            }, room=source_id)
    except Exception as e:
        print(f"Error in video_frame: {e}")

@socketio.on('device_connect')
def handle_device_connect(data):
    source_id = data.get('source_id')
    if not source_id:
        print("No source_id in device_connect")
        return

    if source_id not in device_rooms:
        device_rooms[source_id] = {
            'clients': set(),
            'status': 'offline',
            'last_frame': datetime.utcnow()
        }

    join_room(source_id)
    device_rooms[source_id]['clients'].add(request.sid)
    print(f"Device {source_id} connected to room")

    device = Device.objects(source_id=source_id).first()
    if device:
        update_device_status(source_id, 'online')
        if source_id not in video_queues:
            video_queues[source_id] = queue.Queue()
            thread = threading.Thread(
                target=video_processing_worker,
                args=(source_id, video_queues[source_id])
            )
            thread.daemon = True
            thread.start()
            processing_threads[source_id] = thread

@socketio.on('device_command')
def handle_device_command(data):
    device_id = data.get('device_id')
    command = data.get('command')
    params = data.get('params', {})

    if not device_id or not command:
        emit('error', {'message': 'Device ID and command are required'})
        return

    room = f'device_{device_id}'
    emit('execute_command', {
        'command': command,
        'params': params
    }, room=room)

@socketio.on('device_data')
def handle_device_data(data):
    device_id = data.get('device_id')
    data_type = data.get('type')
    payload = data.get('payload')

    if not device_id or not data_type:
        emit('error', {'message': 'Device ID and data type are required'})
        return

    if data_type == 'status':
        device = Device.objects(source_id=device_id).first()
        if device:
            device.status = payload.get('status', device.status)
            device.save()

    room = f'device_{device_id}'
    emit('device_data_update', {
        'device_id': device_id,
        'type': data_type,
        'payload': payload
    }, room=room)

# Yardımcı fonksiyonlar

def update_device_status(source_id, status):
    device = Device.objects(source_id=source_id).first()
    if device:
        device.status = status
        device.save()

def video_processing_worker(source_id, q):
    while True:
        frame_data = q.get()
        if frame_data is None:
            break
        result = process_video_frame(source_id, frame_data)
        if result:
            socketio.emit('processed_frame', {
                'source_id': source_id,
                'frame': result['frame'],
                'timestamp': result['timestamp']
            }, room=source_id)
