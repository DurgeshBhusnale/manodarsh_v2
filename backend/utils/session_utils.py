from db.connection import get_connection
from config.settings import Settings
import logging

settings = Settings()
logger = logging.getLogger(__name__)

def get_dynamic_session_timeout():
    """Get current session timeout from database with fallback to config defaults"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get session timeout from database
        cursor.execute("""
            SELECT setting_value 
            FROM system_settings 
            WHERE setting_name = 'session_timeout'
        """)
        
        result = cursor.fetchone()
        
        if result:
            session_timeout = int(result['setting_value'])
            logger.info(f"Dynamic session timeout loaded: {session_timeout} seconds")
        else:
            session_timeout = settings.SESSION_TIMEOUT
            logger.info(f"Using config default session timeout: {session_timeout} seconds")
        
        conn.close()
        return session_timeout
        
    except Exception as e:
        logger.error(f"Error retrieving dynamic session timeout: {e}")
        # Fallback to config defaults
        logger.info(f"Using config default session timeout: {settings.SESSION_TIMEOUT} seconds")
        return settings.SESSION_TIMEOUT
