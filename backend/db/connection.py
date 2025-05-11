import os
import mysql.connector
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / '.env'
load_dotenv(env_path)

# DB parameters
DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = int(os.getenv('DB_PORT', 3306))

print(f"Loading environment from: {env_path}")
print(f"Connecting to database: {DB_NAME} on {DB_HOST}:{DB_PORT} as {DB_USER}")

def get_connection():
    """
    Returns a new MySQL connection.
    """
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return connection
    except mysql.connector.Error as e:
        print("❌ Error getting MySQL connection:", e)
        raise e

def release_connection(conn):
    """
    Close the MySQL connection.
    """
    if conn.is_connected():
        conn.close()

def execute_query(query, params=None, fetch=True):
    """
    Execute a SQL query with optional params and fetch results.

    Args:
        query (str): SQL statement
        params (tuple, optional): Parameters for prepared statement
        fetch (bool): Return query result if True

    Returns:
        list or None
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        if fetch:
            return cursor.fetchall()
        conn.commit()
    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        print("❌ Query execution error:", e)
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_connection(conn)
