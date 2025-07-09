import logging
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import statistics

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize sentiment analyzer
vader_analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(text):
    """
    Analyze text sentiment using VADER and return depression score.
    
    The depression score is calculated as:
    - Higher negative sentiment = higher depression score
    - Score ranges from 0-1 (0 = not depressed, 1 = highly depressed)
    
    Args:
        text (str): The text to analyze
        
    Returns:
        float: Depression score between 0 and 1
        str: Sentiment label (POSITIVE, NEGATIVE, NEUTRAL)
    """
    if not text or not text.strip():
        logger.warning("Empty text provided for sentiment analysis")
        return 0.5, "NEUTRAL"  # Neutral score for empty text
    
    # Analyze sentiment using VADER
    sentiment_scores = vader_analyzer.polarity_scores(text)
    logger.info(f"Sentiment scores for text: {sentiment_scores}")
    
    # Get compound score
    compound_score = sentiment_scores["compound"]
    
    # Determine sentiment label based on compound score
    if compound_score >= 0.05:
        sentiment_label = "POSITIVE"
    elif compound_score <= -0.05:
        sentiment_label = "NEGATIVE"
    else:
        sentiment_label = "NEUTRAL"
    
    # Calculate depression score (invert the compound score)
    # VADER compound: -1 (very negative) to +1 (very positive)
    # Depression:      1 (very depressed) to 0 (not depressed)
    
    # Transform compound score from [-1,1] to [0,1] where higher means more depressed
    depression_score = (1 - compound_score) / 2
    
    logger.info(f"Text: '{text[:50]}...' - Label: {sentiment_label}, Depression score: {depression_score:.2f}")
    return depression_score, sentiment_label

def calculate_depression_score(text):
    """
    Calculate a depression score from text.
    
    This function is a wrapper around analyze_sentiment that returns only the score.
    
    Args:
        text (str): The text to analyze
        
    Returns:
        float: Depression score between 0 and 1
    """
    score, _ = analyze_sentiment(text)
    return score

def calculate_average_score(scores):
    """
    Calculate the average of a list of scores.
    
    Args:
        scores (list): List of numeric scores
        
    Returns:
        float: The average score, or 0 if the list is empty
    """
    if not scores:
        return 0
        
    valid_scores = [score for score in scores if score is not None]
    if not valid_scores:
        return 0
    
    # Use mean from statistics for better numerical stability
    return statistics.mean(valid_scores)
