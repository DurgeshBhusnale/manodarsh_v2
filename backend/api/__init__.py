from flask import Blueprint

# Create main API blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Note: Sub-blueprints are registered directly in app.py to avoid conflicts