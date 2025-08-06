-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_type ENUM('admin', 'soldier') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Questionnaires Table
CREATE TABLE IF NOT EXISTS questionnaires (
    questionnaire_id INT AUTO_INCREMENT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status ENUM('Active', 'Inactive') NOT NULL,
    total_questions INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    questionnaire_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_text_hindi TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(questionnaire_id) ON DELETE CASCADE
);

-- Weekly Sessions Table
CREATE TABLE IF NOT EXISTS weekly_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) NOT NULL,
    questionnaire_id INT,
    year INT NOT NULL,
    start_timestamp TIMESTAMP NOT NULL,
    completion_timestamp TIMESTAMP NULL,
    status ENUM('pending', 'completed', 'missed') NOT NULL,
    nlp_avg_score FLOAT,
    image_avg_score FLOAT,
    mental_state_score FLOAT,
    combined_avg_score FLOAT,
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(questionnaire_id) ON DELETE SET NULL
);

-- Question Responses Table
CREATE TABLE IF NOT EXISTS question_responses (
    response_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_text TEXT,
    nlp_depression_score FLOAT,
    image_depression_score FLOAT,
    combined_depression_score FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES weekly_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

-- Mental State Responses Table (for the universal mental state question)
CREATE TABLE IF NOT EXISTS mental_state_responses (
    mental_state_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    mental_state_rating INT NOT NULL CHECK (mental_state_rating BETWEEN 1 AND 7),
    mental_state_emoji VARCHAR(10) NOT NULL,
    mental_state_text_en VARCHAR(50) NOT NULL,
    mental_state_text_hi VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES weekly_sessions(session_id) ON DELETE CASCADE
);

-- CCTV Daily Monitoring Table
CREATE TABLE IF NOT EXISTS cctv_daily_monitoring (
    monitoring_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NULL,
    status ENUM('completed', 'partial', 'failed') NOT NULL
);

-- CCTV Detections Table
CREATE TABLE IF NOT EXISTS cctv_detections (
    detection_id INT AUTO_INCREMENT PRIMARY KEY,
    monitoring_id INT NOT NULL,
    force_id CHAR(9),
    detection_timestamp TIMESTAMP NOT NULL,
    depression_score FLOAT,
    FOREIGN KEY (monitoring_id) REFERENCES cctv_daily_monitoring(monitoring_id) ON DELETE CASCADE,
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE SET NULL
);

-- Daily Depression Scores Table
CREATE TABLE IF NOT EXISTS daily_depression_scores (
    score_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) NOT NULL,
    date DATE NOT NULL,
    avg_depression_score FLOAT,
    detection_count INT,
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE
);

-- Weekly Aggregated Scores Table
CREATE TABLE IF NOT EXISTS weekly_aggregated_scores (
    aggregation_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) NOT NULL,
    year INT NOT NULL,
    questionnaire_score FLOAT,
    cctv_score FLOAT,
    combined_weekly_score FLOAT,
    risk_level ENUM('low', 'medium', 'high', 'critical'),
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE
);

-- Trained Soldiers Table
CREATE TABLE IF NOT EXISTS trained_soldiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) NOT NULL,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50),
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    is_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    notification_type ENUM('email', 'sms', 'in_app') NOT NULL,
    event_type ENUM('critical_alert', 'high_risk', 'survey_completed', 'system_update') NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id, preference_key)
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9),
    notification_type ENUM('CRITICAL_ALERT', 'HIGH_RISK', 'SURVEY_COMPLETED', 'SYSTEM_UPDATE', 'REMINDER') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    metadata JSON,
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE,
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_priority (priority),
    INDEX idx_notifications_created (created_at)
);
