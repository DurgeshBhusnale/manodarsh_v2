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
import os
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

@app.route('/')
def hello():
    return jsonify({"message": "CRPF Mental Health Monitoring System API"})

if __name__ == '__main__':
    app.run(debug=settings.DEBUG_MODE, port=settings.BACKEND_PORT)
