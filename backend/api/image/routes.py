from flask import Blueprint, jsonify, request
from services.image_collection import ImageCollectionService

image_bp = Blueprint('image', __name__)
image_collection_service = ImageCollectionService()

@image_bp.route('/collect', methods=['POST'])
def collect_images():
    """Handle image collection for a soldier"""
    data = request.get_json()
    
    if not data or 'force_id' not in data:
        return jsonify({
            'error': 'Missing required field: force_id'
        }), 400
        
    force_id = data['force_id']
    
    # Validate force_id format
    if not force_id.isdigit() or len(force_id) != 9:
        return jsonify({
            'error': 'Invalid force ID format. Must be 9 digits.'
        }), 400
    
    try:
        folder_path = image_collection_service.collect_images(force_id)
        return jsonify({
            'message': 'Image collection successful',
            'folder_path': folder_path
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500