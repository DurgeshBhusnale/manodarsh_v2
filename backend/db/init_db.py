import mysql.connector
from mysql.connector import Error
from pathlib import Path
from dotenv import load_dotenv
import os

def load_env():
    env_path = Path(__file__).resolve().parent.parent / '.env'
    print(f"Loading environment from: {env_path}")
    load_dotenv(dotenv_path=env_path)

def get_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME")
        )
        if conn.is_connected():
            print("✅ Connected to MySQL database")
            return conn
    except Error as e:
        print("❌ Error connecting to MySQL:", e)
        return None

def init_db():
    schema_path = Path(__file__).resolve().parent / 'schema.sql'
    if not schema_path.exists():
        print(f"❌ schema.sql not found at {schema_path}")
        return

    conn = get_connection()
    if not conn:
        return

    try:
        cursor = conn.cursor()
        with open(schema_path, 'r', encoding='utf-8') as f:
            sql_commands = f.read().split(';')

        for command in sql_commands:
            cmd = command.strip()
            if cmd:
                cursor.execute(cmd)

        conn.commit()
        print("✅ Database schema initialized successfully.")
    except Error as e:
        print("❌ Error executing schema:", e)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    load_env()
    init_db()
