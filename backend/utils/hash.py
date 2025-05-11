import bcrypt

def check_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify if a plain password matches its hashed version
    
    Args:
        plain_password (str): The password to verify
        hashed_password (str): The stored hashed password from MySQL
        
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        print(f"🔐 Checking password...")  # Debug log
        
        # Convert strings to bytes for bcrypt
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        
        print(f"Plain password (bytes): {plain_password}")  # Debug log
        print(f"Hashed password (bytes): {hashed_password}")  # Debug log
            
        result = bcrypt.checkpw(plain_password, hashed_password)
        print(f"Password check result: {result}")  # Debug log
        return result
        
    except Exception as e:
        print(f"❌ Error checking password: {str(e)}")  # Debug log
        return False
