import cv2
import numpy as np
from keras.models import model_from_json
import face_recognition
import logging
import os
import pickle
from datetime import datetime
from db.connection import get_connection
from typing import Dict, Optional, Tuple, List

class EmotionDetectionService:
    def __init__(self):
        self.emotion_dict = {
            0: "Angry", 1: "Disgusted", 2: "Fearful", 
            3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"
        }
        self.emotion_mapping = {
            "Angry": 2, "Disgusted": 2, "Fearful": 2,
            "Happy": -1, "Neutral": 0, "Sad": 3, "Surprised": 1
        }
        self.setup_logging()
        self._load_models()
        
    def setup_logging(self):
        logging.basicConfig(
            filename="emotion_detection.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        
    def _load_models(self):
        try:
            # Load emotion model
            json_file = open('model/emotion_model.json', 'r')
            loaded_model_json = json_file.read()
            json_file.close()
            self.emotion_model = model_from_json(loaded_model_json)
            self.emotion_model.load_weights("model/emotion_model.h5")
            
            # Load face recognition model
            model_path = os.path.join('storage', 'models', 'face_recognition_model.pkl')
            with open(model_path, "rb") as f:
                self.known_face_encodings, self.known_force_ids = pickle.load(f)
            
            # Load face cascade
            self.face_detector = cv2.CascadeClassifier('haarcascades/haarcascade_frontalface_default.xml')
            
            logging.info("All models loaded successfully")
        except Exception as e:
            logging.error(f"Error loading models: {e}")
            raise
            
    def detect_face_and_emotion(self, frame) -> Optional[Tuple[str, str, float, tuple]]:
        """Detect face, identify soldier and detect emotion"""
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
        
        # Get face encoding
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = [(y, x + w, y + h, x)]  # Convert to face_recognition format
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        if not face_encodings:
            return None
            
        face_encoding = face_encodings[0]
        
        # Find matching soldier
        matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding, tolerance=0.6)
        if not any(matches):
            logging.warning("Face detected but not recognized as any known soldier")
            return None
            
        force_id = next(fid for match, fid in zip(matches, self.known_force_ids) if match)
          # Detect emotion
        # Extract and preprocess face region
        roi_gray = gray[y:y+h, x:x+w]
        roi_gray = cv2.resize(roi_gray, (48, 48))
        
        # Enhance contrast using histogram equalization
        roi_gray = cv2.equalizeHist(roi_gray)
        
        # Normalize pixel values
        roi_gray = roi_gray.astype('float')/255.0
        roi_gray = np.expand_dims(roi_gray, axis=0)
        roi_gray = np.expand_dims(roi_gray, axis=-1)
        
        # Get emotion predictions
        emotion_prediction = self.emotion_model.predict(roi_gray)[0]
        
        # Get top 2 emotions and their probabilities
        top_2_idx = np.argsort(emotion_prediction)[-2:][::-1]
        top_2_probs = emotion_prediction[top_2_idx]
        
        # Log probabilities for debugging
        emotions_probs = {self.emotion_dict[i]: f"{emotion_prediction[i]:.2f}" 
                         for i in range(len(emotion_prediction))}
        logging.debug(f"Emotion probabilities: {emotions_probs}")
        
        # Only choose non-neutral if probability is significantly higher
        if top_2_idx[0] != 4 and top_2_probs[0] > 0.4:  # If highest non-neutral emotion > 40%
            emotion_label = self.emotion_dict[top_2_idx[0]]
        else:
            # Check if second highest is significantly higher than neutral
            neutral_prob = emotion_prediction[4]
            if top_2_probs[0] > neutral_prob + 0.2:  # At least 20% higher than neutral
                emotion_label = self.emotion_dict[top_2_idx[0]]
            else:
                emotion_label = "Neutral"
        
        depression_score = self.emotion_mapping[emotion_label]
        
        logging.info(f"Detected soldier {force_id} with {emotion_label} emotion (score: {depression_score})")
        return force_id, emotion_label, float(depression_score), face_coords
            
    def store_detection(self, force_id: str, score: float, emotion: str, 
                       face_image: np.ndarray, date: str, monitoring_id: int,
                       is_average: bool = False) -> bool:
        """Store emotion detection data in database"""
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
