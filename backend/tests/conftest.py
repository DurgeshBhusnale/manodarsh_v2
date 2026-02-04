"""
Pytest Configuration and Fixtures
Shared fixtures for all test modules
"""

import pytest
import sys
import os
from datetime import datetime
from unittest.mock import Mock, MagicMock
import numpy as np

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ============================================================================
# DATABASE FIXTURES
# ============================================================================

@pytest.fixture
def mock_db_connection():
    """Mock database connection"""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    return mock_conn, mock_cursor

@pytest.fixture
def test_db_config():
    """Test database configuration"""
    return {
        'host': 'localhost',
        'port': 3306,
        'database': 'crpf_mental_health_test',
        'user': 'test_user',
        'password': 'test_password'
    }

# ============================================================================
# USER & AUTH FIXTURES
# ============================================================================

@pytest.fixture
def test_user_admin():
    """Sample admin user"""
    return {
        'id': 1,
        'force_id': '999999999',
        'username': 'admin_test',
        'email': 'admin@test.com',
        'role': 'admin',
        'password': 'TestPass123!'
    }

@pytest.fixture
def test_user_soldier():
    """Sample soldier user"""
    return {
        'id': 2,
        'force_id': '100000001',
        'username': 'soldier_test',
        'email': 'soldier@test.com',
        'role': 'soldier',
        'password': 'TestPass123!'
    }

@pytest.fixture
def auth_token_admin():
    """Mock admin authentication token"""
    return 'mock_admin_token_12345'

@pytest.fixture
def auth_token_soldier():
    """Mock soldier authentication token"""
    return 'mock_soldier_token_67890'

# ============================================================================
# CAMERA & VIDEO FIXTURES
# ============================================================================

@pytest.fixture
def mock_camera():
    """Mock OpenCV VideoCapture object"""
    mock_cap = MagicMock()
    mock_cap.isOpened.return_value = True
    mock_cap.read.return_value = (True, create_test_frame())
    mock_cap.get.return_value = 30  # FPS
    return mock_cap

@pytest.fixture
def mock_camera_unavailable():
    """Mock unavailable camera"""
    mock_cap = MagicMock()
    mock_cap.isOpened.return_value = False
    return mock_cap

def create_test_frame(width=640, height=480, color=(128, 128, 128)):
    """Create a test BGR frame"""
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:, :] = color
    return frame

@pytest.fixture
def test_frame():
    """Test video frame (640x480 BGR)"""
    return create_test_frame()

@pytest.fixture
def test_frame_with_face():
    """Test frame with a face region"""
    frame = create_test_frame()
    # Draw a white rectangle to simulate face
    frame[200:300, 250:350] = (255, 255, 255)
    return frame

# ============================================================================
# AI MODEL FIXTURES
# ============================================================================

@pytest.fixture
def mock_emotion_model():
    """Mock Keras emotion detection model"""
    mock_model = MagicMock()
    # Mock prediction: [Angry, Disgusted, Fearful, Happy, Neutral, Sad, Surprised]
    mock_model.predict.return_value = np.array([[0.1, 0.05, 0.1, 0.5, 0.15, 0.05, 0.05]])
    return mock_model

@pytest.fixture
def mock_face_cascade():
    """Mock Haar Cascade face detector"""
    mock_cascade = MagicMock()
    # Mock face detection: [(x, y, w, h)]
    mock_cascade.detectMultiScale.return_value = np.array([[250, 200, 100, 100]])
    return mock_cascade

@pytest.fixture
def mock_face_encodings():
    """Mock face recognition encodings"""
    # 128-dimensional face encodings
    encoding1 = np.random.rand(128)
    encoding2 = np.random.rand(128)
    return [encoding1, encoding2]

@pytest.fixture
def mock_pkl_model():
    """Mock PKL model data"""
    return {
        'encodings': [np.random.rand(128) for _ in range(5)],
        'force_ids': ['100000001', '100000002', '100000003', '100000004', '100000005']
    }

# ============================================================================
# SURVEY & QUESTIONNAIRE FIXTURES
# ============================================================================

