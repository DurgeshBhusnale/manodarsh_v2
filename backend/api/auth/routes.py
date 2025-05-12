from flask import Blueprint, jsonify, request
from services.auth_service import AuthService

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handle user login for both soldiers and admins"""
    data = request.get_json()
    
    if not data or 'force_id' not in data or 'password' not in data:
        return jsonify({
            'error': 'Missing required fields: force_id and password'
        }), 400
        
    force_id = data['force_id']
    password = data['password']
    
    # Validate force_id format
    if not force_id.isdigit() or len(force_id) != 9:
        return jsonify({
            'error': 'Invalid force ID format. Must be 9 digits.'
        }), 400
    
    try:
        user = auth_service.verify_login(force_id, password)
        if user:
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'force_id': user['force_id'],
                    'role': user['role']
                }
            }), 200
        else:
            return jsonify({
                'error': 'Invalid credentials'
            }), 401
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """Handle registration for new soldiers"""
    data = request.get_json()
    
    if not data or 'force_id' not in data or 'password' not in data:
        return jsonify({
            'error': 'Missing required fields: force_id and password'
        }), 400
        
    force_id = data['force_id']
    password = data['password']
    
    # Validate force_id format
    if not force_id.isdigit() or len(force_id) != 9:
        return jsonify({
            'error': 'Invalid force ID format. Must be 9 digits.'
        }), 400
    
    try:
        user = auth_service.register_soldier(force_id, password)
        return jsonify({
            'message': 'Soldier registered successfully',
            'user': user
        }), 201
    except ValueError as e:
        return jsonify({
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500
