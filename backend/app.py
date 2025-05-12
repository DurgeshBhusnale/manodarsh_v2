from flask import Flask, jsonify
from flask_cors import CORS
from api import api_bp

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
    
    return app

app = create_app()

@app.route('/')
def hello():
    return jsonify({"message": "Hello from Flask!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
