from flask import Flask, jsonify
from flask_cors import CORS
from api import api_bp
from api.auth.routes import auth_bp
from api.image.routes import image_bp
from services.scheduler_service import MonitoringScheduler

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

    # Register the main API blueprint
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(image_bp, url_prefix='/api/image')

    # Initialize scheduler
    scheduler = MonitoringScheduler()
    
    # Start scheduler within app context
    with app.app_context():
        scheduler.start()

    # Cleanup on app shutdown
    @app.teardown_appcontext
    def cleanup(error):
        scheduler.stop()
    
    return app

app = create_app()

@app.route('/')
def hello():
    return jsonify({"message": "Hello from Flask!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
