"""
Script to analyze all existing responses in the database and update their sentiment scores.
This can be run periodically or as a one-off to ensure all responses have sentiment scores.
"""

import logging
import sys
import os
from db.connection import get_connection
from services.sentiment_analysis_service import analyze_sentiment, calculate_average_score

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_response_sentiment(response_id, answer_text):
    """Update a single response with sentiment analysis"""
    if not answer_text or not answer_text.strip():
        logger.info(f"Response {response_id} has empty text, skipping")
        return None
    
    # Calculate sentiment score
    depression_score, sentiment_label = analyze_sentiment(answer_text)
    
    # Update the record
    db = get_connection()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            UPDATE question_responses
            SET nlp_depression_score = %s, combined_depression_score = %s
            WHERE response_id = %s
        """, (depression_score, depression_score, response_id))
        
        db.commit()
        logger.info(f"Updated response {response_id} with score {depression_score:.2f} ({sentiment_label})")
        return depression_score
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating response {response_id}: {str(e)}")
        return None
    finally:
        cursor.close()
        db.close()

def update_session_scores(session_id):
    """Update a session with average scores from its responses"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Get all nlp scores for this session
        cursor.execute("""
            SELECT nlp_depression_score
            FROM question_responses
            WHERE session_id = %s AND nlp_depression_score IS NOT NULL
        """, (session_id,))
        
        scores = [row[0] for row in cursor.fetchall()]
        
        if not scores:
            logger.info(f"Session {session_id} has no valid scores, skipping")
            return
        
        # Calculate average
        avg_score = calculate_average_score(scores)
        
        # Update session
        cursor.execute("""
            UPDATE weekly_sessions
            SET nlp_avg_score = %s, combined_avg_score = %s
            WHERE session_id = %s
        """, (avg_score, avg_score, session_id))
        
        db.commit()
        logger.info(f"Updated session {session_id} with average score {avg_score:.2f}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating session {session_id}: {str(e)}")
    finally:
        cursor.close()
        db.close()

def process_all_responses():
    """Process all responses that don't have sentiment scores"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Get all responses without sentiment scores
        cursor.execute("""
            SELECT response_id, answer_text, session_id
            FROM question_responses
            WHERE nlp_depression_score IS NULL AND answer_text IS NOT NULL
        """)
        
        responses = cursor.fetchall()
        logger.info(f"Found {len(responses)} responses to process")
        
        # Track which sessions need updating
        sessions_to_update = set()
        
        # Process each response
        for response_id, answer_text, session_id in responses:
            score = update_response_sentiment(response_id, answer_text)
            if score is not None:
                sessions_to_update.add(session_id)
        
        # Update session averages
        logger.info(f"Updating {len(sessions_to_update)} sessions with new averages")
        for session_id in sessions_to_update:
            update_session_scores(session_id)
            
        return len(responses)
    except Exception as e:
        logger.error(f"Error processing responses: {str(e)}")
        return 0
    finally:
        cursor.close()
        db.close()

if __name__ == "__main__":
    logger.info("Starting sentiment analysis batch processing")
    count = process_all_responses()
    logger.info(f"Processed {count} responses. Done!")
