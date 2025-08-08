import cv2
import numpy as np
from keras.models import model_from_json
import face_recognition
import logging
import os
from datetime import datetime
from db.connection import get_connection
from typing import Dict, Optional, Tuple, List
from services.model_refresh_service import get_model_refresh_service

class EnhancedEmotionDetectionService:
    def __init__(self):
        self.emotion_dict = {
            0: "Angry", 1: "Disgusted", 2: "Fearful", 
            3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"
        }
        self.emotion_mapping = {
            "Angry": 2, "Disgusted": 2, "Fearful": 2,
            "Happy": -1, "Neutral": 0, "Sad": 3, "Surprised": 1
        }
        
        # Use the model refresh service for face recognition
        self.model_refresh_service = get_model_refresh_service()
        
        self.setup_logging()
        self._load_models()
        
    def setup_logging(self):
        logging.basicConfig(
            filename="enhanced_emotion_detection.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    def _load_models(self):
        """Load emotion detection and face cascade models"""
        try:
            # Load emotion model
            json_file = open('model/emotion_model.json', 'r')
            loaded_model_json = json_file.read()
            json_file.close()
            self.emotion_model = model_from_json(loaded_model_json)
            self.emotion_model.load_weights("model/emotion_model.h5")
            
            # Load face cascade
            self.face_detector = cv2.CascadeClassifier('haarcascades/haarcascade_frontalface_default.xml')
            
            logging.info("Emotion and face detection models loaded successfully")
            
        except Exception as e:
            logging.error(f"Error loading models: {e}")
            raise
    
    def _get_current_face_model(self) -> Tuple[Optional[List], Optional[List]]:
        """Get current face recognition model with automatic refresh"""
        try:
            # Get current model from refresh service
            encodings, force_ids = self.model_refresh_service.get_current_model()
            
            if encodings is None or force_ids is None:
                # Try to refresh the model
                refresh_result = self.model_refresh_service.force_refresh()
                logging.info(f"Face model refresh result: {refresh_result}")
                
                # Get model after refresh
                encodings, force_ids = self.model_refresh_service.get_current_model()
            
            return encodings, force_ids
            
        except Exception as e:
            logging.error(f"Error getting face model: {e}")
            return None, None
    
    def detect_face_and_emotion(self, frame) -> Optional[Tuple[str, str, float, tuple]]:
        """
        Detect face, identify soldier and detect emotion with enhanced error handling
        """
        try:
            # Get current face recognition model
            known_face_encodings, known_force_ids = self._get_current_face_model()
            
            if not known_face_encodings or not known_force_ids:
                logging.warning("No face recognition model available")
                return None
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_detector.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            if len(faces) == 0:
                return None
                
            # Process the largest face found
            x, y, w, h = max(faces, key=lambda face: face[2] * face[3])
            face_coords = (x, y, w, h)
            
            # Get face encoding for recognition
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            face_locations = [(y, x + w, y + h, x)]  # Convert to face_recognition format
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
            
            if not face_encodings:
                logging.debug("No face encodings found")
                return None
                
            face_encoding = face_encodings[0]
            
            # Find matching soldier with improved tolerance and distance calculation
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.6)
            
            if not any(matches):
                # Try with higher tolerance for better recognition
                matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.7)
                
                if not any(matches):
                    logging.debug("Face detected but not recognized as any known soldier")
                    return None
            
            # Get the best match based on face distance
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            
            # Verify the match is within reasonable distance
            if face_distances[best_match_index] > 0.7:  # Too far, likely not a match
                logging.debug(f"Best match distance too high: {face_distances[best_match_index]:.3f}")
                return None
            
            force_id = known_force_ids[best_match_index]
            logging.debug(f"Recognized soldier {force_id} with distance {face_distances[best_match_index]:.3f}")
            
            # Extract and preprocess face region for emotion detection
            roi_gray = gray[y:y+h, x:x+w]
            roi_gray = cv2.resize(roi_gray, (48, 48))
            
            # Enhance contrast using histogram equalization
            roi_gray = cv2.equalizeHist(roi_gray)
            
            # Normalize pixel values
            roi_gray = roi_gray.astype('float')/255.0
            roi_gray = np.expand_dims(roi_gray, axis=0)
            roi_gray = np.expand_dims(roi_gray, axis=-1)
            
            # Get emotion predictions
            emotion_prediction = self.emotion_model.predict(roi_gray, verbose=0)[0]
            
            # Get top 2 emotions and their probabilities
            top_2_idx = np.argsort(emotion_prediction)[-2:][::-1]
            top_2_probs = emotion_prediction[top_2_idx]
            
            # Log probabilities for debugging
            emotions_probs = {self.emotion_dict[i]: f"{emotion_prediction[i]:.3f}" 
                             for i in range(len(emotion_prediction))}
            logging.debug(f"Emotion probabilities for {force_id}: {emotions_probs}")
            
            # Enhanced emotion selection logic
            emotion_label = self._select_emotion_label(emotion_prediction, top_2_idx, top_2_probs)
            
            depression_score = self.emotion_mapping[emotion_label]
            
            logging.info(f"Detected soldier {force_id} with {emotion_label} emotion (score: {depression_score}, confidence: {top_2_probs[0]:.3f})")
            
            return force_id, emotion_label, float(depression_score), face_coords
            
        except Exception as e:
            logging.error(f"Error in detect_face_and_emotion: {e}")
            return None
    
    def _select_emotion_label(self, emotion_prediction: np.ndarray, top_2_idx: np.ndarray, top_2_probs: np.ndarray) -> str:
        """
        Enhanced emotion selection logic with better neutral detection
        """
        try:
            # Get neutral probability
            neutral_prob = emotion_prediction[4]  # Neutral is index 4
            highest_emotion_idx = top_2_idx[0]
            highest_prob = top_2_probs[0]
            
            # If highest emotion is neutral and probability is significant
            if highest_emotion_idx == 4 and highest_prob > 0.4:
                return "Neutral"
            
            # If highest emotion is not neutral but has high confidence
            if highest_emotion_idx != 4 and highest_prob > 0.5:
                return self.emotion_dict[highest_emotion_idx]
            
            # If highest emotion is significantly higher than neutral
            if highest_emotion_idx != 4 and highest_prob > neutral_prob + 0.15:
                return self.emotion_dict[highest_emotion_idx]
            
            # If confidence is low or emotions are similar, default to neutral
            if highest_prob < 0.35:
                return "Neutral"
            
            # Check if second highest is also significant (mixed emotions)
            if len(top_2_probs) > 1 and abs(top_2_probs[0] - top_2_probs[1]) < 0.1:
                # Mixed emotions, lean towards neutral unless strong negative emotions
                if highest_emotion_idx in [0, 1, 2, 5]:  # Angry, Disgusted, Fearful, Sad
                    return self.emotion_dict[highest_emotion_idx]
                else:
                    return "Neutral"
            
            # Default to highest confidence emotion
            return self.emotion_dict[highest_emotion_idx]
            
        except Exception as e:
            logging.error(f"Error in emotion selection: {e}")
            return "Neutral"  # Safe fallback
    
    def store_detection(self, force_id: str, score: float, emotion: str, 
                       face_image: np.ndarray, date: str, monitoring_id: int,
                       is_average: bool = False) -> bool:
        """Store emotion detection data in database with enhanced error handling"""
        conn = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Convert image to bytes for storage
            _, img_encoded = cv2.imencode('.jpg', face_image)
            image_bytes = img_encoded.tobytes()
            
            # Store detection with is_average flag
            cursor.execute("""
                INSERT INTO cctv_detections 
                (monitoring_id, force_id, detection_timestamp, depression_score, emotion, face_image, is_average)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (monitoring_id, force_id, datetime.now(), score, emotion, image_bytes, is_average))
            
            conn.commit()
            logging.debug(f"Stored detection for {force_id}: {emotion} ({score})")
            return True
            
        except Exception as e:
            logging.error(f"Error storing detection: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()
    
    def calculate_daily_scores(self, date: str) -> List[Dict]:
        """Calculate daily depression scores for all detected soldiers"""
        conn = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Get all detections for the day
            cursor.execute("""
                SELECT force_id, AVG(depression_score) as avg_score, COUNT(*) as count
                FROM cctv_detections cd
                JOIN cctv_daily_monitoring cdm ON cd.monitoring_id = cdm.monitoring_id
                WHERE DATE(cdm.date) = %s
                GROUP BY force_id
            """, (date,))
            
            results = []
            for row in cursor.fetchall():
                force_id, avg_score, count = row
                cursor.execute("""
                    INSERT INTO daily_depression_scores 
                    (force_id, date, avg_depression_score, detection_count)
                    VALUES (%s, %s, %s, %s)
                """, (force_id, date, avg_score, count))
                
                results.append({
                    "force_id": force_id,
                    "avg_score": avg_score,
                    "count": count
                })
                
            conn.commit()
            return results
            
        except Exception as e:
            logging.error(f"Error calculating daily scores: {e}")
            if conn:
                conn.rollback()
            return []
        finally:
            if conn:
                conn.close()
    
    def get_model_status(self) -> Dict:
        """Get current status of all models"""
        try:
            # Get face model status from refresh service
            face_model_status = self.model_refresh_service.get_model_status()
            
            # Check emotion model
            emotion_model_loaded = hasattr(self, 'emotion_model') and self.emotion_model is not None
            face_detector_loaded = hasattr(self, 'face_detector') and self.face_detector is not None
            
            return {
                "face_recognition_model": face_model_status,
                "emotion_model_loaded": emotion_model_loaded,
                "face_detector_loaded": face_detector_loaded,
                "system_operational": (
                    face_model_status.get("model_loaded", False) and
                    emotion_model_loaded and
                    face_detector_loaded
                ),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logging.error(f"Error getting model status: {e}")
            return {
                "error": str(e),
                "system_operational": False,
                "timestamp": datetime.now().isoformat()
            }
    
    def refresh_face_model(self) -> Dict:
        """Manually refresh the face recognition model"""
        return self.model_refresh_service.force_refresh()
