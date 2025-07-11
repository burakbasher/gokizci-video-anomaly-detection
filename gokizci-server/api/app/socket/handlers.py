"""api/app/socket/handlers.py"""

from flask import request
from flask_socketio import emit, join_room, leave_room
from datetime import datetime
from app.extensions import socketio
from models.device import Device
from app.extensions import pool, _process_single_frame_from_batch
import logging

sid_to_source = {}

logger = logging.getLogger(__name__)

@socketio.on('connect')
def handle_connect():
    try:
        print(f"Client connected: {request.sid}")
        if request.sid:
                # Eşleştirmeyi tut
            sid_to_source[request.sid] = request.sid
            join_room(request.sid)
            emit('status', {'status': 'connected', 'room': request.sid}, room=request.sid)
            print(f"[SERVER] ✅ connect from SID={request.sid}, namespace={request.namespace}")

    except Exception as e:
        print(f"Error in connect handler: {e}")

@socketio.on('disconnect')
def handle_disconnect():
    try:
        print(f"Client disconnected: {request.sid}")
        source_id = sid_to_source.pop(request.sid, None)
        if source_id:
            # Odayı terket
            leave_room(source_id)
            # Cihazı offline olarak işaretle
            device = Device.objects(source_id=source_id).first()
            if device:
                device.status = 'offline'
                device.last_seen = datetime.utcnow()
                device.save()
                # İlgili odadaki (başka client'lar varsa) herkese bilgi yolla
                emit('status', {'status': 'offline'}, room=source_id) 
    except Exception as e:
        print(f"Error in disconnect handler: {e}")

@socketio.on('join')
def handle_join(data):
    try:
        source_id = data.get('source_id')
        if source_id:
            join_room(source_id)
            print(f"Client {request.sid} joined room {source_id}")
            emit('status', {'status': 'connected', 'room': source_id})
    except Exception as e:
        print(f"Error in join handler: {e}")


"""
@socketio.on('video_frame')
def handle_video_frame(frame_payload: dict):
    """"""
    Ana sunucu hiçbir CPU-yoğun iş yapmıyor, sadece delege ediyor.
    """"""
    try:
        source_id = frame_payload.get('source_id')
        frame_data = frame_payload.get('frame')
        if not source_id or not frame_data:
            logger.warning(f"Received video_frame without source_id in payload. SID: {request.sid}. Payload keys: {list(frame_payload.keys())}")
            emit('error', {'message': 'Missing source_id or frame data'}, room=request.sid)
            return
        

        # Direkt bir worker'a delege et
        # pool: eventlet.GreenPool(size=WORKER_COUNT)  
        pool.spawn_n(_process_frame_job, source_id, frame_payload)

        logger.info(f"[SERVER] enqueueing frame for {source_id}")
    except AttributeError as ae: # Örneğin frame_payload dict değilse
        logger.error(f"Error in video_frame handler (AttributeError - possibly not a dict?): {ae}. Received data: {type(frame_payload)}", exc_info=True)
        emit('error', {'message': f'Invalid frame payload format: {ae}'}, room=request.sid)
    except Exception as e:
        # Hata olursa yalnızca ilgili client'a bilgi gönderelim
        logger.error(f"Error in video_frame handler for source_id '{frame_payload.get('source_id', 'N/A')}': {e}", exc_info=True)
        emit('error', {'message': f'Video frame işleme hatası: {e}'}, room=request.sid)
        logger.error(f"Error in video_frame handler: {e}")
"""

@socketio.on('video_frame_batch')
def handle_video_frame_batch(batch_payload: dict):
    source_id = batch_payload.get('source_id')
    frames_in_batch = batch_payload.get('frames')

    if not source_id or not isinstance(frames_in_batch, list) or not frames_in_batch:
        logger.warning(f"Invalid batch payload received for SID {request.sid}")
        return

    logger.info(f"[HANDLER] Received batch of {len(frames_in_batch)} frames for source_id: {source_id} from SID: {request.sid}")
    
    # Batch içindeki frame'leri istemci zaman damgasına göre sırala (isteğe bağlı ama önerilir)
    # Bu, ağda veya istemci tarafındaki buffer'lamada oluşabilecek küçük sıra kaymalarını düzeltir.
    try:
        sorted_frames = sorted(frames_in_batch, key=lambda f: f.get('client_timestamp_abs', 0))
    except TypeError: # Eğer client_timestamp_abs yoksa veya None ise
        logger.error(f"Cannot sort frames in batch for {source_id} due to missing/invalid 'client_timestamp_abs'. Processing as received.")
        sorted_frames = frames_in_batch # Sıralama yapmadan devam et


    for frame_index, frame_data in enumerate(sorted_frames):
        # Log: Batch içindeki bir frame işlenmek üzere pool'a gönderiliyor
        client_seq = frame_data.get('sequence', 'N/A')
        logger.debug(f"[HANDLER] Spawning job for frame {frame_index + 1}/{len(sorted_frames)} from batch. Source: {source_id}, ClientSeq: {client_seq}")
        pool.spawn_n(_process_single_frame_from_batch, source_id, frame_data)


@socketio.on('device_connect')
def handle_device_connect(data):
    """
    Cihazın çevrimiçi durumunu güncelliyoruz.
    Artık senkron queue/worker kodu yok.
    """
    try:
        source_id = data.get('source_id')
        if not source_id:
            emit('error', {'message': 'device_connect: source_id eksik'}, room=request.sid)
            return

        join_room(source_id)
        print(f"Device {source_id} connected to room")

        # Cihaz durumunu veritabanında işaretle
        device = Device.objects(source_id=source_id).first()
        if device:
            device.status = 'online'
            device.last_seen = datetime.utcnow()
            device.save()
            emit('status', {'status': 'online'}, room=source_id)

    except Exception as e:
        emit('error', {'message': f'device_connect hatası: {e}'}, room=request.sid)
        print(f"Error in device_connect handler: {e}")

@socketio.on('device_command')
def handle_device_command(data):
    try:
        device_id = data.get('device_id')
        command = data.get('command')
        params = data.get('params', {})

        if not device_id or not command:
            emit('error', {'message': 'Device ID ve command gerekli'}, room=request.sid)
            return

        room = f"device_{device_id}"
        emit('execute_command', {'command': command, 'params': params}, room=room)

    except Exception as e:
        emit('error', {'message': f'device_command hatası: {e}'}, room=request.sid)
        print(f"Error in device_command handler: {e}")

@socketio.on('device_data')
def handle_device_data(data):
    try:
        device_id = data.get('device_id')
        data_type = data.get('type')
        payload = data.get('payload')

        if not device_id or not data_type:
            emit('error', {'message': 'Device ID ve data type gerekli'}, room=request.sid)
            return

        # Örnek: status güncellemesi
        if data_type == 'status':
            device = Device.objects(source_id=device_id).first()
            if device:
                device.status = payload.get('status', device.status)
                device.save()

        room = f"device_{device_id}"
        emit('device_data_update', {
            'device_id': device_id,
            'type': data_type,
            'payload': payload
        }, room=room)

    except Exception as e:
        emit('error', {'message': f'device_data hatası: {e}'}, room=request.sid)
        print(f"Error in device_data handler: {e}")


