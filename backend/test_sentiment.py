"""
Test script for sentiment analysis service
"""

from services.sentiment_analysis_service import analyze_sentiment

# Test sentences with expected sentiment categories
test_sentences = [
    # Positive statements
    ("I am feeling very happy today", "POSITIVE"),
    ("Today was a great day", "POSITIVE"),
    ("I love my job and colleagues", "POSITIVE"),
    
    # Neutral statements
    ("I am feeling okay", "NEUTRAL"),
    ("Today was just another day", "NEUTRAL"),
    ("The weather is neither good nor bad", "NEUTRAL"),
    
    # Negative statements (higher depression score)
    ("I am feeling very sad and lonely", "NEGATIVE"),
    ("Nothing seems to matter anymore", "NEGATIVE"),
    ("I feel hopeless and worthless", "NEGATIVE"),
    ("I am having thoughts of harming myself", "NEGATIVE")
]

def run_tests():
    print("Testing sentiment analysis service:")
    print("-" * 60)
    print(f"{'Text':<40} | {'Label':<10} | {'Expected':<10} | {'Score':<10}")
    print("-" * 60)
    
    for text, expected_label in test_sentences:
        score, label = analyze_sentiment(text)
        match = "✓" if label == expected_label else "✗"
        print(f"{text[:37]+'...':<40} | {label:<10} | {expected_label:<10} | {score:.2f} {match}")
    
    print("-" * 60)
    print("Note: Higher depression scores (closer to 1) indicate more negative sentiment")

if __name__ == "__main__":
    run_tests()
