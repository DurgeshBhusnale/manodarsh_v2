-- Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_type ENUM('admin', 'soldier') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Questionnaires Table
CREATE TABLE questionnaires (
    questionnaire_id INT AUTO_INCREMENT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status ENUM('Active', 'Inactive') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    questionnaire_id INT NOT NULL,
    question_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(questionnaire_id) ON DELETE CASCADE
);

-- Weekly Sessions Table
CREATE TABLE weekly_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) NOT NULL,
    questionnaire_id INT,
    year INT NOT NULL,
    start_timestamp TIMESTAMP NOT NULL,
    completion_timestamp TIMESTAMP NULL,
    status ENUM('pending', 'completed', 'missed') NOT NULL,
    nlp_avg_score FLOAT,
    image_avg_score FLOAT,
    combined_avg_score FLOAT,
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(questionnaire_id) ON DELETE SET NULL
);

-- Question Responses Table
CREATE TABLE question_responses (
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

-- CCTV Daily Monitoring Table
CREATE TABLE cctv_daily_monitoring (
    monitoring_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('completed', 'partial', 'failed') NOT NULL
);

-- CCTV Detections Table
CREATE TABLE cctv_detections (
    detection_id INT AUTO_INCREMENT PRIMARY KEY,
    monitoring_id INT NOT NULL,
    force_id CHAR(9),
    detection_timestamp TIMESTAMP NOT NULL,
    depression_score FLOAT,
    FOREIGN KEY (monitoring_id) REFERENCES cctv_daily_monitoring(monitoring_id) ON DELETE CASCADE,
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE SET NULL
);

-- Daily Depression Scores Table
CREATE TABLE daily_depression_scores (
    score_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) NOT NULL,
    date DATE NOT NULL,
    avg_depression_score FLOAT,
    detection_count INT,
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE
);

-- Weekly Aggregated Scores Table
CREATE TABLE weekly_aggregated_scores (
    aggregation_id INT AUTO_INCREMENT PRIMARY KEY,
    force_id CHAR(9) NOT NULL,
    year INT NOT NULL,
    questionnaire_score FLOAT,
    cctv_score FLOAT,
    combined_weekly_score FLOAT,
    risk_level ENUM('low', 'medium', 'high', 'critical'),
    FOREIGN KEY (force_id) REFERENCES users(force_id) ON DELETE CASCADE
);

-- System Settings Table
CREATE TABLE system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);
