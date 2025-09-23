import cv2
import numpy as np
from keras.models import model_from_json
import face_recognition
import logging
import os
import time
from datetime import datetime
from db.connection import get_connection
from typing import Dict, Optional, Tuple, List
from services.model_refresh_service import get_model_refresh_service

class EnhancedEmotionDetectionService:
    def __init__(self):
        init_start_time = time.time()
        logging.info("[INIT] Initializing EnhancedEmotionDetectionService...")
        
        self.emotion_dict = {
            0: "Angry", 1: "Disgusted", 2: "Fearful", 
            3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"
        }
        # Updated emotion mapping to 0-1 scale to match NLP scoring
        # 0.0 = No depression/positive mental state
        # 1.0 = High depression/negative mental state
        # ENHANCED: More nuanced mapping for better accuracy
        self.emotion_mapping = {
            "Angry": 0.82,      # High depression indicator, often indicates stress
            "Disgusted": 0.72,  # High depression indicator, but less than anger
            "Fearful": 0.78,    # High depression indicator, fear often indicates anxiety/stress
            "Happy": 0.05,      # Very low depression (clearly positive emotion)
            "Neutral": 0.45,    # Slightly below middle to account for subtle positivity
            "Sad": 0.92,        # Highest depression indicator
            "Surprised": 0.25   # Mild positive indicator, surprise can be positive
        }
        
        # Use the model refresh service for face recognition
        self.model_refresh_service = get_model_refresh_service()
        
        # OPTIMIZATION: Use preloaded models for instant access
        self.model_preloader = None
        self._initialize_preloader()
        
        self.setup_logging()
        self._load_models()
        
        init_time = time.time() - init_start_time
        logging.info(f"[SUCCESS] EnhancedEmotionDetectionService initialized in {init_time:.2f}s")
        
    def _initialize_preloader(self):
        """Initialize model preloader service"""
        try:
            from services.model_preloader_service import ModelPreloaderService
            self.model_preloader = ModelPreloaderService.get_instance()
            logging.info("Model preloader service initialized successfully")
        except Exception as e:
            logging.warning(f"Model preloader service not available: {e}")
            self.model_preloader = None
        
    def setup_logging(self):
        logging.basicConfig(
            filename="enhanced_emotion_detection.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    def _load_models(self):
        """Load emotion detection and face cascade models - use preloaded if available"""
        load_start_time = time.time()
        try:
            # OPTIMIZATION: Try to use preloaded models first (check again in case they're ready now)
            if not self.model_preloader:
                # Re-attempt to get model preloader (might be ready now)
                try:
                    from services.model_preloader_service import ModelPreloaderService
                    self.model_preloader = ModelPreloaderService.get_instance()
                    logging.info("[RETRY] Model preloader service now available")
                except Exception as e:
                    logging.debug(f"Model preloader still not available: {e}")
                    self.model_preloader = None
            
            if self.model_preloader and self.model_preloader.is_ready():
                logging.info("[OPTIMIZE] Using preloaded models for instant access")
                
                # Get preloaded models
                self.emotion_model = self.model_preloader.get_emotion_model()
                self.face_detector = self.model_preloader.get_face_cascade()
                
                if self.emotion_model and self.face_detector:
                    load_time = time.time() - load_start_time
                    logging.info(f"[SUCCESS] All preloaded models loaded successfully in {load_time:.3f}s - instant access!")
                    return
                else:
                    logging.warning("[WARNING] Some preloaded models not available, falling back to on-demand loading")
            else:
                if self.model_preloader:
                    logging.info("[WARNING] Model preloader exists but not ready yet, using traditional loading")
                else:
                    logging.info("[WARNING] Model preloader not available, using traditional loading")
            
            # Fallback: Traditional on-demand loading
            logging.info("[LOADING] Loading models on-demand (preloader not ready or failed)")
            self._load_models_traditional()
            
            load_time = time.time() - load_start_time
            logging.info(f"[SUCCESS] Traditional model loading completed in {load_time:.2f}s")
            
        except Exception as e:
            load_time = time.time() - load_start_time
            logging.error(f"[ERROR] Error in model loading after {load_time:.2f}s: {e}")
            # Final fallback
            self._load_models_traditional()
    
    def _load_models_traditional(self):
        """Traditional model loading method (fallback)"""
        try:
            # Get the directory of this script
            current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
            # Load emotion model
            model_json_path = os.path.join(current_dir, 'model', 'emotion_model.json')
            model_h5_path = os.path.join(current_dir, 'model', 'emotion_model.h5')
            cascade_path = os.path.join(current_dir, 'haarcascades', 'haarcascade_frontalface_default.xml')
            
            json_file = open(model_json_path, 'r')
            loaded_model_json = json_file.read()
            json_file.close()
            self.emotion_model = model_from_json(loaded_model_json)
            self.emotion_model.load_weights(model_h5_path)
            
            # Load face cascade
            self.face_detector = cv2.CascadeClassifier(cascade_path)
            
            logging.info("Traditional model loading completed successfully")
            
        except Exception as e:
            logging.error(f"Error loading models: {e}")
            raise
    
    def _get_current_face_model(self) -> Tuple[Optional[List], Optional[List]]:
        """Get current face recognition model - use preloaded if available"""
        try:
            # OPTIMIZATION: Try preloaded models first for instant access
            # Re-check for model preloader in case it's ready now
            if not self.model_preloader:
                try:
                    from services.model_preloader_service import ModelPreloaderService
                    self.model_preloader = ModelPreloaderService.get_instance()
                    logging.info("[RETRY] Model preloader service now available for face recognition")
                except Exception as e:
                    logging.debug(f"Model preloader still not available for face recognition: {e}")
                    self.model_preloader = None
            
            if self.model_preloader and self.model_preloader.is_ready():
                face_encodings = self.model_preloader.get_face_encodings()
                if face_encodings:
                    # Extract encodings and force_ids from preloaded data
                    known_encodings = []
                    known_force_ids = []
                    
                    for force_id, encoding in face_encodings.items():
                        known_encodings.append(encoding)
                        known_force_ids.append(force_id)
                    
                    logging.info(f"[OPTIMIZE] Using preloaded face encodings - instant access! ({len(known_encodings)} soldiers)")
                    return known_encodings, known_force_ids
                else:
                    logging.warning("[WARNING] Preloaded face encodings not available, falling back to disk loading")
            else:
                if self.model_preloader:
                    logging.info("[WARNING] Model preloader exists but not ready for face recognition, loading from disk")
                else:
                    logging.info("[LOADING] Model preloader not available, loading face encodings from disk")
            
            # Fallback: Traditional loading from model refresh service
            logging.info("[LOADING] Loading face encodings from disk (preloader not ready)")
            
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
        FOR CCTV MONITORING - Uses PKL identification
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
            
            # NEW: Check face quality before processing
            face_region = frame[y:y+h, x:x+w]
            face_quality = self._check_face_quality(face_region)
            if face_quality < 0.5:  # Skip low quality faces
                logging.debug(f"Low quality face detected (quality: {face_quality:.2f}), skipping")
                return None
            
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

    def detect_emotion_for_survey(self, frame, authenticated_force_id: str) -> Optional[Tuple[str, str, float, tuple]]:
        """
        NEW SURVEY-SPECIFIC: Simplified emotion detection for authenticated soldiers
        SKIPS PKL IDENTIFICATION - Uses credential-based authentication
        """
        try:
            logging.debug(f"Survey emotion detection for authenticated soldier: {authenticated_force_id}")
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_detector.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            if len(faces) == 0:
                logging.debug("No faces detected in survey frame")
                return None
                
            # Process the largest/best quality face found (assuming it's the authenticated soldier)
            best_face = None
            best_quality = 0
            
            for (x, y, w, h) in faces:
                face_region = frame[y:y+h, x:x+w]
                face_quality = self._check_face_quality(face_region)
                
                if face_quality > best_quality:
                    best_quality = face_quality
                    best_face = (x, y, w, h)
            
            if best_face is None or best_quality < 0.3:  # Lower threshold for survey
                logging.debug(f"No good quality faces found in survey (best quality: {best_quality:.2f})")
                return None
            
            x, y, w, h = best_face
            face_coords = (x, y, w, h)
            
            logging.debug(f"Using face with quality {best_quality:.2f} for survey emotion analysis")
            
            # SKIP PKL MATCHING - Use authenticated force_id directly
            force_id = authenticated_force_id
            
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
            logging.debug(f"Survey emotion probabilities for {force_id}: {emotions_probs}")
            
            # Enhanced emotion selection logic
            emotion_label = self._select_emotion_label(emotion_prediction, top_2_idx, top_2_probs)
            
            depression_score = self.emotion_mapping[emotion_label]
            
            logging.info(f"SURVEY MODE: Detected emotion {emotion_label} for authenticated soldier {force_id} (score: {depression_score}, confidence: {top_2_probs[0]:.3f})")
            
            return force_id, emotion_label, float(depression_score), face_coords
            
        except Exception as e:
            logging.error(f"Error in survey emotion detection: {e}")
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
    
    def _check_face_quality(self, face_image):
        """Simple face quality check to filter out poor quality faces"""
        if face_image is None or face_image.size == 0:
            return 0.0
        
        try:
            # Convert to grayscale for analysis
            if len(face_image.shape) == 3:
                gray_face = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
            else:
                gray_face = face_image
            
            # Check 1: Brightness (should be between 50-200 for good visibility)
            brightness = np.mean(gray_face)
            if brightness < 30:  # Too dark
                brightness_score = 0.1
            elif brightness > 220:  # Too bright/overexposed
                brightness_score = 0.2
            elif 80 <= brightness <= 180:  # Good range
                brightness_score = 1.0
            else:  # Acceptable range
                brightness_score = 0.6
            
            # Check 2: Sharpness (blur detection using Laplacian variance)
            blur_score = cv2.Laplacian(gray_face, cv2.CV_64F).var()
            if blur_score > 500:  # Sharp image
                sharpness_score = 1.0
            elif blur_score > 200:  # Acceptable sharpness
                sharpness_score = 0.7
            elif blur_score > 100:  # Slightly blurry
                sharpness_score = 0.4
            else:  # Too blurry
                sharpness_score = 0.1
            
            # Check 3: Face size (larger faces are generally more reliable)
            face_area = face_image.shape[0] * face_image.shape[1]
            if face_area > 10000:  # Large face (100x100 or bigger)
                size_score = 1.0
            elif face_area > 4900:   # Medium face (70x70)
                size_score = 0.8
            elif face_area > 2500:   # Small face (50x50)
                size_score = 0.5
            else:  # Very small face
                size_score = 0.2
            
            # Combine scores with weights
            final_quality = (brightness_score * 0.4) + (sharpness_score * 0.4) + (size_score * 0.2)
            
            logging.debug(f"Face quality analysis - Brightness: {brightness:.1f} ({brightness_score:.2f}), "
                         f"Blur: {blur_score:.1f} ({sharpness_score:.2f}), "
                         f"Size: {face_area} ({size_score:.2f}), "
                         f"Final: {final_quality:.2f}")
            
            return min(final_quality, 1.0)
            
        except Exception as e:
            logging.error(f"Error in face quality check: {e}")
            return 0.5  # Neutral quality if check fails

    def set_optimal_camera_resolution(self, cap) -> Tuple[int, int]:
        """
        NEW: Auto-detect and set maximum supported camera resolution
        for better face detection and emotion analysis
        """
        try:
            logging.info("Auto-detecting maximum camera resolution...")
            
            # Test common high resolutions (descending order)
            test_resolutions = [
                (1920, 1080),  # Full HD
                (1280, 720),   # HD
                (1024, 768),   # XGA
                (800, 600),    # SVGA
                (640, 480)     # VGA (fallback)
            ]
            
            original_width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            original_height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            
            for width, height in test_resolutions:
                try:
                    # Test if camera supports this resolution
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
                    
                    # Verify actual resolution set by reading a test frame
                    ret, test_frame = cap.read()
                    if ret and test_frame is not None:
                        actual_height, actual_width = test_frame.shape[:2]
                        
                        # Check if resolution is close to requested (within 10% tolerance)
                        width_match = actual_width >= width * 0.9
                        height_match = actual_height >= height * 0.9
                        
                        if width_match and height_match:
                            logging.info(f"MAXIMUM RESOLUTION SET: {actual_width}x{actual_height} "
                                       f"(requested: {width}x{height})")
                            return actual_width, actual_height
                        else:
                            logging.debug(f"Resolution {width}x{height} not fully supported "
                                        f"(got {actual_width}x{actual_height})")
                    
                except Exception as e:
                    logging.debug(f"Failed to test resolution {width}x{height}: {e}")
                    continue
            
            # Fallback: restore original resolution if no high resolution worked
            logging.warning("Could not set high resolution, using camera default")
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, original_width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, original_height)
            return int(original_width), int(original_height)
            
        except Exception as e:
            logging.error(f"Error in auto-resolution detection: {e}")
            # Ultimate fallback
            return 640, 480

    def get_camera_optimal_settings(self) -> Dict:
        """
        NEW: Get optimal camera settings combining maximum resolution with database preferences
        """
        try:
            # Get database settings as preferences
            from services.cctv_monitoring_service import get_camera_settings
            db_settings = get_camera_settings()
            
            logging.info(f"Database camera preferences: {db_settings}")
            
            # For survey mode, prioritize maximum resolution over database settings
            # Database settings act as minimum requirements or overrides
            optimal_settings = {
                'width': max(db_settings.get('width', 640), 1280),  # Minimum 1280 or DB setting
                'height': max(db_settings.get('height', 480), 720), # Minimum 720 or DB setting
                'detection_interval': db_settings.get('detection_interval', 30),
                'fps': 10,  # Fixed for performance
                'use_auto_resolution': True
            }
            
            logging.info(f"Optimal camera settings for survey: {optimal_settings}")
            return optimal_settings
            
        except Exception as e:
            logging.error(f"Error getting optimal camera settings: {e}")
            # Fallback to high-resolution defaults
            return {
                'width': 1280,
                'height': 720,
                'detection_interval': 30,
                'fps': 10,
                'use_auto_resolution': True
            }
