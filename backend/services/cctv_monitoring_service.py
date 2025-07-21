import cv2
import logging
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from collections import deque, defaultdict
from statistics import mean
from db.connection import get_connection
from services.emotion_detection_service import EmotionDetectionService

# Global camera lock to prevent concurrent access
_camera_lock = threading.Lock()

class CCTVMonitoringService:
    def __init__(self):
        self.emotion_service = None  # Lazy initialization
        self.monitoring_id = None
        self.cap = None
        self.is_monitoring = False
        self.monitor_thread = None
        self.detection_buffer = {}  # Buffer for storing detections for 3-second averaging
        self.last_average_time = {}  # Track last average calculation time per force_id
        self.AVERAGE_INTERVAL = 3  # Calculate average every 3 seconds
        
        # Development settings - easy toggle for camera feed display
        self.SHOW_CAMERA_FEED = True  # Set to False to hide camera feed in production
        self.DEVELOPMENT_MODE = True  # Set to False for production
        
        self.setup_logging()
        
    def setup_logging(self):
        logging.basicConfig(
            filename="cctv_monitoring.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        
    def _find_available_camera(self):
        """Try different camera indices to find an available camera"""
        # Use global lock to prevent concurrent camera access
        with _camera_lock:
            # Add small delay to prevent rapid successive calls
            time.sleep(0.1)
            
            # Camera detection order: external webcam first, then built-in
            camera_indices = [1, 0]  # 1 = external, 0 = built-in
            camera_names = ["external webcam", "built-in camera"]
            
            for idx, name in zip(camera_indices, camera_names):
                logging.info(f"Trying {name} (index {idx})...")
                try:
                    # Force DirectShow backend to avoid MSMF conflicts
                    cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                    
                    if cap.isOpened():
                        # Set properties before testing to ensure camera is properly configured
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        cap.set(cv2.CAP_PROP_FPS, 15)
                        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        
                        # Wait a moment for camera to initialize
                        time.sleep(0.5)
                        
                        # Test if camera actually works by reading a frame multiple times
                        test_success = False
                        for test_attempt in range(3):
                            ret, frame = cap.read()
                            if ret and frame is not None:
                                logging.info(f"Successfully connected to {name} (index {idx}) on test attempt {test_attempt + 1}")
                                test_success = True
                                break
                            else:
                                logging.warning(f"Test attempt {test_attempt + 1} failed for {name}: ret={ret}, frame_valid={frame is not None}")
                                time.sleep(0.3)
                        
                        if test_success:
                            return cap
                        else:
                            logging.warning(f"{name} opened but failed all frame read tests")
                            cap.release()
                    else:
                        logging.info(f"{name} not available (index {idx})")
                except Exception as e:
                    logging.warning(f"Error accessing {name}: {str(e)}")
                    if 'cap' in locals():
                        cap.release()
            
            # Try additional camera indices (some systems have cameras at higher indices)
            logging.info("Trying additional camera indices...")
            for idx in range(2, 5):  # Try indices 2, 3, 4
                logging.info(f"Trying camera index {idx}...")
                try:
                    # Force DirectShow backend to avoid MSMF conflicts
                    cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                    if cap.isOpened():
                        # Set properties before testing
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        cap.set(cv2.CAP_PROP_FPS, 15)
                        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        
                        # Wait a moment for camera to initialize
                        time.sleep(0.5)
                        
                        # Test multiple times
                        test_success = False
                        for test_attempt in range(3):
                            ret, frame = cap.read()
                            if ret and frame is not None:
                                logging.info(f"Successfully connected to camera at index {idx} on test attempt {test_attempt + 1}")
                                test_success = True
                                break
                            else:
                                time.sleep(0.3)
                        
                        if test_success:
                            return cap
                        else:
                            cap.release()
                    else:
                        logging.info(f"Camera at index {idx} not available")
                except Exception as e:
                    logging.warning(f"Error accessing camera index {idx}: {str(e)}")
                    if 'cap' in locals():
                        cap.release()
            
            # If no camera is available, return None
            logging.error("No cameras available on any index")
            return None

    def _process_frames_continuously(self, date: str):
        """Continuously process frames in a separate thread"""
        logging.info("Starting continuous frame processing")
        while self.is_monitoring:
            try:
                result = self.process_frame()
                if result:
                    logging.info(f"Processed frame: {result}")
                time.sleep(0.1)  # Small delay to prevent excessive CPU usage
            except Exception as e:
                logging.error(f"Error in continuous processing: {e}")
                
        logging.info("Stopped continuous frame processing")
        self.is_monitoring = False

    def start_monitoring(self, date: str) -> bool:
        """Start a new monitoring session"""
        conn = None
        
        if self.is_monitoring:
            logging.warning("Monitoring is already running")
            return False
            
        # Ensure camera is released if it was previously open
        if self.cap:
            logging.info("Releasing previously open camera...")
            self.cap.release()
            cv2.destroyAllWindows()
            self.cap = None
            
        try:
            # Initialize video capture with available camera
            logging.info("Initializing video capture...")
            self.cap = self._find_available_camera()
            if not self.cap:
                raise Exception("Could not find any available camera - please connect a camera")
            
            logging.info("Connecting to database...")
            # Get database connection
            conn = get_connection()
            cursor = conn.cursor()
            
            try:
                logging.info(f"Creating monitoring session for date: {date}")
                # Set end_time to 23:59:59 initially
                cursor.execute("""
                    INSERT INTO cctv_daily_monitoring (date, start_time, end_time, status)
                    VALUES (%s, %s, '23:59:59', 'partial')
                """, (date, datetime.now().time()))
                
                # Get the last inserted ID
                cursor.execute("SELECT LAST_INSERT_ID()")
                self.monitoring_id = cursor.fetchone()[0]
                conn.commit()
                
                logging.info("Starting monitoring thread...")
                # Start the monitoring thread
                self.is_monitoring = True
                self.monitor_thread = threading.Thread(
                    target=self._process_frames_continuously,
                    args=(date,),
                    daemon=True
                )
                self.monitor_thread.start()
                
                logging.info(f"Successfully started monitoring session {self.monitoring_id}")
                return True
                
            except Exception as e:
                logging.error(f"Database error in start_monitoring: {str(e)}")
                if conn:
                    conn.rollback()
                raise Exception(f"Database error: {str(e)}")
        except Exception as e:
            error_msg = f"Failed to start monitoring: {str(e)}"
            logging.error(error_msg)
            # Clean up resources
            if self.cap:
                self.cap.release()
                cv2.destroyAllWindows()
                self.cap = None
                logging.info("Released camera capture device")
            self.is_monitoring = False
            self.monitoring_id = None
            raise Exception(error_msg)
        finally:
            if conn:
                conn.close()
                logging.info("Closed database connection")
                
    def stop_monitoring(self):
        """Stop monitoring session and calculate final daily averages"""
        if not self.is_monitoring:
            return False

        self.is_monitoring = False

        # Stop video capture
        if self.cap and self.cap.isOpened():
            self.cap.release()
        cv2.destroyAllWindows()

        # Calculate and store daily averages for each soldier
        try:
            conn = get_connection()
            cursor = conn.cursor()

            try:
                # Get all unique force_ids from this monitoring session
                cursor.execute("""
                    SELECT DISTINCT force_id 
                    FROM cctv_detections 
                    WHERE monitoring_id = %s
                """, (self.monitoring_id,))
                force_ids = [row[0] for row in cursor.fetchall()]

                monitoring_date = datetime.now().date()

                # For each soldier, calculate their daily average
                for force_id in force_ids:
                    # Calculate average from all detections today for this soldier
                    cursor.execute("""
                        SELECT AVG(depression_score) 
                        FROM cctv_detections 
                        WHERE force_id = %s 
                        AND DATE(detection_timestamp) = %s
                    """, (force_id, monitoring_date))
                    
                    daily_avg = cursor.fetchone()[0]
                    if daily_avg is not None:
                        # Check if an entry already exists for this soldier today
                        cursor.execute("""
                            SELECT id FROM daily_depression_scores 
                            WHERE force_id = %s AND score_date = %s
                        """, (force_id, monitoring_date))
                        
                        existing_entry = cursor.fetchone()
                        
                        if existing_entry:
                            # Update existing entry
                            cursor.execute("""
                                UPDATE daily_depression_scores 
                                SET depression_score = %s 
                                WHERE force_id = %s AND score_date = %s
                            """, (daily_avg, force_id, monitoring_date))
                        else:
                            # Insert new entry
                            cursor.execute("""
                                INSERT INTO daily_depression_scores 
                                (force_id, score_date, depression_score)
                                VALUES (%s, %s, %s)
                            """, (force_id, monitoring_date, daily_avg))
                        
                        logging.info(f"Stored daily average for soldier {force_id}: {daily_avg:.2f}")

                conn.commit()
                logging.info("All daily averages calculated and stored successfully")

            except Exception as e:
                logging.error(f"Database error in stop_monitoring: {str(e)}")
                if conn:
                    conn.rollback()
                raise

        except Exception as e:
            logging.error(f"Error in stop_monitoring: {str(e)}")
            return False

        finally:
            if conn:
                conn.close()

        # Clear monitoring state
        self.monitoring_id = None
        self.detection_buffer = defaultdict(list)
        self.last_average_time = defaultdict(float)
        self.emotion_service = None  # Clear emotion service to free memory

        return True

    def process_frame(self) -> Optional[Dict]:
        """Process a single frame from the video feed"""
        if not self.cap or not self.monitoring_id:
            return None

        ret, frame = self.cap.read()
        if not ret:
            return None

        # Initialize emotion service if needed
        if not self.emotion_service:
            self.emotion_service = EmotionDetectionService()

        # Create a copy for display
        display_frame = frame.copy()
        
        # Resize frame for faster processing
        frame = cv2.resize(frame, (1280, 720))
        display_frame = cv2.resize(display_frame, (1280, 720))

        # Detect face and emotion
        result = self.emotion_service.detect_face_and_emotion(frame)
        if result:
            force_id, emotion, score, face_coords = result
            logging.info(f"Detected soldier {force_id} with emotion {emotion} and score {score}")
            
            # Draw rectangle around face
            x, y, w, h = face_coords
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(display_frame, f"ID: {force_id}", (x, y-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            cv2.putText(display_frame, f"Emotion: {emotion}", (x, y+h+25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            
            # Show the frame
            cv2.imshow('CCTV Monitoring', display_frame)
            cv2.waitKey(1)  # Update window, wait 1ms

            current_time = time.time()

            # Initialize buffer if needed
            if force_id not in self.detection_buffer:
                self.detection_buffer[force_id] = []
                self.last_average_time[force_id] = current_time

            # Add detection to buffer
            self.detection_buffer[force_id].append({
                'score': score,
                'emotion': emotion,
                'timestamp': current_time,
                'face_coords': face_coords
            })

            # Calculate and store average if 3 seconds have passed
            if current_time - self.last_average_time[force_id] >= self.AVERAGE_INTERVAL:
                self._calculate_and_store_average(force_id, current_time)

            return {
                "force_id": force_id,
                "emotion": emotion,
                "score": score
            }
        else:
            # Show frame even when no face is detected
            cv2.imshow('CCTV Monitoring', display_frame)
            cv2.waitKey(1)
            return None

    def _calculate_and_store_average(self, force_id: str, current_time: float):
        """Calculate and store 3-second average for a soldier in cctv_detections"""
        buffer = self.detection_buffer[force_id]
        if not buffer:
            return

        # Calculate average score
        avg_score = sum(d['score'] for d in buffer) / len(buffer)
        
        # Get most frequent emotion
        emotions = [d['emotion'] for d in buffer]
        most_common_emotion = max(set(emotions), key=emotions.count)

        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            try:
                # Store only in cctv_detections table
                cursor.execute("""
                    INSERT INTO cctv_detections 
                    (monitoring_id, force_id, detection_timestamp, depression_score)
                    VALUES (%s, %s, %s, %s)
                """, (self.monitoring_id, force_id, datetime.now(), avg_score))
                
                conn.commit()
                logging.info(f"Stored detection for soldier {force_id}: score={avg_score:.2f}, emotion={most_common_emotion}")
                
            except Exception as e:
                logging.error(f"Database error in _calculate_and_store_average: {str(e)}")
                if conn:
                    conn.rollback()
                raise
                
        except Exception as e:
            logging.error(f"Error in _calculate_and_store_average: {str(e)}")
            return
            
        finally:
            if conn:
                conn.close()

        # Clear buffer and update last average time
        self.detection_buffer[force_id] = []
        self.last_average_time[force_id] = current_time

    def calculate_daily_scores(self, date: str) -> bool:
        """Calculate daily scores for all soldiers"""
        try:
            # Initialize emotion service if needed
            if not self.emotion_service:
                self.emotion_service = EmotionDetectionService()
                
            results = self.emotion_service.calculate_daily_scores(date)
            logging.info(f"Calculated daily scores for {len(results)} soldiers on {date}")
            return True
        except Exception as e:
            logging.error(f"Error calculating daily scores: {e}")
            return False

    def start_survey_monitoring(self, force_id: str) -> bool:
        """Start emotion detection monitoring during survey for a specific soldier"""
        try:
            logging.info(f"Starting survey monitoring for soldier {force_id}")
            
            # Initialize emotion service only when needed (lazy initialization)
            if not self.emotion_service:
                logging.info("Initializing EmotionDetectionService...")
                self.emotion_service = EmotionDetectionService()
                logging.info("EmotionDetectionService initialized successfully")
            
            # Initialize camera if not already done
            if not self.cap:
                logging.info("Initializing camera for survey monitoring...")
                self.cap = self._find_available_camera()
                if not self.cap:
                    error_msg = "No camera available. Please connect a camera or check if camera is being used by another application."
                    logging.error(error_msg)
                    raise Exception(error_msg)
                logging.info("Camera initialized successfully")
            else:
                logging.info("Using existing camera connection")
            
            # Test camera functionality with retries
            logging.info("Testing camera functionality...")
            max_retries = 3
            test_success = False
            
            for attempt in range(max_retries):
                try:
                    ret, test_frame = self.cap.read()
                    if ret and test_frame is not None:
                        logging.info(f"Camera test successful on attempt {attempt + 1}")
                        test_success = True
                        break
                    else:
                        logging.warning(f"Camera test failed on attempt {attempt + 1}: ret={ret}, frame_valid={test_frame is not None}")
                        if attempt < max_retries - 1:
                            time.sleep(1)  # Wait before retry
                except Exception as read_error:
                    logging.warning(f"Camera read error on attempt {attempt + 1}: {read_error}")
                    if attempt < max_retries - 1:
                        time.sleep(1)
            
            if not test_success:
                # Try reinitializing the camera
                logging.warning("Camera test failed, attempting to reinitialize...")
                if self.cap:
                    self.cap.release()
                    time.sleep(2)  # Wait longer for camera to be released
                
                # Try again with a fresh camera connection
                self.cap = self._find_available_camera()
                if not self.cap:
                    error_msg = "Camera reinitialization failed. Please check camera drivers or restart the application."
                    logging.error(error_msg)
                    raise Exception(error_msg)
                
                # Test the reinitialized camera
                ret, test_frame = self.cap.read()
                if not ret or test_frame is None:
                    error_msg = "Camera connected but cannot read frames after reinitialization. Please check camera drivers or restart the application."
                    logging.error(error_msg)
                    if self.cap:
                        self.cap.release()
                    self.cap = None
                    raise Exception(error_msg)
                
                logging.info("Camera reinitialization successful")
            
            # Initialize survey monitoring state
            self.survey_force_id = force_id
            self.survey_detections = []
            self.survey_monitoring = True
            self.survey_thread_active = True
            
            # Start background monitoring thread
            self.survey_thread = threading.Thread(
                target=self._process_survey_frames_continuously,
                args=(force_id,),
                daemon=True
            )
            self.survey_thread.start()
            
            logging.info(f"Successfully started survey emotion monitoring for soldier {force_id}")
            return True
            
        except Exception as e:
            error_msg = f"Failed to start survey monitoring: {str(e)}"
            logging.error(error_msg)
            self.survey_monitoring = False
            # Don't release camera here - only release on stop_survey_monitoring
            raise Exception(error_msg)

    def _process_survey_frames_continuously(self, force_id: str):
        """Continuously process frames during survey in background thread"""
        logging.info(f"Starting continuous survey frame processing for soldier {force_id}")
        
        frame_count = 0
        detection_interval = 30  # Process every 30th frame (about 3 seconds at 10 FPS)
        consecutive_failures = 0
        max_failures = 5  # Maximum consecutive failures before stopping
        
        try:
            while self.survey_thread_active and self.survey_monitoring:
                try:
                    # Check if camera is still valid
                    if not self.cap or not self.cap.isOpened():
                        logging.warning("Camera not available during survey monitoring")
                        consecutive_failures += 1
                        if consecutive_failures >= max_failures:
                            logging.error(f"Camera failed {max_failures} times consecutively. Stopping survey monitoring.")
                            break
                        time.sleep(1)
                        continue
                    
                    # Reset failure counter on successful camera access
                    if consecutive_failures > 0:
                        consecutive_failures = 0
                        logging.info("Camera access restored")
                        
                    ret, frame = self.cap.read()
                    if not ret or frame is None:
                        logging.warning("Failed to read frame during survey")
                        time.sleep(0.1)
                        continue
                    
                    frame_count += 1
                    
                    # Process only every Nth frame to reduce computational load
                    if frame_count % detection_interval == 0:
                        # Ensure emotion service is available
                        if not self.emotion_service:
                            logging.warning("EmotionDetectionService not available in background thread")
                            continue
                        
                        try:
                            result = self.emotion_service.detect_face_and_emotion(frame)
                            if result:
                                detected_force_id, emotion, score, face_coords = result
                                
                                # Log both expected and detected force IDs for debugging
                                logging.info(f"Survey monitoring - Expected: {force_id}, Detected: {detected_force_id}")
                                
                                # For development: accept any detected face during survey
                                # TODO: In production, this should match exactly for security
                                if True:  # detected_force_id == force_id:  # Relaxed for development
                                    detection_data = {
                                        'timestamp': datetime.now().isoformat(),
                                        'emotion': emotion,
                                        'score': score,
                                        'force_id': force_id,  # Use the survey force_id, not detected one
                                        'detected_force_id': detected_force_id,  # Keep detected for debugging
                                        'note': 'face_id_mismatch' if detected_force_id != force_id else 'matched'
                                    }
                                    
                                    # Store in survey detections buffer
                                    if not hasattr(self, 'survey_detections'):
                                        self.survey_detections = []
                                    self.survey_detections.append(detection_data)
                                    
                                    if detected_force_id != force_id:
                                        logging.warning(f"Face ID mismatch - Survey: {force_id}, Detected: {detected_force_id}")
                                    else:
                                        logging.info(f"Face ID matched - Survey detection successful")
                                    
                                    logging.info(f"Survey detection: {force_id} (detected as {detected_force_id}) - {emotion} ({score:.2f})")
                                else:
                                    logging.warning(f"Detected soldier {detected_force_id} but survey is for {force_id} - ignoring")
                        except Exception as detection_error:
                            logging.error(f"Error in emotion detection: {detection_error}")
                            # Continue the loop even if detection fails
                            continue
                    
                    # Small delay to prevent excessive CPU usage
                    time.sleep(0.1)
                    
                except Exception as e:
                    logging.error(f"Error in survey frame processing loop: {e}")
                    consecutive_failures += 1
                    if consecutive_failures >= max_failures:
                        logging.error(f"Too many consecutive errors ({max_failures}). Stopping survey monitoring.")
                        break
                    time.sleep(1)
                    
        except Exception as e:
            logging.error(f"Critical error in survey frame processing: {e}")
        finally:
            logging.info(f"Survey frame processing thread ending for soldier {force_id}")
            # Don't clean up camera here - let the main thread handle it
            
        logging.info(f"Stopped continuous survey frame processing for soldier {force_id}")

    def stop_survey_monitoring(self, force_id: str, session_id: Optional[int] = None) -> Dict:
        """Stop survey emotion detection and return average results"""
        try:
            if not hasattr(self, 'survey_monitoring') or not self.survey_monitoring:
                logging.warning(f"No monitoring session active for soldier {force_id}")
                return {'force_id': force_id, 'message': 'No monitoring session active'}
                
            # Stop the monitoring thread
            self.survey_monitoring = False
            self.survey_thread_active = False
            
            # Wait for thread to finish
            if hasattr(self, 'survey_thread') and self.survey_thread.is_alive():
                self.survey_thread.join(timeout=2)
            
            # NOW release the camera - this is when the survey is submitted
            if self.cap and self.cap.isOpened():
                self.cap.release()
                self.cap = None
                cv2.destroyAllWindows()
                logging.info("Camera released after survey submission")
            
            # Process any remaining detections
            if hasattr(self, 'survey_detections') and self.survey_detections:
                logging.info(f"Processing {len(self.survey_detections)} emotion detections for soldier {force_id}")
                
                # Calculate average depression score
                scores = [d['score'] for d in self.survey_detections]
                avg_score = sum(scores) / len(scores)
                
                # Get most common emotion
                emotions = [d['emotion'] for d in self.survey_detections]
                most_common_emotion = max(set(emotions), key=emotions.count) if emotions else "Neutral"
                
                logging.info(f"Calculated avg depression score: {avg_score:.2f}, dominant emotion: {most_common_emotion}")
                
                # Store in database if session_id provided
                if session_id:
                    logging.info(f"Storing emotion data for session_id: {session_id}")
                    self._store_survey_emotion_data(session_id, force_id, avg_score)
                else:
                    logging.warning("No session_id provided, emotion data will not be stored in database")
                
                results = {
                    'force_id': force_id,
                    'session_id': session_id,
                    'avg_depression_score': avg_score,
                    'dominant_emotion': most_common_emotion,
                    'detection_count': len(self.survey_detections),
                    'detections': self.survey_detections[:5]  # Return only first 5 detections to avoid large response
                }
                
                logging.info(f"Survey monitoring ended for {force_id}: avg_score={avg_score:.2f}, emotion={most_common_emotion}, detections={len(self.survey_detections)}")
                return results
            else:
                logging.warning(f"No emotion data collected during survey for soldier {force_id}")
                return {'force_id': force_id, 'message': 'No emotion data collected', 'detection_count': 0}
                
        except Exception as e:
            logging.error(f"Error stopping survey monitoring: {e}")
            return {'force_id': force_id, 'error': str(e)}
        finally:
            # Clean up
            if hasattr(self, 'survey_detections'):
                delattr(self, 'survey_detections')
            if hasattr(self, 'survey_force_id'):
                delattr(self, 'survey_force_id')
            if hasattr(self, 'survey_thread'):
                delattr(self, 'survey_thread')

    def _store_survey_emotion_data(self, session_id: int, force_id: str, avg_score: float):
        """Store survey emotion data in the weekly_sessions table"""
        conn = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            logging.info(f"Storing emotion data - session_id: {session_id}, force_id: {force_id}, avg_score: {avg_score:.2f}")
            
            # Update the weekly session with image emotion score
            cursor.execute("""
                UPDATE weekly_sessions 
                SET image_avg_score = %s,
                    combined_avg_score = COALESCE((nlp_avg_score + %s) / 2, %s)
                WHERE session_id = %s AND force_id = %s
            """, (avg_score, avg_score, avg_score, session_id, force_id))
            
            session_rows_affected = cursor.rowcount
            logging.info(f"Updated {session_rows_affected} weekly session record(s)")
            
            # Also update individual question responses with image scores
            cursor.execute("""
                UPDATE question_responses 
                SET image_depression_score = %s,
                    combined_depression_score = COALESCE((nlp_depression_score + %s) / 2, %s)
                WHERE session_id = %s
            """, (avg_score, avg_score, avg_score, session_id))
            
            response_rows_affected = cursor.rowcount
            logging.info(f"Updated {response_rows_affected} question response record(s)")
            
            conn.commit()
            logging.info(f"Successfully stored survey emotion data for session {session_id}: avg_score={avg_score:.2f}")
            
        except Exception as e:
            logging.error(f"Error storing survey emotion data: {e}")
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                conn.close()

    def cleanup_camera(self):
        """Clean up camera resources - only if no survey is running"""
        try:
            # Don't clean up if survey monitoring is active
            if hasattr(self, 'survey_monitoring') and self.survey_monitoring:
                logging.info("Camera cleanup skipped - survey monitoring is active")
                return
                
            if self.cap and self.cap.isOpened():
                self.cap.release()
                self.cap = None
                cv2.destroyAllWindows()
                logging.info("Camera resources cleaned up")
        except Exception as e:
            logging.error(f"Error cleaning up camera: {e}")
