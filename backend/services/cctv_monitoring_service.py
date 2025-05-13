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
