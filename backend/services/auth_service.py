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
