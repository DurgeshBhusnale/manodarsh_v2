import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / '.env'
load_dotenv(env_path)

class Settings:
    """Centralized configuration management for the CRPF Mental Health Monitoring System"""
    
    # Database Configuration
    DB_NAME = os.getenv('DB_NAME', 'crpf_mental_health')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    
    # Server Configuration
    BACKEND_PORT = int(os.getenv('BACKEND_PORT', 5000))
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    DEBUG_MODE = os.getenv('DEBUG_MODE', 'True').lower() == 'true'
    
    # Security Configuration
    SESSION_TIMEOUT = int(os.getenv('SESSION_TIMEOUT', 900))  # 15 minutes in seconds
    MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', 3))
    PASSWORD_MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', 8))
    
    # Mental Health Scoring Configuration
    NLP_WEIGHT = float(os.getenv('NLP_WEIGHT', 0.7))
    EMOTION_WEIGHT = float(os.getenv('EMOTION_WEIGHT', 0.3))
    
    # Risk Level Thresholds
    RISK_THRESHOLDS = {
        'LOW': float(os.getenv('RISK_LOW_THRESHOLD', 0.3)),
        'MEDIUM': float(os.getenv('RISK_MEDIUM_THRESHOLD', 0.5)),
        'HIGH': float(os.getenv('RISK_HIGH_THRESHOLD', 0.7)),
        'CRITICAL': float(os.getenv('RISK_CRITICAL_THRESHOLD', 0.85))
    }
    
    # Camera and Emotion Detection Configuration
    CAMERA_WIDTH = int(os.getenv('CAMERA_WIDTH', 640))
    CAMERA_HEIGHT = int(os.getenv('CAMERA_HEIGHT', 480))
    CAMERA_FPS = int(os.getenv('CAMERA_FPS', 10))
    DETECTION_INTERVAL = int(os.getenv('DETECTION_INTERVAL', 30))  # frames
    
    # Notification Configuration
    EMAIL_ENABLED = os.getenv('EMAIL_ENABLED', 'False').lower() == 'true'
    SMS_ENABLED = os.getenv('SMS_ENABLED', 'False').lower() == 'true'
    ALERT_COOLDOWN = int(os.getenv('ALERT_COOLDOWN', 3600))  # 1 hour in seconds
    
    # Pagination and Performance
    DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', 10))
    MAX_PAGE_SIZE = int(os.getenv('MAX_PAGE_SIZE', 100))
    CACHE_TTL = int(os.getenv('CACHE_TTL', 300))  # 5 minutes
    
    # Survey Configuration
    MAX_SURVEY_TIME = int(os.getenv('MAX_SURVEY_TIME', 1800))  # 30 minutes
    AUTO_SAVE_INTERVAL = int(os.getenv('AUTO_SAVE_INTERVAL', 30))  # seconds
    
    # File Upload Configuration
    MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 10485760))  # 10MB
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,pdf').split(','))
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE_PATH = os.getenv('LOG_FILE_PATH', 'logs/app.log')
    
    # Translation Configuration
    TRANSLATION_API_KEY = os.getenv('TRANSLATION_API_KEY', '')
    DEFAULT_LANGUAGE = os.getenv('DEFAULT_LANGUAGE', 'en')
    SUPPORTED_LANGUAGES = os.getenv('SUPPORTED_LANGUAGES', 'en,hi').split(',')
    
    @classmethod
    def get_risk_level(cls, score):
        """Determine risk level based on score"""
        if score >= cls.RISK_THRESHOLDS['CRITICAL']:
            return 'CRITICAL'
        elif score >= cls.RISK_THRESHOLDS['HIGH']:
            return 'HIGH'
        elif score >= cls.RISK_THRESHOLDS['MEDIUM']:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    @classmethod
    def get_alert_level(cls, score):
        """Get alert level with color coding"""
        risk_level = cls.get_risk_level(score)
        alert_mapping = {
            'LOW': 'GREEN',
            'MEDIUM': 'YELLOW',
            'HIGH': 'ORANGE',
            'CRITICAL': 'RED'
        }
        return alert_mapping.get(risk_level, 'GREEN')
    
    @classmethod
    def calculate_combined_score(cls, nlp_score, emotion_score):
        """Calculate weighted combined depression score"""
        if nlp_score is not None and emotion_score is not None:
            return (nlp_score * cls.NLP_WEIGHT) + (emotion_score * cls.EMOTION_WEIGHT)
        elif nlp_score is not None:
            return nlp_score
        elif emotion_score is not None:
            return emotion_score
        else:
            return 0.0

# Global settings instance
settings = Settings()
