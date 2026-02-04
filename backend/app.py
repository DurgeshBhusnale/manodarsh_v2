# PHASE 1: Disable TensorFlow GPU checking for faster startup
# Must be set BEFORE any TensorFlow/Keras imports
import os
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  # Disable GPU
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow warnings

from flask import Flask, jsonify
from flask_cors import CORS
from api import api_bp
from api.auth.routes import auth_bp
from api.image.routes import image_bp
from api.admin.routes import admin_bp
from api.admin.settings import settings_bp
from api.survey.routes import survey_bp
from api.monitor.routes import monitor_bp
from config.settings import settings
from utils.session_utils import get_dynamic_session_timeout
from datetime import timedelta
import logging
import threading
# DISABLED: from services.scheduler_service import MonitoringScheduler
# PHASE 2 OPTIMIZATION: Add model preloader
from services.model_preloader_service import ModelPreloaderService

def create_app():
    app = Flask(__name__)
    
    # Configure Flask sessions with dynamic timeout
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'crpf-mental-health-secret-key-change-in-production')
    
    # Use dynamic session timeout, with fallback to settings default
    try:
        session_timeout = get_dynamic_session_timeout()
    except:
        session_timeout = settings.SESSION_TIMEOUT
        
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(seconds=session_timeout)
    
    # Update CORS configuration using settings
    CORS(app, resources={
        r"/api/*": {
            "origins": [settings.FRONTEND_URL],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": True  # Enable credentials for session cookies
        }
    })

    # Register the main API blueprint
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(image_bp, url_prefix='/api/image')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(settings_bp, url_prefix='/api/admin/settings')
    app.register_blueprint(survey_bp, url_prefix='/api/survey')
    app.register_blueprint(monitor_bp, url_prefix='/api/monitor')

    # PHASE 2 OPTIMIZATION: Initialize model preloader in background
    def start_model_preloader():
        """Start model preloading in background thread"""
        try:
            print("[APP] Starting model preloader service...")
            logging.info("Starting model preloader service...")
            model_preloader = ModelPreloaderService.get_instance()
            # The constructor automatically starts preloading, just wait a moment for it
            import time
            time.sleep(0.5)  # Give it a moment to start
            status = model_preloader.get_status()
            print(f"[APP] Model preloader status: {status}")
            logging.info(f"Model preloader initialization completed: {status}")
        except Exception as e:
            print(f"[APP] Error starting model preloader: {e}")
            logging.error(f"Error starting model preloader: {e}")
    
    # Start model preloading in background thread (non-blocking)
    print("[APP] Launching model preloader thread...")
    preloader_thread = threading.Thread(target=start_model_preloader, daemon=True)
    preloader_thread.start()

    # DISABLED: Initialize scheduler for CCTV monitoring
    # scheduler = MonitoringScheduler()
    
    # DISABLED: Start scheduler within app context
    # with app.app_context():
    #     scheduler.start()

    # DISABLED: Cleanup on app shutdown
    # @app.teardown_appcontext
    # def cleanup(error):
    #     scheduler.stop()
    
    return app

app = create_app()

# ============================================================================
# DEPLOYMENT: Serve React Frontend (Flask serves production build)
# ============================================================================
from flask import send_from_directory

# Frontend build directory (React production build)
FRONTEND_BUILD_DIR = os.path.abspath(os.path.join(
    os.path.dirname(__file__), 
    '../frontend/build'
))

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    """
    Serve React production build for deployment.
    API routes (registered in blueprints) take priority - they're registered first.
    This catches all other routes for React Router.
    
    For development: Use separate React dev server (npm start on port 3000)
    For production: Build React (npm run build) and Flask serves it at port 5000
    """
    # Only serve frontend if build directory exists
    if not os.path.exists(FRONTEND_BUILD_DIR):
        # In development, API still works even without frontend build
        if path.startswith('api/'):
            return jsonify({
                "error": "Not found",
                "message": "API endpoint not found"
            }), 404
        
        return jsonify({
            "error": "Frontend build not found",
            "message": "Run 'cd frontend && npm run build' to create production build",
            "api_status": "API is working at /api/* endpoints",
            "development": "Use 'npm start' in frontend/ for development"
        }), 404
    
    # If requesting a specific file that exists, serve it
    if path and os.path.exists(os.path.join(FRONTEND_BUILD_DIR, path)):
        return send_from_directory(FRONTEND_BUILD_DIR, path)
    
    # Otherwise serve index.html (React Router handles routing)
    return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')

if __name__ == '__main__':
    # PHASE 1: Disable reloader for faster startup (no double initialization)
    # use_reloader=False prevents Flask from spawning two processes
    app.run(debug=settings.DEBUG_MODE, port=settings.BACKEND_PORT, use_reloader=False)
