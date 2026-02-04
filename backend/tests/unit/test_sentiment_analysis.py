"""
Unit Tests for Sentiment Analysis Service
Tests VADER NLP sentiment analysis and depression scoring
"""

import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from services.sentiment_analysis_service import (
    analyze_sentiment,
    calculate_peak_weighted_nlp_average
)


class TestSentimentAnalysis:
    """Test sentiment analysis functionality"""
    
    @pytest.mark.unit
    def test_positive_sentiment(self):
        """Test positive text returns low depression score"""
        text = "I am feeling great and happy today! Everything is wonderful."
        score, label = analyze_sentiment(text)
        
        assert score < 0.3, f"Positive text should have low depression score, got {score}"
        assert label == "POSITIVE", f"Expected 'POSITIVE', got '{label}'"
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_negative_sentiment(self):
        """Test negative text returns high depression score"""
        text = "I feel terrible and depressed. I am hopeless and want to die."
        score, label = analyze_sentiment(text)
        
        assert score > 0.7, f"Negative text should have high depression score, got {score}"
        assert label == "NEGATIVE", f"Expected 'NEGATIVE', got '{label}'"
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_neutral_sentiment(self):
        """Test neutral text returns medium depression score"""
        text = "The weather is normal today. I went to work."
        score, label = analyze_sentiment(text)
        
        assert 0.4 <= score <= 0.6, f"Neutral text should have medium score, got {score}"
        assert label == "NEUTRAL", f"Expected 'NEUTRAL', got '{label}'"
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_empty_text(self):
        """Test empty text handling"""
        text = ""
        score, label = analyze_sentiment(text)
        
        # Empty text should default to neutral
        assert 0.4 <= score <= 0.6, f"Empty text should be neutral, got {score}"
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_high_risk_keywords(self):
        """Test high-risk depression keywords"""
        high_risk_texts = [
            "I want to kill myself",
            "Life is not worth living",
            "I feel utterly hopeless and worthless",
            "I wish I was dead"
        ]
        
        for text in high_risk_texts:
            score, label = analyze_sentiment(text)
            assert score >= 0.65, f"High-risk text '{text}' should score >= 0.65, got {score}"
            pytest.assert_depression_score_valid(score)


class TestPeakWeightedAveraging:
    """Test peak-weighted averaging for high-risk responses"""
    
    @pytest.mark.unit
    def test_all_normal_scores(self):
        """Test normal scores without high-risk responses"""
        scores = [0.3, 0.35, 0.4, 0.32]
        weighted = calculate_peak_weighted_nlp_average(scores)
        
        # Should equal simple average (no high-risk scores)
        simple_avg = sum(scores) / len(scores)
        assert abs(weighted - simple_avg) < 0.01, \
            f"Normal scores should use simple average: {simple_avg}, got {weighted}"
    
    @pytest.mark.unit
    def test_with_high_risk_response(self):
        """Test amplification when high-risk response present"""
        scores = [0.3, 0.4, 0.85, 0.35]  # One high-risk (0.85)
        weighted = calculate_peak_weighted_nlp_average(scores)
        simple_avg = sum(scores) / len(scores)  # 0.475
        
        # Weighted should be higher than simple average
        assert weighted > simple_avg, \
            f"Peak weighting should amplify: simple={simple_avg}, weighted={weighted}"
        
        # Should be closer to high-risk score
        assert weighted > 0.55, f"Should amplify high-risk, got {weighted}"
        pytest.assert_depression_score_valid(weighted)
    
    @pytest.mark.unit
    def test_multiple_high_risk_responses(self):
        """Test with multiple high-risk responses"""
        scores = [0.7, 0.8, 0.9, 0.85, 0.3]  # Four high-risk
        weighted = calculate_peak_weighted_nlp_average(scores)
        
        # Should be very high (close to high-risk average)
        high_risk_avg = (0.7 + 0.8 + 0.9 + 0.85) / 4  # 0.8125
        assert weighted > 0.7, f"Multiple high-risk should be very high, got {weighted}"
        pytest.assert_depression_score_valid(weighted)
    
    @pytest.mark.unit
    def test_threshold_boundary(self):
        """Test score exactly at high-risk threshold (0.65)"""
        scores = [0.3, 0.65, 0.4]  # 0.65 is exactly at threshold
        weighted = calculate_peak_weighted_nlp_average(scores)
        
        # 0.65 should trigger peak weighting
        simple_avg = sum(scores) / len(scores)
        assert weighted >= simple_avg, "Threshold score should trigger amplification"
        pytest.assert_depression_score_valid(weighted)
    
    @pytest.mark.unit
    def test_empty_scores_list(self):
        """Test handling of empty scores list"""
        scores = []
        
        # Should handle gracefully (return 0 or raise exception)
        try:
            weighted = calculate_peak_weighted_nlp_average(scores)
            assert weighted == 0.0 or weighted is None
        except (ValueError, ZeroDivisionError):
            # Acceptable to raise exception for empty list
            pass
    
    @pytest.mark.unit
    def test_single_score(self):
        """Test with single score"""
        scores = [0.75]
        weighted = calculate_peak_weighted_nlp_average(scores)
        
        # Single score should return that score
        assert abs(weighted - 0.75) < 0.01
        pytest.assert_depression_score_valid(weighted)
    
    @pytest.mark.unit
    def test_all_high_risk(self):
        """Test when all scores are high-risk"""
        scores = [0.7, 0.75, 0.8, 0.85]
        weighted = calculate_peak_weighted_nlp_average(scores)
        
        # Should be high (all are high-risk)
        assert weighted >= 0.7
        pytest.assert_depression_score_valid(weighted)


