import cv2
import logging
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple
from collections import deque, defaultdict
from statistics import mean
from db.connection import get_connection
from services.enhanced_emotion_detection_service import EnhancedEmotionDetectionService

# SINGLETON PATTERN: Ensure only one monitoring service instance to prevent camera conflicts
_monitoring_service_instance = None

def get_monitoring_service_instance():
    """Get singleton instance of CCTVMonitoringService to prevent camera conflicts"""
    global _monitoring_service_instance
    if _monitoring_service_instance is None:
        _monitoring_service_instance = CCTVMonitoringService()
    return _monitoring_service_instance

def get_camera_settings():
    """Get camera settings from database with fallback to defaults"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT setting_name, setting_value 
            FROM system_settings 
            WHERE setting_name IN ('camera_width', 'camera_height', 'detection_interval')
        """)
        
        db_settings = cursor.fetchall()
        setting_values = {}
        
        for setting in db_settings:
            # Convert to appropriate types
            if setting['setting_name'] in ['camera_width', 'camera_height', 'detection_interval']:
                setting_values[setting['setting_name']] = int(setting['setting_value'])
        
        conn.close()
        
        # Return with defaults if not found in database
        return {
            'width': setting_values.get('camera_width', 640),
            'height': setting_values.get('camera_height', 480),
            'detection_interval': setting_values.get('detection_interval', 30)
        }
        
    except Exception as e:
        logging.error(f"Error retrieving camera settings: {e}")
        # Return hardcoded defaults
        return {
            'width': 640,
            'height': 480,
            'detection_interval': 30
        }

def calculate_peak_weighted_average(scores: List[float]) -> float:
    """
    Calculate peak-weighted average that amplifies non-neutral emotions for military personnel.
    
    This approach addresses the challenge that soldiers show subtle emotions which get
    diluted by simple averaging. The algorithm:
    1. Identifies emotions that deviate significantly from neutral (0.45)
    2. Gives higher weight to non-neutral emotional peaks
    3. Combines peak emotions (70%) with overall average (30%)
    
    Args:
        scores: List of emotion scores (0.0-1.0 scale)
        
    Returns:
        Float: Peak-weighted average score that amplifies significant emotional moments
    """
    if not scores:
        return 0.0
        
    if len(scores) == 1:
        return scores[0]
    
    # Define neutral baseline and deviation threshold
    NEUTRAL_BASELINE = 0.45  # Current neutral mapping in emotion_mapping
    SIGNIFICANCE_THRESHOLD = 0.12  # Minimum deviation to be considered "significant"
    
    # Calculate simple average for baseline
    overall_avg = sum(scores) / len(scores)
    
    # Identify significant emotional peaks (deviations from neutral)
    significant_scores = []
    for score in scores:
        deviation = abs(score - NEUTRAL_BASELINE)
        if deviation >= SIGNIFICANCE_THRESHOLD:
            significant_scores.append(score)
    
    # If we have significant emotional moments, give them higher weight
    if significant_scores:
        peak_avg = sum(significant_scores) / len(significant_scores)
        
        # Weight formula: 70% peak emotions, 30% overall average
        # This ensures subtle but important emotions aren't lost in averaging
        weighted_score = (peak_avg * 0.7) + (overall_avg * 0.3)
        
        logging.debug(f"Peak-weighted calculation: {len(significant_scores)}/{len(scores)} significant emotions. "
                     f"Peak avg: {peak_avg:.3f}, Overall avg: {overall_avg:.3f}, "
                     f"Weighted result: {weighted_score:.3f}")
        
        return weighted_score
    else:
        # No significant peaks detected, return simple average
        logging.debug(f"No significant emotional peaks detected in {len(scores)} scores. Using simple average: {overall_avg:.3f}")
        return overall_avg

