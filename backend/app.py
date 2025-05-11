from flask import Flask, jsonify, request
from flask_cors import CORS
from services.auth_service import AuthService  # Import from correct location

def create_app():
    app = Flask(__name__)
    # Update CORS configuration to specifically allow your frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })
    return app

app = create_app()
auth_service = AuthService()

@app.route('/')
def hello():
    return jsonify({"message": "Hello from Flask!"})

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
