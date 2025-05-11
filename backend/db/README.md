# Database Layer

This directory contains the database layer implementation using raw SQL with psycopg2.

## Setup

1. Ensure your `.env` file contains the following variables:
   ```
   DB_NAME=your_database_name
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

2. Initialize the database:
   ```bash
   python init_db.py
   ```

## Usage

### Basic Query Example
```python
from db.connection import execute_query

# Fetch a user by ID
user = execute_query(
    "SELECT * FROM users WHERE user_id = %s",
    (user_id,)
)

# Insert a new user
execute_query(
    """
    INSERT INTO users (force_id, password_hash, user_type, created_at)
    VALUES (%s, %s, %s, %s)
    """,
    (force_id, password_hash, user_type, created_at),
    fetch=False
)
```

### Using Connection Pool
```python
from db.connection import get_connection, release_connection

conn = get_connection()
try:
    with conn.cursor() as cur:
        cur.execute("YOUR SQL QUERY")
    conn.commit()
finally:
    release_connection(conn)
```

## Best Practices

1. Always use parameterized queries to prevent SQL injection
2. Use the `execute_query` helper function for simple queries
3. Use the connection pool directly for complex transactions
4. Always release connections back to the pool
5. Use try/finally blocks to ensure proper cleanup 