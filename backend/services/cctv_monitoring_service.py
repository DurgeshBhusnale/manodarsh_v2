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

class CCTVMonitoringService:
    def __init__(self):
        self.emotion_service = EmotionDetectionService()
        self.monitoring_id = None
        self.cap = None
        self.is_monitoring = False
        self.monitor_thread = None
        self.detection_buffer = {}  # Buffer for storing detections for 3-second averaging
        self.last_average_time = {}  # Track last average calculation time per force_id
        self.AVERAGE_INTERVAL = 3  # Calculate average every 3 seconds
        self.setup_logging()
        
    def setup_logging(self):
        logging.basicConfig(
            filename="cctv_monitoring.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        
    def _find_available_camera(self):
        """Try different camera indices to find an available camera"""
        # Try external webcam first (usually index 1)
        logging.info("Trying external webcam (index 1)...")
        cap = cv2.VideoCapture(1)
        if cap.isOpened():
            logging.info("Successfully connected to external webcam")
            return cap
        
        # If external webcam not available, try built-in camera (index 0)
        logging.info("External webcam not found, trying built-in camera (index 0)...")
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            logging.info("Successfully connected to built-in camera")
            return cap
            
        # If no camera is available, return None
        logging.error("No cameras available")
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
        self.emotion_detection_service = None

        return True

    def process_frame(self) -> Optional[Dict]:
        """Process a single frame from the video feed"""
        if not self.cap or not self.monitoring_id:
            return None

        ret, frame = self.cap.read()
        if not ret:
            return None

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
            results = self.emotion_service.calculate_daily_scores(date)
            logging.info(f"Calculated daily scores for {len(results)} soldiers on {date}")
            return True
        except Exception as e:
            logging.error(f"Error calculating daily scores: {e}")
            return False

    def start_survey_monitoring(self, force_id: str) -> bool:
        """Start emotion detection monitoring during survey for a specific soldier"""
        try:
            # Initialize camera if not already done
            if not self.cap:
                self.cap = self._find_available_camera()
                if not self.cap:
                    raise Exception("No camera available")
                    
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 10)
            
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
            
            logging.info(f"Started survey emotion monitoring for soldier {force_id}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to start survey monitoring: {e}")
            self.survey_monitoring = False
            return False

    def _process_survey_frames_continuously(self, force_id: str):
        """Continuously process frames during survey in background thread"""
        logging.info(f"Starting continuous survey frame processing for soldier {force_id}")
        
        frame_count = 0
        detection_interval = 30  # Process every 30th frame (about 3 seconds at 10 FPS)
        
        while self.survey_thread_active and self.survey_monitoring:
            try:
                if not self.cap or not self.cap.isOpened():
                    logging.warning("Camera not available during survey monitoring")
                    time.sleep(1)
                    continue
                    
                ret, frame = self.cap.read()
                if not ret:
                    logging.warning("Failed to read frame during survey")
                    time.sleep(0.1)
                    continue
                
                frame_count += 1
                
                # Process only every Nth frame to reduce computational load
                if frame_count % detection_interval == 0:
                    result = self.emotion_service.detect_face_and_emotion(frame)
                    if result:
                        detected_force_id, emotion, score, face_coords = result
                        
                        # Only process if it matches the soldier taking the survey
                        if detected_force_id == force_id:
                            detection_data = {
                                'timestamp': datetime.now().isoformat(),
                                'emotion': emotion,
                                'score': score,
                                'force_id': force_id
                            }
                            
                            # Store in survey detections buffer
                            if not hasattr(self, 'survey_detections'):
                                self.survey_detections = []
                            self.survey_detections.append(detection_data)
                            
                            logging.info(f"Survey detection: {force_id} - {emotion} ({score:.2f})")
                
                # Small delay to prevent excessive CPU usage
                time.sleep(0.1)
                
            except Exception as e:
                logging.error(f"Error in survey frame processing: {e}")
                time.sleep(1)
                
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
        """Clean up camera resources"""
        try:
            if hasattr(self, 'survey_monitoring') and self.survey_monitoring:
                self.survey_monitoring = False
                self.survey_thread_active = False
                
            if self.cap and self.cap.isOpened():
                self.cap.release()
                self.cap = None
                cv2.destroyAllWindows()
                logging.info("Camera resources cleaned up")
        except Exception as e:
            logging.error(f"Error cleaning up camera: {e}")
