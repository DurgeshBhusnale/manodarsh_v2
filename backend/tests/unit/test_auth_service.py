"""
Unit Tests for Authentication Service
Tests user registration, login, password hashing, and session management
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from services.auth_service import AuthService


class TestUserRegistration:
    """Test user registration functionality"""
    
    @pytest.mark.unit
    def test_register_admin_success(self, mock_db_connection):
        """Test successful admin registration"""
        mock_conn, mock_cursor = mock_db_connection
        
        with patch('services.auth_service.get_db_connection', return_value=mock_conn):
            auth_service = AuthService()
            
            result = auth_service.register_user(
                username='admin_new',
                email='admin@crpf.gov.in',
                password='SecurePass123!',
                role='admin',
                force_id='999999998'
            )
            
            assert result['success'] is True
            assert 'user_id' in result
            mock_cursor.execute.assert_called()  # SQL executed
    
    @pytest.mark.unit
    def test_register_soldier_success(self, mock_db_connection):
        """Test successful soldier registration"""
        mock_conn, mock_cursor = mock_db_connection
        
        with patch('services.auth_service.get_db_connection', return_value=mock_conn):
            auth_service = AuthService()
            
            result = auth_service.register_user(
                username='soldier_new',
                email='soldier@crpf.gov.in',
                password='SecurePass123!',
                role='soldier',
                force_id='100000099'
            )
            
            assert result['success'] is True
    
    @pytest.mark.unit
    def test_register_duplicate_username(self, mock_db_connection):
        """Test registration with duplicate username"""
        mock_conn, mock_cursor = mock_db_connection
        
        # Simulate IntegrityError for duplicate
        import mysql.connector
        mock_cursor.execute.side_effect = mysql.connector.IntegrityError("Duplicate entry")
        
        with patch('services.auth_service.get_db_connection', return_value=mock_conn):
            auth_service = AuthService()
            
            result = auth_service.register_user(
                username='existing_user',
                email='new@crpf.gov.in',
                password='SecurePass123!',
                role='soldier',
                force_id='100000100'
            )
            
            assert result['success'] is False
            assert 'error' in result
    
    @pytest.mark.unit
    def test_register_invalid_force_id(self):
        """Test registration with invalid force ID format"""
        auth_service = AuthService()
        
        # Force ID must be 9 digits
        result = auth_service.register_user(
            username='test_user',
            email='test@crpf.gov.in',
            password='SecurePass123!',
            role='soldier',
            force_id='12345'  # Only 5 digits
        )
        
        assert result['success'] is False
        assert 'force_id' in result['error'].lower()
    
    @pytest.mark.unit
    def test_register_weak_password(self):
        """Test registration with weak password"""
        auth_service = AuthService()
        
        # Password too short
        result = auth_service.register_user(
            username='test_user',
            email='test@crpf.gov.in',
            password='weak',  # Only 4 characters
            role='soldier',
            force_id='100000101'
        )
        
        assert result['success'] is False
        assert 'password' in result['error'].lower()
    
    @pytest.mark.unit
    def test_register_invalid_email(self):
        """Test registration with invalid email format"""
        auth_service = AuthService()
        
        result = auth_service.register_user(
            username='test_user',
            email='not_an_email',  # Invalid email
            password='SecurePass123!',
            role='soldier',
            force_id='100000102'
        )
        
        assert result['success'] is False
        assert 'email' in result['error'].lower()
    
    @pytest.mark.unit
    def test_register_invalid_role(self):
        """Test registration with invalid role"""
        auth_service = AuthService()
        
        result = auth_service.register_user(
            username='test_user',
            email='test@crpf.gov.in',
            password='SecurePass123!',
            role='superuser',  # Invalid role (only 'admin' or 'soldier')
            force_id='100000103'
        )
        
        assert result['success'] is False
        assert 'role' in result['error'].lower()


class TestPasswordHashing:
    """Test password hashing and verification"""
    
    @pytest.mark.unit
    def test_password_hashing(self):
        """Test password is hashed with bcrypt"""
        auth_service = AuthService()
        password = 'TestPassword123!'
        
        hashed = auth_service.hash_password(password)
        
        # Bcrypt hash should start with $2b$
        assert hashed.startswith('$2b$')
        assert len(hashed) == 60  # Bcrypt hash length
        assert hashed != password  # Not plain text
    
    @pytest.mark.unit
    def test_password_verification_correct(self):
        """Test correct password verification"""
        auth_service = AuthService()
        password = 'TestPassword123!'
        
        hashed = auth_service.hash_password(password)
        result = auth_service.verify_password(password, hashed)
        
        assert result is True
    
    @pytest.mark.unit
    def test_password_verification_incorrect(self):
        """Test incorrect password verification"""
        auth_service = AuthService()
        password = 'TestPassword123!'
        wrong_password = 'WrongPassword456!'
        
        hashed = auth_service.hash_password(password)
        result = auth_service.verify_password(wrong_password, hashed)
        
        assert result is False
    
    @pytest.mark.unit
    def test_same_password_different_hashes(self):
        """Test same password produces different hashes (salt)"""
        auth_service = AuthService()
        password = 'TestPassword123!'
        
        hash1 = auth_service.hash_password(password)
        hash2 = auth_service.hash_password(password)
        
        # Same password, different hashes (due to salt)
        assert hash1 != hash2
        
        # But both should verify correctly
        assert auth_service.verify_password(password, hash1)
        assert auth_service.verify_password(password, hash2)


class TestUserLogin:
    """Test user login and authentication"""
    
    @pytest.mark.unit
    def test_login_success(self, mock_db_connection):
        """Test successful login"""
        mock_conn, mock_cursor = mock_db_connection
        auth_service = AuthService()
        
        # Mock user from database
        password_hash = auth_service.hash_password('TestPass123!')
        mock_cursor.fetchone.return_value = {
            'id': 1,
            'force_id': '100000001',
            'username': 'test_soldier',
            'email': 'soldier@test.com',
            'password_hash': password_hash,
            'role': 'soldier'
        }
        
        with patch('services.auth_service.get_db_connection', return_value=mock_conn):
            user = auth_service.authenticate_user('100000001', 'TestPass123!')
            
            assert user is not None
            assert user['force_id'] == '100000001'
            assert user['role'] == 'soldier'
            assert 'password_hash' not in user  # Should not return password hash
    
    @pytest.mark.unit
    def test_login_wrong_password(self, mock_db_connection):
        """Test login with wrong password"""
        mock_conn, mock_cursor = mock_db_connection
        auth_service = AuthService()
        
        password_hash = auth_service.hash_password('CorrectPass123!')
        mock_cursor.fetchone.return_value = {
            'id': 1,
            'force_id': '100000001',
            'password_hash': password_hash,
            'role': 'soldier'
        }
        
        with patch('services.auth_service.get_db_connection', return_value=mock_conn):
            user = auth_service.authenticate_user('100000001', 'WrongPass456!')
            
            assert user is None
    
    @pytest.mark.unit
    def test_login_nonexistent_user(self, mock_db_connection):
        """Test login with nonexistent force ID"""
        mock_conn, mock_cursor = mock_db_connection
        
        # No user found
        mock_cursor.fetchone.return_value = None
        
        with patch('services.auth_service.get_db_connection', return_value=mock_conn):
            auth_service = AuthService()
            user = auth_service.authenticate_user('999999999', 'AnyPassword123!')
            
            assert user is None
    
    @pytest.mark.unit
    def test_login_invalid_force_id_format(self):
        """Test login with invalid force ID format"""
        auth_service = AuthService()
        
        # Force ID must be 9 digits
        user = auth_service.authenticate_user('123', 'AnyPassword123!')
        
        assert user is None


class TestSessionManagement:
    """Test session creation and validation"""
    
    @pytest.mark.unit
    def test_create_session(self):
        """Test session creation"""
        auth_service = AuthService()
        user_id = 1
        
        session_token = auth_service.create_session(user_id)
        
        assert session_token is not None
        assert len(session_token) > 20  # Should be a random token
    
    @pytest.mark.unit
    def test_validate_session_valid(self):
        """Test validating a valid session"""
        auth_service = AuthService()
        user_id = 1
        
        # Create session
        session_token = auth_service.create_session(user_id)
        
        # Validate session
        validated_user_id = auth_service.validate_session(session_token)
        
        assert validated_user_id == user_id
    
    @pytest.mark.unit
    def test_validate_session_invalid(self):
        """Test validating an invalid session"""
        auth_service = AuthService()
        
        # Try to validate non-existent session
        validated_user_id = auth_service.validate_session('invalid_token_12345')
        
        assert validated_user_id is None
    
    @pytest.mark.unit
    def test_destroy_session(self):
        """Test session destruction"""
        auth_service = AuthService()
        user_id = 1
        
        # Create session
        session_token = auth_service.create_session(user_id)
        
        # Destroy session
        auth_service.destroy_session(session_token)
        
        # Session should no longer be valid
        validated_user_id = auth_service.validate_session(session_token)
        assert validated_user_id is None
    
    @pytest.mark.unit
    def test_session_timeout(self):
        """Test session timeout after 24 hours"""
        from freezegun import freeze_time
        from datetime import datetime, timedelta
        
        auth_service = AuthService()
        user_id = 1
        
        # Create session now
        with freeze_time("2026-02-04 12:00:00"):
            session_token = auth_service.create_session(user_id)
            
            # Should be valid immediately
            assert auth_service.validate_session(session_token) == user_id
        
        # Check 25 hours later (past 24-hour timeout)
        with freeze_time("2026-02-05 13:00:00"):
            validated_user_id = auth_service.validate_session(session_token)
            
            # Should be expired
            assert validated_user_id is None
    
    @pytest.mark.unit
    def test_multiple_sessions_same_user(self):
        """Test same user can have multiple sessions"""
        auth_service = AuthService()
        user_id = 1
        
        # Create two sessions for same user
        session1 = auth_service.create_session(user_id)
        session2 = auth_service.create_session(user_id)
        
        # Both should be valid
        assert auth_service.validate_session(session1) == user_id
        assert auth_service.validate_session(session2) == user_id
        
        # Tokens should be different
        assert session1 != session2


class TestRoleBasedAccess:
    """Test role-based access control"""
    
    @pytest.mark.unit
    def test_admin_role_check(self, test_user_admin):
        """Test admin role verification"""
        auth_service = AuthService()
        
        is_admin = auth_service.is_admin(test_user_admin)
        
        assert is_admin is True
    
    @pytest.mark.unit
    def test_soldier_role_check(self, test_user_soldier):
        """Test soldier role verification"""
        auth_service = AuthService()
        
        is_admin = auth_service.is_admin(test_user_soldier)
        
        assert is_admin is False
    
    @pytest.mark.unit
    def test_require_admin_decorator(self, test_user_admin, test_user_soldier):
        """Test @require_admin decorator"""
        from services.auth_service import require_admin
        
        @require_admin
        def admin_only_function(user):
            return "Admin access granted"
        
        # Admin should succeed
        result = admin_only_function(test_user_admin)
        assert result == "Admin access granted"
        
        # Soldier should fail
        with pytest.raises(PermissionError):
            admin_only_function(test_user_soldier)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "unit"])