class TestSentimentEdgeCases:
    """Test edge cases and error handling"""
    
    @pytest.mark.unit
    def test_very_long_text(self):
        """Test with very long text (>1000 words)"""
        text = "I feel okay. " * 500  # 1000 words
        score, label = analyze_sentiment(text)
        
        # Should handle without error
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_special_characters(self):
        """Test with special characters and emojis"""
        text = "I feel 😢 sad !@#$%^&* today..."
        score, label = analyze_sentiment(text)
        
        # Should handle gracefully
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_mixed_sentiment(self):
        """Test text with mixed positive and negative sentiment"""
        text = "I am happy but also sad and confused about life"
        score, label = analyze_sentiment(text)
        
        # Should be somewhere in middle
        assert 0.3 <= score <= 0.7
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_hindi_text(self):
        """Test with Hindi text (if supported)"""
        text = "मैं बहुत उदास हूँ"  # "I am very sad" in Hindi
        
        try:
            score, label = analyze_sentiment(text)
            # VADER may not work well with Hindi, but shouldn't crash
            pytest.assert_depression_score_valid(score)
        except Exception as e:
            # It's okay if Hindi is not supported
            pytest.skip(f"Hindi not supported: {e}")
    
    @pytest.mark.unit
    def test_all_caps_text(self):
        """Test with ALL CAPS text"""
        text = "I AM FEELING TERRIBLE AND HOPELESS"
        score, label = analyze_sentiment(text)
        
        # VADER handles caps (intensification)
        assert score > 0.7, "ALL CAPS negative should be high score"
        pytest.assert_depression_score_valid(score)
    
    @pytest.mark.unit
    def test_negation_handling(self):
        """Test negation handling (not happy = negative)"""
        text = "I am not happy and not feeling good"
        score, label = analyze_sentiment(text)
        
        # Should detect negation
        assert score > 0.5, "Negation should increase depression score"
        pytest.assert_depression_score_valid(score)


class TestSentimentScoreMapping:
    """Test compound score to depression score mapping"""
    
    @pytest.mark.unit
    def test_compound_negative_one(self):
        """Test compound -1.0 maps to depression 1.0"""
        # Manually calculate: score = 1.0 - ((compound + 1) / 2)
        # compound = -1.0 → score = 1.0 - ((-1 + 1) / 2) = 1.0
        
        text = "I absolutely hate everything and want to die. Worst day ever."
        score, label = analyze_sentiment(text)
        
        # Should be very high (close to 1.0)
        assert score >= 0.8, f"Very negative should be >= 0.8, got {score}"
    
    @pytest.mark.unit
    def test_compound_zero(self):
        """Test compound 0.0 maps to depression 0.5"""
        # compound = 0.0 → score = 1.0 - ((0 + 1) / 2) = 0.5
        
        text = "Today is a day"
        score, label = analyze_sentiment(text)
        
        # Should be around 0.5 (neutral)
        assert 0.4 <= score <= 0.6
    
    @pytest.mark.unit
    def test_compound_positive_one(self):
        """Test compound +1.0 maps to depression 0.0"""
        # compound = 1.0 → score = 1.0 - ((1 + 1) / 2) = 0.0
        
        text = "I absolutely love everything! Best day ever! So happy and excited!"
        score, label = analyze_sentiment(text)
        
        # Should be very low (close to 0.0)
        assert score <= 0.2, f"Very positive should be <= 0.2, got {score}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "unit"])
