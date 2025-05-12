import bcrypt
from db.connection import get_connection
from utils.hash import check_password
from typing import Optional, Dict

class AuthService:
    def verify_login(self, force_id: str, password: str) -> Optional[Dict]:
        """
        Verify user login credentials and return user info if valid
        
        Args:
            force_id (str): The 9-digit force ID
            password (str): The plain text password to verify
            
        Returns:
            dict: User information if credentials are valid
            None: If credentials are invalid
        """
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)  # Return results as dictionaries
            
            # Query to fetch user by force_id with correct column name (user_type)
            cursor.execute(
                """
                SELECT force_id, password_hash, user_type 
                FROM users 
                WHERE force_id = %s
                """, 
                (force_id,)
            )
            
            user = cursor.fetchone()
            
            if not user:
                return None
                
            stored_hash = user['password_hash']
            
            if check_password(password, stored_hash):
                return {
                    'force_id': user['force_id'],
                    'role': user['user_type']  # Changed from role to user_type
                }
            
            return None
            
        except Exception as e:
            raise e
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
                
    def register_soldier(self, force_id: str, password: str) -> Dict:
        """
        Register a new soldier in the system
        
        Args:
            force_id (str): The 9-digit force ID
            password (str): The plain text password to hash and store
            
        Returns:
            dict: New user information
        """
        conn = None
        cursor = None
        try:
            # Hash the password
            password_bytes = password.encode('utf-8')
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password_bytes, salt)
            
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Check if force_id already exists
            cursor.execute(
                "SELECT force_id FROM users WHERE force_id = %s",
                (force_id,)
            )
            
            if cursor.fetchone():
                raise ValueError("Force ID already exists")
            
            # Insert new soldier
            cursor.execute(
                """
                INSERT INTO users (force_id, password_hash, user_type)
                VALUES (%s, %s, %s)
                """,
                (force_id, hashed.decode('utf-8'), 'soldier')
            )
            
            conn.commit()
            
            return {
                'force_id': force_id,
                'role': 'soldier'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
