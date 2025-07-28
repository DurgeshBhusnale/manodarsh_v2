from flask import Flask, jsonify
from flask_cors import CORS
from api import api_bp
from api.auth.routes import auth_bp
from api.image.routes import image_bp
from api.admin.routes import admin_bp
from api.admin.settings import settings_bp
from api.survey.routes import survey_bp
from config.settings import settings
# DISABLED: from services.scheduler_service import MonitoringScheduler

def create_app():
    app = Flask(__name__)
    
    # Update CORS configuration using settings
    CORS(app, resources={
        r"/api/*": {
            "origins": [settings.FRONTEND_URL],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })

    # Register the main API blueprint
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(image_bp, url_prefix='/api/image')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(settings_bp, url_prefix='/api/admin')
    app.register_blueprint(survey_bp, url_prefix='/api/survey')

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