class CCTVMonitoringService:
    def __init__(self):
        self.emotion_service = EnhancedEmotionDetectionService()
        self.monitoring_id = None
        self.cap = None
        self.is_monitoring = False
        self.monitor_thread = None
        self.detection_buffer = {}  # Buffer for storing detections for 3-second averaging
        self.last_average_time = {}  # Track last average calculation time per force_id
        self.AVERAGE_INTERVAL = 3  # Calculate average every 3 seconds
        
        # Survey-specific attributes
        self.survey_monitoring = False
        self.survey_mode = False
        self.survey_thread_active = False
        self.survey_thread = None
        
        self.setup_logging()
        
        # IMPORTANT: Clean up any existing OpenCV resources on init
        try:
            cv2.destroyAllWindows()
        except:
            pass
        
    def setup_logging(self):
        logging.basicConfig(
            filename="cctv_monitoring.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        
    def get_camera_settings(self):
        """Get camera settings from database - exposed method for testing"""
        return get_camera_settings()
        
    def _find_available_camera(self):
        """Try camera indices 1 and 0 only (optimized for fixed webcam setup)"""
        # OPTIMIZATION: Only check 2 indices - external webcam (1) and built-in (0)
        # This reduces camera initialization time significantly
        
        # Try external webcam first (usually index 1 for fixed CRPF setup)
        logging.info("Trying external webcam (index 1)...")
        cap = cv2.VideoCapture(1)
        
        # Give camera minimal time to initialize
        time.sleep(0.1)
        
        if cap.isOpened():
            # Quick test read to ensure camera is truly ready
            ret, frame = cap.read()
            if ret and frame is not None:
                logging.info("Successfully connected to external webcam (index 1)")
                return cap
            else:
                cap.release()
                logging.info("External webcam opened but not ready, trying built-in camera")
        else:
            cap.release()
        
        # If external webcam not available, try built-in camera (index 0)
        logging.info("Trying built-in camera (index 0)...")
        cap = cv2.VideoCapture(0)
        
        # Give camera minimal time to initialize  
        time.sleep(0.1)
        
        if cap.isOpened():
            # Quick test read to ensure camera is truly ready
            ret, frame = cap.read()
            if ret and frame is not None:
                logging.info("Successfully connected to built-in camera (index 0)")
                return cap
            else:
                cap.release()
                logging.error("Built-in camera opened but not ready")
        else:
            cap.release()
            
        # If no camera is available, return None
        logging.error("No cameras available (checked indices 1 and 0 only)")
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

    def get_emotion_data_for_timerange(self, start_seconds: float, end_seconds: float) -> float:
        """Get average emotion score for a specific time range relative to survey start"""
        if not hasattr(self, 'survey_detections') or not self.survey_detections:
            return 0.0
            
        if not hasattr(self, 'survey_start_time'):
            return 0.0
            
        # Convert relative seconds to actual timestamps
        start_time = self.survey_start_time + timedelta(seconds=start_seconds)
        end_time = self.survey_start_time + timedelta(seconds=end_seconds)
        
        # Filter detections in this time range
        relevant_detections = []
        for detection in self.survey_detections:
            detection_time = datetime.fromisoformat(detection['timestamp'])
            if start_time <= detection_time <= end_time:
                relevant_detections.append(detection)
        
        if not relevant_detections:
            return 0.0
            
        # Calculate peak-weighted average score for this time range
        scores = [d['score'] for d in relevant_detections]
        avg_score = calculate_peak_weighted_average(scores)
        
        logging.info(f"Time range {start_seconds}-{end_seconds}s: {len(relevant_detections)} detections, peak-weighted avg_score={avg_score:.2f}")
        return avg_score

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
        """Process a single frame from the video feed - CONDITIONAL LOGIC for CCTV vs Survey"""
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

        # CONDITIONAL LOGIC: Choose detection method based on context
        if hasattr(self, 'survey_mode') and self.survey_mode:
            # SURVEY MODE: Use credential-based detection
            if hasattr(self, 'survey_force_id'):
                result = self.emotion_service.detect_emotion_for_survey(frame, self.survey_force_id)
            else:
                result = None
        else:
            # CCTV MODE: Use PKL-based identification
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

        # Calculate peak-weighted average score
        scores = [d['score'] for d in buffer]
        avg_score = calculate_peak_weighted_average(scores)
        
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

    def force_camera_cleanup(self):
        """FAST force cleanup of all camera resources - optimized for speed"""
        logging.info("FAST CAMERA CLEANUP: Attempting to release all camera resources...")
        
        try:
            # Stop all monitoring activities immediately
            self.survey_monitoring = False
            self.survey_thread_active = False
            self.is_monitoring = False
            
            # Quick thread cleanup with minimal waiting
            for thread_attr in ['survey_thread', 'monitor_thread']:
                if hasattr(self, thread_attr):
                    thread = getattr(self, thread_attr)
                    if thread and thread.is_alive():
                        logging.info(f"Fast stopping {thread_attr}...")
                        # Minimal timeout - don't wait long
                        thread.join(timeout=0.2)  # Reduced from 1s to 0.2s
            
            # Immediate camera release
            if self.cap is not None:
                try:
                    if self.cap.isOpened():
                        self.cap.release()
                        logging.info("Camera instantly released")
                    self.cap = None
                except Exception as e:
                    logging.debug(f"Camera release (non-critical): {e}")
                    self.cap = None  # Set to None anyway
            
            # Fast OpenCV cleanup
            try:
                cv2.destroyAllWindows()
                cv2.waitKey(1)  # Single quick cleanup
                logging.info("OpenCV windows destroyed instantly")
            except Exception as e:
                logging.debug(f"OpenCV cleanup (non-critical): {e}")
            
            # Instant state reset
            self.survey_mode = False
            
            logging.info("FAST CAMERA CLEANUP COMPLETE")
            return True
            
        except Exception as e:
            logging.error(f"Error during fast camera cleanup: {e}")
            return False

    def configure_survey_mode(self, force_id: str):
        """Configure monitoring for survey mode with specific soldier"""
        self.survey_mode = True
        self.survey_force_id = force_id
        logging.info(f"CCTV Monitoring configured for SURVEY MODE with soldier {force_id}")
        
    def configure_cctv_mode(self):
        """Configure monitoring for general CCTV mode"""
        self.survey_mode = False
        if hasattr(self, 'survey_force_id'):
            delattr(self, 'survey_force_id')
        logging.info("CCTV Monitoring configured for GENERAL CCTV MODE")

    def _detect_optimal_camera_resolution(self) -> Tuple[int, int]:
        """Detect maximum supported camera resolution"""
        if not self.cap:
            return (1920, 1080)  # Default fallback
            
        try:
            # Test common resolutions from highest to lowest
            test_resolutions = [
                (3840, 2160),  # 4K
                (2560, 1440),  # 2K
                (1920, 1080),  # Full HD
                (1280, 720),   # HD
                (640, 480)     # VGA
            ]
            
            for width, height in test_resolutions:
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
                
                # Verify the resolution was actually set
                actual_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                
                if actual_width == width and actual_height == height:
                    logging.info(f"Optimal camera resolution detected: {width}x{height}")
                    return (width, height)
                    
            logging.warning("Could not detect optimal resolution, using default 1920x1080")
            return (1920, 1080)
            
        except Exception as e:
            logging.error(f"Error detecting optimal camera resolution: {e}")
            return (1920, 1080)

    def start_survey_monitoring(self, force_id: str) -> bool:
        """ENHANCED: Start emotion detection monitoring during survey for a specific soldier"""
        start_time = time.time()
        camera_init_time = 0
        
        try:
            logging.info(f"[START] ENHANCED survey monitoring for authenticated soldier {force_id}")
            
            # Initialize camera if not already done
            if not self.cap:
                camera_init_start = time.time()
                logging.info("[CAMERA] Initializing camera with optimal resolution...")
                
                self.cap = self._find_available_camera()
                if not self.cap:
                    raise Exception("No camera available")
                    
                camera_init_time = time.time() - camera_init_start
                logging.info(f"[CAMERA] Camera initialized in {camera_init_time:.2f} seconds")
            else:
                logging.info("[CAMERA] Using existing camera connection")
            
            # ENHANCED: Set optimal camera resolution (maximum possible)
            settings_start = time.time()
            
            # Get optimal settings from emotion service
            optimal_settings = self.emotion_service.get_camera_optimal_settings()
            
            if optimal_settings.get('use_auto_resolution', False):
                # Use auto-detection for maximum resolution
                actual_width, actual_height = self.emotion_service.set_optimal_camera_resolution(self.cap)
                logging.info(f"[RESOLUTION] Auto-detected optimal: {actual_width}x{actual_height}")
            else:
                # Use configured settings
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, optimal_settings['width'])
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, optimal_settings['height'])
                actual_width = optimal_settings['width']
                actual_height = optimal_settings['height']
            
            self.cap.set(cv2.CAP_PROP_FPS, optimal_settings.get('fps', 10))
            settings_time = time.time() - settings_start
            
            logging.info(f"[CONFIG] OPTIMAL camera settings applied in {settings_time:.2f}s: "
                        f"{actual_width}x{actual_height}, fps={optimal_settings.get('fps', 10)}, "
                        f"detection_interval={optimal_settings['detection_interval']}")
            
            # Initialize survey monitoring state
            self.survey_force_id = force_id
            self.survey_detections = []
            self.survey_monitoring = True
            self.survey_thread_active = True
            self.survey_start_time = datetime.now()
            self.survey_mode = True  # NEW: Flag for survey-specific processing
            
            # Start background monitoring thread with enhanced processing
            thread_start = time.time()
            self.survey_thread = threading.Thread(
                target=self._process_survey_frames_continuously_enhanced,
                args=(force_id,),
                daemon=True
            )
            self.survey_thread.start()
            thread_time = time.time() - thread_start
            
            total_time = time.time() - start_time
            logging.info(f"[SUCCESS] ENHANCED survey monitoring started in {total_time:.2f}s "
                        f"(camera: {camera_init_time:.2f}s, optimal_settings: {settings_time:.2f}s, thread: {thread_time:.2f}s)")
            return True
            
        except Exception as e:
            total_time = time.time() - start_time
            logging.error(f"[ERROR] Failed to start enhanced survey monitoring after {total_time:.2f}s: {e}")
            self.survey_monitoring = False
            return False

    def _process_survey_frames_continuously(self, force_id: str):
        """LEGACY: Continuously process frames during survey in background thread (PKL-based)"""
        logging.info(f"Starting continuous survey frame processing for soldier {force_id}")
        
        frame_count = 0
        # Get dynamic detection interval from database settings
        camera_settings = get_camera_settings()
        detection_interval = camera_settings['detection_interval']  # Use configurable interval
        logging.info(f"Using detection interval: {detection_interval} frames")
        
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

    def _process_survey_frames_continuously_enhanced(self, force_id: str):
        """ENHANCED: Survey-specific frame processing without PKL identification"""
        logging.info(f"Starting ENHANCED survey frame processing for authenticated soldier {force_id}")
        
        frame_count = 0
        # Get optimal detection interval
        optimal_settings = self.emotion_service.get_camera_optimal_settings()
        detection_interval = optimal_settings['detection_interval']
        
        logging.info(f"Using enhanced detection interval: {detection_interval} frames")
        
        while self.survey_thread_active and self.survey_monitoring:
            try:
                if not self.cap or not self.cap.isOpened():
                    logging.warning("Camera not available during enhanced survey monitoring")
                    time.sleep(1)
                    continue
                    
                ret, frame = self.cap.read()
                if not ret:
                    logging.warning("Failed to read frame during enhanced survey")
                    time.sleep(0.1)
                    continue
                
                frame_count += 1
                
                # Process every Nth frame with enhanced detection
                if frame_count % detection_interval == 0:
                    # ENHANCED: Use survey-specific emotion detection (no PKL matching)
                    result = self.emotion_service.detect_emotion_for_survey(frame, force_id)
                    
                    if result:
                        detected_force_id, emotion, score, face_coords = result
                        
                        # Force ID should match since we pass it to the function
                        if detected_force_id == force_id:
                            detection_data = {
                                'timestamp': datetime.now().isoformat(),
                                'emotion': emotion,
                                'score': score,
                                'force_id': force_id,
                                'method': 'survey_enhanced'  # Mark as enhanced detection
                            }
                            
                            # Store in survey detections buffer
                            if not hasattr(self, 'survey_detections'):
                                self.survey_detections = []
                            self.survey_detections.append(detection_data)
                            
                            logging.info(f"ENHANCED Survey detection: {force_id} - {emotion} ({score:.2f})")
                        else:
                            logging.warning(f"Unexpected force_id mismatch in enhanced survey: expected {force_id}, got {detected_force_id}")
                    else:
                        # Log when no face is detected for debugging
                        if frame_count % (detection_interval * 10) == 0:  # Log every 10 detection attempts
                            logging.debug(f"No face detected in enhanced survey frame (count: {frame_count})")
                
                # Smaller delay for enhanced processing
                time.sleep(0.05)
                
            except Exception as e:
                logging.error(f"Error in enhanced survey frame processing: {e}")
                time.sleep(1)
                
        logging.info(f"Stopped ENHANCED survey frame processing for soldier {force_id}")

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
                
                # Filter out only actual emotion detections (not markers)
                actual_detections = [d for d in self.survey_detections if 'score' in d and 'emotion' in d]
                logging.info(f"Found {len(actual_detections)} actual emotion detections (filtered from {len(self.survey_detections)} total entries)")
                
                if actual_detections:
                    # Calculate peak-weighted average depression score
                    scores = [d['score'] for d in actual_detections]
                    avg_score = calculate_peak_weighted_average(scores)
                    
                    # Get most common emotion
                    emotions = [d['emotion'] for d in actual_detections]
                    most_common_emotion = max(set(emotions), key=emotions.count) if emotions else "Neutral"
                    
                    logging.info(f"Calculated peak-weighted avg depression score: {avg_score:.2f}, dominant emotion: {most_common_emotion}")
                    logging.info(f"Score distribution: min={min(scores):.2f}, max={max(scores):.2f}, count={len(scores)}")
                else:
                    # No actual detections found
                    avg_score = 0
                    most_common_emotion = "No Detection"
                    logging.warning(f"No actual emotion detections found for soldier {force_id}")
                
                # Store in database if session_id provided - OPTIMIZED for speed
                if session_id:
                    logging.info(f"Storing emotion data for session_id: {session_id}")
                    # OPTIMIZATION: Run database storage in background to not block survey submission
                    import threading
                    storage_thread = threading.Thread(
                        target=self._store_survey_emotion_data_async,
                        args=(session_id, force_id, avg_score),
                        daemon=True
                    )
                    storage_thread.start()
                    logging.info("Database storage started in background - won't block submission")
                else:
                    logging.warning("No session_id provided, emotion data will not be stored in database")
                
                results = {
                    'force_id': force_id,
                    'session_id': session_id,
                    'avg_depression_score': avg_score,
                    'dominant_emotion': most_common_emotion,
                    'detection_count': len(self.survey_detections),
                    'detections': self.survey_detections  # Return ALL detections for per-question analysis
                }
                
                logging.info(f"Survey monitoring ended for {force_id}: peak-weighted avg_score={avg_score:.2f}, emotion={most_common_emotion}, detections={len(self.survey_detections)}")
                logging.info(f"PEAK-WEIGHTED AVERAGING APPLIED: Enhanced sensitivity for military personnel emotion detection")
                return results
            else:
                logging.warning(f"No emotion data collected during survey for soldier {force_id}")
                # Still return a valid structure with 0 score
                return {
                    'force_id': force_id, 
                    'session_id': session_id,
                    'avg_depression_score': 0,
                    'dominant_emotion': 'No Detection',
                    'detection_count': 0,
                    'message': 'No emotion data collected'
                }
                
        except Exception as e:
            logging.error(f"Error stopping survey monitoring: {e}")
            return {'force_id': force_id, 'error': str(e)}
        finally:
            # OPTIMIZED: Fast camera cleanup to prevent survey submission delays
            try:
                logging.info("Starting FAST camera cleanup process...")
                
                # Stop any ongoing threads immediately
                self.survey_monitoring = False
                self.survey_thread_active = False
                
                # Quick thread cleanup with minimal timeout
                if hasattr(self, 'survey_thread') and self.survey_thread.is_alive():
                    logging.info("Quickly stopping survey monitoring thread...")
                    self.survey_thread.join(timeout=0.5)  # Reduced from 3s to 0.5s
                    if self.survey_thread.is_alive():
                        logging.info("Thread still active - will cleanup in background")
                
                # FAST: Immediate camera release without sleep delays
                if self.cap is not None:
                    if self.cap.isOpened():
                        logging.info("Releasing camera capture immediately...")
                        self.cap.release()
                        # REMOVED: time.sleep(0.5) - this was causing delay
                    self.cap = None
                    logging.info("Camera capture cleared instantly")
                
                # Quick OpenCV cleanup
                try:
                    cv2.destroyAllWindows()
                    # Quick CV cleanup without excessive waiting
                    for _ in range(2):  # Reduced from 5 to 2
                        cv2.waitKey(1)
                    logging.info("OpenCV windows closed quickly")
                except Exception as cv_error:
                    logging.debug(f"OpenCV cleanup (non-critical): {cv_error}")
                
                # Fast state reset
                self.survey_mode = False
                if hasattr(self, 'survey_force_id'):
                    delattr(self, 'survey_force_id')
                
                # Clean up survey-specific attributes
                if hasattr(self, 'survey_detections'):
                    delattr(self, 'survey_detections')
                if hasattr(self, 'survey_force_id'):
                    delattr(self, 'survey_force_id')
                if hasattr(self, 'survey_thread'):
                    delattr(self, 'survey_thread')
                    
            except Exception as cleanup_error:
                logging.error(f"Error during cleanup: {cleanup_error}")

    def _store_survey_emotion_data_async(self, session_id: int, force_id: str, avg_score: float):
        """FAST: Store survey emotion data in background thread to not block submission"""
        try:
            logging.info(f"Background storage starting - session_id: {session_id}, force_id: {force_id}, avg_score: {avg_score:.2f}")
            self._store_survey_emotion_data(session_id, force_id, avg_score)
            logging.info("Background database storage completed successfully")
        except Exception as e:
            logging.error(f"Background database storage failed (non-critical): {e}")
            # Don't raise exception - this is background operation

    def _store_survey_emotion_data(self, session_id: int, force_id: str, avg_score: float):
        """Store survey emotion data using proper weighted calculation from database settings"""
        conn = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            logging.info(f"Storing emotion data - session_id: {session_id}, force_id: {force_id}, avg_score: {avg_score:.2f}")
            
            # Get dynamic database settings for proper weighted calculation
            from api.survey.routes import get_dynamic_settings
            nlp_weight, emotion_weight = get_dynamic_settings()
            logging.info(f"Using database weights for combined score calculation: NLP={nlp_weight}, Emotion={emotion_weight}")
            
            # Update the weekly session with image emotion score using DATABASE WEIGHTED calculation
            cursor.execute("""
                UPDATE weekly_sessions 
                SET image_avg_score = %s,
                    combined_avg_score = CASE 
                        WHEN nlp_avg_score IS NOT NULL AND nlp_avg_score > 0 THEN 
                            (nlp_avg_score * %s) + (%s * %s)
                        ELSE %s
                    END
                WHERE session_id = %s AND force_id = %s
            """, (avg_score, nlp_weight, avg_score, emotion_weight, avg_score, session_id, force_id))
            
            session_rows_affected = cursor.rowcount
            logging.info(f"Updated {session_rows_affected} weekly session record(s)")
            
            # Also update individual question responses with proper weighted calculation
            cursor.execute("""
                UPDATE question_responses 
                SET image_depression_score = %s,
                    combined_depression_score = CASE 
                        WHEN nlp_depression_score IS NOT NULL THEN 
                            (nlp_depression_score * %s) + (%s * %s)
                        ELSE %s
                    END
                WHERE session_id = %s
            """, (avg_score, nlp_weight, avg_score, emotion_weight, avg_score, session_id))
            
            response_rows_affected = cursor.rowcount
            logging.info(f"Updated {response_rows_affected} question response record(s)")
            
            conn.commit()
            logging.info(f"Successfully stored survey emotion data for session {session_id}: avg_score={avg_score:.2f}")
            logging.info(f"FIXED: Using database-weighted calculation instead of simple 50/50 averaging")
            
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
