from flask import Blueprint, request, jsonify
from db.connection import get_connection
import logging
from config.settings import settings

settings_bp = Blueprint('settings', __name__)
logger = logging.getLogger(__name__)

@settings_bp.route('/system-settings', methods=['GET'])
def get_system_settings():
    """Get current system settings"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get settings from database
        cursor.execute("SELECT * FROM system_settings")
        db_settings = cursor.fetchall()
        
        # Convert to dictionary with proper category mapping
        settings_dict = {}
        
        # Category mapping for database settings
        category_mapping = {
            'nlp_weight': 'scoring',
            'emotion_weight': 'scoring',
            'session_timeout': 'security',
            'camera_width': 'camera',
            'camera_height': 'camera',
            'detection_interval': 'camera',
            'webcam_enabled': 'camera',
            'risk_low_threshold': 'risk',
            'risk_medium_threshold': 'risk',
            'risk_high_threshold': 'risk',
            'risk_critical_threshold': 'risk',
            'default_page_size': 'performance'
        }
        
        for setting in db_settings:
            setting_name = setting['setting_name']
            settings_dict[setting_name] = {
                'value': setting['setting_value'],
                'description': setting['description'],
                'category': category_mapping.get(setting_name, 'general')
            }
        
        # Add default settings if not in database
        default_settings = {
            'nlp_weight': {
                'value': str(settings.NLP_WEIGHT),
                'description': 'Weight for NLP sentiment analysis in combined score',
                'category': 'scoring'
            },
            'emotion_weight': {
                'value': str(settings.EMOTION_WEIGHT),
                'description': 'Weight for emotion detection in combined score',
                'category': 'scoring'
            },
            'session_timeout': {
                'value': str(settings.SESSION_TIMEOUT),
                'description': 'Session timeout in seconds',
                'category': 'security'
            },
            'camera_width': {
                'value': str(settings.CAMERA_WIDTH),
                'description': 'Camera capture width in pixels',
                'category': 'camera'
            },
            'camera_height': {
                'value': str(settings.CAMERA_HEIGHT),
                'description': 'Camera capture height in pixels',
                'category': 'camera'
            },
            'detection_interval': {
                'value': str(settings.DETECTION_INTERVAL),
                'description': 'Emotion detection interval in frames',
                'category': 'camera'
            },
            'risk_low_threshold': {
                'value': str(settings.RISK_THRESHOLDS['LOW']),
                'description': 'Threshold for low risk classification',
                'category': 'risk'
            },
            'risk_medium_threshold': {
                'value': str(settings.RISK_THRESHOLDS['MEDIUM']),
                'description': 'Threshold for medium risk classification',
                'category': 'risk'
            },
            'risk_high_threshold': {
                'value': str(settings.RISK_THRESHOLDS['HIGH']),
                'description': 'Threshold for high risk classification',
                'category': 'risk'
            },
            'risk_critical_threshold': {
                'value': str(settings.RISK_THRESHOLDS['CRITICAL']),
                'description': 'Threshold for critical risk classification',
                'category': 'risk'
            },
            'default_page_size': {
                'value': str(settings.DEFAULT_PAGE_SIZE),
                'description': 'Default number of items per page',
                'category': 'performance'
            },
            'webcam_enabled': {
                'value': 'true',
                'description': 'Enable/disable webcam feed for survey emotion monitoring (for setup/testing purposes)',
                'category': 'camera'
            }
        }
        
        # Merge default settings with database settings
        for key, value in default_settings.items():
            if key not in settings_dict:
                settings_dict[key] = value
        
        return jsonify({
            'success': True,
            'settings': settings_dict
        })
        
    except Exception as e:
        logger.error(f"Error fetching system settings: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@settings_bp.route('/system-settings', methods=['POST'])
def update_system_settings():
    """Update system settings"""
    try:
        data = request.json
        updated_settings = data.get('settings', {})
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Update each setting
        for setting_name, setting_data in updated_settings.items():
            setting_value = setting_data.get('value')
            description = setting_data.get('description', '')
            
            # Insert or update setting
            cursor.execute("""
                INSERT INTO system_settings (setting_name, setting_value, description, updated_at)
                VALUES (%s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                description = VALUES(description),
                updated_at = NOW()
            """, (setting_name, setting_value, description))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Settings updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error updating system settings: {e}")
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@settings_bp.route('/settings-categories', methods=['GET'])
def get_settings_categories():
    """Get all settings categories"""
    categories = [
        {
            'id': 'scoring',
            'name': 'Mental Health Scoring',
            'description': 'Configuration for depression score calculation',
            'icon': 'chart-bar'
        },
        {
            'id': 'security',
            'name': 'Security & Authentication',
            'description': 'Session management and security settings',
            'icon': 'shield-check'
        },
        {
            'id': 'camera',
            'name': 'Camera & Detection',
            'description': 'Emotion detection and camera configuration',
            'icon': 'camera'
        },
        {
            'id': 'risk',
            'name': 'Risk Assessment',
            'description': 'Risk level thresholds and classification',
            'icon': 'exclamation-triangle'
        },
        {
            'id': 'performance',
            'name': 'Performance & UI',
            'description': 'Pagination, caching, and user interface settings',
            'icon': 'cog'
        }
    ]
    
    return jsonify({
        'success': True,
        'categories': categories
    })

@settings_bp.route('/reset-settings', methods=['POST'])
def reset_settings():
    """Reset all settings to default values"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Delete all custom settings (will fall back to defaults)
        cursor.execute("DELETE FROM system_settings")
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'All settings reset to default values'
        })
        
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@settings_bp.route('/backup-settings', methods=['GET'])
def backup_settings():
    """Backup current settings configuration"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM system_settings")
        settings_backup = cursor.fetchall()
        
        # Add timestamp to backup
        import datetime
        backup_data = {
            'timestamp': datetime.datetime.now().isoformat(),
            'settings': settings_backup
        }
        
        return jsonify({
            'success': True,
            'backup': backup_data
        })
        
    except Exception as e:
        logger.error(f"Error creating settings backup: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@settings_bp.route('/restore-settings', methods=['POST'])
def restore_settings():
    """Restore settings from backup"""
    try:
        data = request.json
        backup_settings = data.get('backup', {}).get('settings', [])
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Clear current settings
        cursor.execute("DELETE FROM system_settings")
        
        # Restore backup settings
        for setting in backup_settings:
            cursor.execute("""
                INSERT INTO system_settings 
                (setting_name, setting_value, description, category, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                setting['setting_name'],
                setting['setting_value'],
                setting['description'],
                setting.get('category', 'general'),
                setting.get('created_at'),
                setting.get('updated_at')
            ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Settings restored successfully'
        })
        
    except Exception as e:
        logger.error(f"Error restoring settings: {e}")
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@settings_bp.route('/webcam-toggle', methods=['GET'])
def get_webcam_toggle():
    """Get current webcam toggle state"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get webcam setting from database
        cursor.execute("SELECT setting_value FROM system_settings WHERE setting_name = 'webcam_enabled'")
        result = cursor.fetchone()
        
        if result:
            webcam_enabled = result['setting_value'].lower() == 'true'
        else:
            # Default to enabled if not set
            webcam_enabled = True
            # Insert default setting
            cursor.execute("""
                INSERT INTO system_settings (setting_name, setting_value, description)
                VALUES ('webcam_enabled', 'true', 'Enable/disable webcam feed for survey emotion monitoring (for setup/testing purposes)')
                ON DUPLICATE KEY UPDATE setting_value = 'true'
            """)
            conn.commit()
        
        return jsonify({
            'success': True,
            'webcam_enabled': webcam_enabled
        })
        
    except Exception as e:
        logger.error(f"Error getting webcam toggle: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@settings_bp.route('/webcam-toggle', methods=['POST'])
def set_webcam_toggle():
    """Set webcam toggle state"""
    try:
        data = request.json
        webcam_enabled = data.get('webcam_enabled', True)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Update or insert webcam setting
        cursor.execute("""
            INSERT INTO system_settings (setting_name, setting_value, description, updated_at)
            VALUES ('webcam_enabled', %s, 'Enable/disable webcam feed for survey emotion monitoring (for setup/testing purposes)', NOW())
            ON DUPLICATE KEY UPDATE 
                setting_value = VALUES(setting_value),
                updated_at = NOW()
        """, (str(webcam_enabled).lower(),))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Webcam {"enabled" if webcam_enabled else "disabled"} successfully',
            'webcam_enabled': webcam_enabled
        })
        
    except Exception as e:
        logger.error(f"Error setting webcam toggle: {e}")
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()