@pytest.fixture
def test_questionnaire():
    """Sample questionnaire"""
    return {
        'id': 1,
        'title': 'Weekly Mental Health Check',
        'description': 'Weekly assessment for soldiers',
        'language': 'en',
        'active': True
    }

@pytest.fixture
def test_questions():
    """Sample questions"""
    return [
        {
            'id': 1,
            'questionnaire_id': 1,
            'question_text': 'How are you feeling today?',
            'question_type': 'text',
            'order_index': 1
        },
        {
            'id': 2,
            'questionnaire_id': 1,
            'question_text': 'Rate your stress level',
            'question_type': 'scale',
            'options': ['1', '2', '3', '4', '5'],
            'order_index': 2
        },
        {
            'id': 3,
            'questionnaire_id': 1,
            'question_text': 'Do you feel hopeless?',
            'question_type': 'multiple_choice',
            'options': ['Yes', 'No', 'Sometimes'],
            'order_index': 3
        }
    ]

@pytest.fixture
def test_survey_responses():
    """Sample survey responses"""
    return [
        {
            'question_id': 1,
            'answer_text': 'I feel very depressed and hopeless'
        },
        {
            'question_id': 2,
            'answer_text': '5'
        },
        {
            'question_id': 3,
            'answer_text': 'Yes'
        }
    ]

@pytest.fixture
def test_emotion_captures():
    """Sample emotion captures"""
    return [
        {'emotion': 'Sad', 'score': 0.9, 'timestamp': '2026-02-04T12:00:00Z'},
        {'emotion': 'Sad', 'score': 0.85, 'timestamp': '2026-02-04T12:00:05Z'},
        {'emotion': 'Fearful', 'score': 0.8, 'timestamp': '2026-02-04T12:00:10Z'},
        {'emotion': 'Neutral', 'score': 0.45, 'timestamp': '2026-02-04T12:00:15Z'},
    ]

# ============================================================================
# FLASK APP FIXTURES
# ============================================================================

@pytest.fixture
def app():
    """Create Flask test app"""
    # Import here to avoid circular imports
    from app import create_app
    
    app = create_app('testing')
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    return app

@pytest.fixture
def client(app):
    """Flask test client"""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Flask CLI test runner"""
    return app.test_cli_runner()

# ============================================================================
# TIME & DATE FIXTURES
# ============================================================================

@pytest.fixture
def fixed_datetime():
    """Fixed datetime for testing"""
    return datetime(2026, 2, 4, 12, 0, 0)

# ============================================================================
# FILE & PATH FIXTURES
# ============================================================================

@pytest.fixture
def temp_upload_dir(tmp_path):
    """Temporary upload directory"""
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    return upload_dir

@pytest.fixture
def test_image_path(tmp_path):
    """Create a test image file"""
    import cv2
    image_path = tmp_path / "test_face.jpg"
    test_image = create_test_frame()
    cv2.imwrite(str(image_path), test_image)
    return str(image_path)

# ============================================================================
# CONFIGURATION FIXTURES
# ============================================================================

@pytest.fixture
def test_config():
    """Test configuration dictionary"""
    return {
        'DB_HOST': 'localhost',
        'DB_PORT': 3306,
        'DB_NAME': 'crpf_mental_health_test',
        'NLP_WEIGHT': 0.7,
        'EMOTION_WEIGHT': 0.3,
        'RISK_THRESHOLDS': {
            'LOW': 0.3,
            'MEDIUM': 0.5,
            'HIGH': 0.7
        },
        'HIGH_RISK_THRESHOLD': 0.65,
        'CAMERA_BACKEND': 'CAP_DSHOW'
    }

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def assert_depression_score_valid(score):
    """Assert depression score is in valid range"""
    assert 0.0 <= score <= 1.0, f"Depression score {score} not in range [0.0, 1.0]"

def assert_risk_level_valid(risk_level):
    """Assert risk level is valid"""
    valid_levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    assert risk_level in valid_levels, f"Risk level {risk_level} not in {valid_levels}"

# Export helper functions
pytest.assert_depression_score_valid = assert_depression_score_valid
pytest.assert_risk_level_valid = assert_risk_level_valid
