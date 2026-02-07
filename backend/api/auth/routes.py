from flask import Blueprint, jsonify, request, session
from services.auth_service import AuthService
from datetime import datetime, timedelta
from config.settings import settings
from utils.session_utils import get_dynamic_session_timeout

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
            
            # PHASE 1: Disable session timeout - set very long duration (365 days)
            # This effectively disables automatic session expiration
            session_timeout = 365 * 24 * 60 * 60  # 365 days in seconds
            
            # Set session data
            session['user_id'] = user['force_id']
            session['role'] = user['role']
            session['login_time'] = datetime.now().isoformat()
            # PHASE 1: Set expiration far in future to prevent auto-logout
            session['expires_at'] = (datetime.now() + timedelta(seconds=session_timeout)).isoformat()
            session.permanent = True
                
            return jsonify({
                'message': 'Admin login successful',
                'user': {
                    'force_id': user['force_id'],
                    'role': user['role']
                },
                'session_timeout': session_timeout,  # Send timeout to frontend
                'phase': 'PHASE_1_MANUAL_LOGOUT_ONLY'
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
    """Handle logout and clear session - PHASE 1: Manual logout only"""
    try:
        # Clear all session data
        session.clear()
        return jsonify({
            'message': 'Logout successful',
            'phase': 'PHASE_1_MANUAL_LOGOUT_ONLY'
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@auth_bp.route('/session-status', methods=['GET'])
def session_status():
    """Check if session is still valid - PHASE 1: No expiration checking"""
    # PHASE 1: Simple check - session exists or not
    # Do NOT check expiration time
    if 'user_id' not in session:
        return jsonify({
            'valid': False,
            'message': 'No active session'
        }), 401
    
    try:
        # PHASE 1: Return session info without expiration checking
        return jsonify({
            'valid': True,
            'user': {
                'force_id': session['user_id'],
                'role': session['role']
            },
            'phase': 'PHASE_1_MANUAL_LOGOUT_ONLY',
            'message': 'Session valid - manual logout only'
        }), 200
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'message': f'Session error: {str(e)}'
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

@auth_bp.route('/validate-session', methods=['GET'])
def validate_session():
    """Validate current session and return status"""
    try:
        # Check if session exists
        if 'user_id' not in session or 'expires_at' not in session:
            return jsonify({
                'valid': False, - PHASE 1: No expiration checking"""
    try:
        # Check if session exists
        if 'user_id' not in session:
            return jsonify({
                'valid': False,
                'message': 'No active session'
            }), 401
            
        # PHASE 1: Do NOT check expiration - session is valid if it exists
        # No session extension, no timeout checking
        
        return jsonify({
            'valid': True,
            'user': {
                'force_id': session['user_id'],
                'role': session['role']
            },
            'phase': 'PHASE_1_MANUAL_LOGOUT_ONLY',
            'message': 'Session valid - manual logout only'
            'message': f'Session validation error: {str(e)}'
        }), 500

@auth_bp.route('/refresh-session', methods=['POST'])
def refresh_session():
    """Refresh session timeout"""
    try:
        # Check if session exists
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'No active session'
            }), 401
            
        # Refresh session with current timeout setting
        session_timeout = get_dynamic_session_timeout()
        session['expires_at'] = (datetime.now() + timedelta(seconds=session_timeout)).isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Session refreshed',
            'expires_at': sess - PHASE 1: Not needed, always returns success"""
    try:
        # Check if session exists
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'No active session'
            }), 401
            
        # PHASE 1: Session doesn't expire, so refresh is no-op
        # Just return success
        
        return jsonify({
            'success': True,
            'message': 'Session active (Phase 1 - no expiration)',
            'phase': 'PHASE_1_MANUAL_LOGOUT_ONLY'