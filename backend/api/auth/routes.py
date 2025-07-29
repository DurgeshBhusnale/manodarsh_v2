from flask import Blueprint, jsonify, request, session
from services.auth_service import AuthService
from datetime import datetime, timedelta
from config.settings import settings

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handle login - ONLY ADMINS ALLOWED with session management"""
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
            # ONLY ALLOW ADMIN LOGIN
            if user['role'] != 'admin':
                return jsonify({
                    'error': 'Access denied. Only administrators can login.'
                }), 403
            
            # Set session data
            session['user_id'] = user['force_id']
            session['role'] = user['role']
            session['login_time'] = datetime.now().isoformat()
            session['expires_at'] = (datetime.now() + timedelta(seconds=settings.SESSION_TIMEOUT)).isoformat()
            session.permanent = True
                
            return jsonify({
                'message': 'Admin login successful',
                'user': {
                    'force_id': user['force_id'],
                    'role': user['role']
                },
                'session_timeout': settings.SESSION_TIMEOUT
            }), 200
        else:
            return jsonify({
                'error': 'Invalid credentials'
            }), 401
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Handle logout and clear session"""
    session.clear()
    return jsonify({
        'message': 'Logout successful'
    }), 200

@auth_bp.route('/session-status', methods=['GET'])
def session_status():
    """Check if session is still valid"""
    if 'user_id' not in session or 'expires_at' not in session:
        return jsonify({
            'valid': False,
            'message': 'No active session'
        }), 401
    
    try:
        expires_at = datetime.fromisoformat(session['expires_at'])
        if datetime.now() > expires_at:
            session.clear()
            return jsonify({
                'valid': False,
                'message': 'Session expired'
            }), 401
        
        return jsonify({
            'valid': True,
            'user': {
                'force_id': session['user_id'],
                'role': session['role']
            },
            'expires_at': session['expires_at']
        }), 200
        
    except Exception as e:
        session.clear()
        return jsonify({
            'valid': False,
            'message': 'Session error'
        }), 401

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

@auth_bp.route('/verify-soldier', methods=['POST'])
def verify_soldier():
    """Verify soldier credentials for questionnaire purposes - NO LOGIN ACCESS"""
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
        if user and user['role'] == 'soldier':
            return jsonify({
                'message': 'Soldier credentials verified',
                'verified': True,
                'force_id': user['force_id']
            }), 200
        else:
            return jsonify({
                'error': 'Invalid soldier credentials',
                'verified': False
            }), 401
    except Exception as e:
        return jsonify({
            'error': str(e),
            'verified': False
        }), 500
