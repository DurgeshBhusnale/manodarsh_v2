from flask import Blueprint
from .auth import auth_bp
from .image import image_bp

# Create main API blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Register sub-blueprints
api_bp.register_blueprint(auth_bp, url_prefix='/auth')
api_bp.register_blueprint(image_bp, url_prefix='/image')