from flask import Blueprint, jsonify, request
from services.system_shutdown_service import get_system_shutdown_service

system_bp = Blueprint('system', __name__)


def _is_local_request() -> bool:
    return request.remote_addr in {'127.0.0.1', '::1'}


@system_bp.route('/system/heartbeat', methods=['POST'])
def system_heartbeat():
    if not _is_local_request():
        return jsonify({'ok': False, 'message': 'Forbidden'}), 403

    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    if not session_id:
        return jsonify({'ok': False, 'message': 'session_id required'}), 400

    service = get_system_shutdown_service()
    service.record_heartbeat(session_id)
    return jsonify({'ok': True}), 200


@system_bp.route('/system/shutdown', methods=['POST'])
def system_shutdown():
    if not _is_local_request():
        return jsonify({'ok': False, 'message': 'Forbidden'}), 403

    data = request.get_json(silent=True) or {}
    reason = data.get('reason', 'window_closed')

    service = get_system_shutdown_service()
    service.request_shutdown(reason)
    return jsonify({'ok': True}), 200
