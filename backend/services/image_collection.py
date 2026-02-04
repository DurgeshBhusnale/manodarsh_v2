import cv2
import os
import time

class ImageCollectionService:
    def __init__(self):
        self.base_storage_path = os.path.join('storage', 'uploads')
        # Optimized poses for better quality and faster training
        self.poses = [
            "Look straight at camera",
            "Turn your face slightly right (15°)",
            "Turn your face slightly left (15°)",
            "Natural smile"
        ]
        self.images_per_pose = 3  # 4 poses × 3 images = 12 total (vs 30)

    def _find_available_camera(self):
        """
        Windows-optimized camera detection with DirectShow backend.
        Try different camera indices to find an available camera.
        """
        print("[CAMERA] Starting Windows camera detection with DirectShow...")
        
        # Try external webcam first (usually index 1)
        print("[CAMERA] Trying external USB webcam (index 1) with DirectShow...")
        cap = self._open_camera_windows(index=1, camera_type="External USB")
        if cap:
            return cap
        
        # If external webcam not available, try built-in camera (index 0)
        print("[CAMERA] External webcam not found, trying built-in camera (index 0)...")
        cap = self._open_camera_windows(index=0, camera_type="Built-in")
        if cap:
            return cap
            
        # If no camera is available, return None
        print("[CAMERA] ❌ No cameras available on Windows (checked indices 1 and 0)")
        return None
    
    def _open_camera_windows(self, index: int, camera_type: str = "Unknown"):
        """
        Windows-optimized camera initialization with DirectShow backend.
        
        Args:
            index: Camera index (0=built-in, 1=external USB)
            camera_type: Descriptive name for logging
        
        Returns:
            cv2.VideoCapture object or None
        """
        try:
            # ALWAYS use DirectShow backend for Windows USB camera reliability
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        except Exception as e:
            print(f"[CAMERA] ❌ Exception opening camera {index}: {e}")
            return None
        
        if not cap.isOpened():
            print(f"[CAMERA] ⚠️  Camera {index} failed to open")
            return None
        
        print(f"[CAMERA] ✓ Camera {index} opened with DirectShow")
        
        # Windows USB cameras need initialization time
        init_delay = 1.0 if index > 0 else 0.5
        print(f"[CAMERA] Waiting {init_delay}s for initialization...")
        time.sleep(init_delay)
        
        # Warm up camera - discard first 2 frames
        print(f"[CAMERA] Warming up camera (discarding first 2 frames)...")
        for warmup in range(2):
            cap.read()
            time.sleep(0.15)
        
        # Validate with frame reads
        print(f"[CAMERA] Validating camera...")
        successful_reads = 0
        for attempt in range(5):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                successful_reads += 1
                if successful_reads >= 3:
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    print(f"[CAMERA] ✅ {camera_type} camera validated! ({width}x{height})")
                    return cap
            time.sleep(0.2)
        
        # Camera opened but validation failed
        print(f"[CAMERA] ❌ Camera {index} validation failed ({successful_reads}/3 successful reads)")
        cap.release()
        return None

    def collect_images(self, force_id):
        """
        Collects images for a soldier with different poses
        Args:
            force_id (str): The force ID of the soldier
        Returns:
            str: Path to the representative image
        """
        try:
            # Create directory for the soldier if it doesn't exist
            soldier_dir = os.path.join(self.base_storage_path, force_id)
            os.makedirs(soldier_dir, exist_ok=True)

            # Initialize camera using robust selection system
            cap = self._find_available_camera()
            if not cap:
                raise Exception("Could not find any available camera - please connect a camera")

            representative_image_path = None

            try:
                for pose in self.poses:
                    image_count = 0
                    while image_count < self.images_per_pose:
                        ret, frame = cap.read()
                        if not ret:
                            break

                        # Add pose instruction to frame
                        cv2.putText(frame, pose, (50, 50), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
                        cv2.putText(frame, "Press 's' to start capturing", (50, 100), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
                        cv2.putText(frame, "Press 'q' to quit", (50, 150), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
                        
                        cv2.imshow("Collecting Images", frame)

                        key = cv2.waitKey(1)

                        if key == ord('q'):  # Quit completely
                            return None

                        if key == ord('s'):  # Start capturing images for current pose
                            time.sleep(2)  # Give user time to get into position
                            while image_count < self.images_per_pose:
                                ret, frame = cap.read()
                                if not ret:
                                    break

                                # Show frame while capturing
                                cv2.imshow("Collecting Images", frame)
                                
                                # Create filename and save image
                                filename = f"{force_id}_{pose.replace(' ', '_')}_{image_count}.jpg"
                                file_path = os.path.join(soldier_dir, filename)
                                cv2.imwrite(file_path, frame)
                                print(f"Image saved: {file_path}")
                                
                                if image_count == 0 and pose == self.poses[0]:  # Save first image as representative
                                    representative_image_path = file_path
                                
                                image_count += 1
                                time.sleep(0.3)  # Small delay between captures
                                
                                # Check for quit during capture
                                if cv2.waitKey(1) == ord('q'):
                                    return None

                    print(f"Completed capturing images for {pose}")

                print(f"Image collection complete for {force_id}.")
                return representative_image_path

            finally:
                cap.release()
                cv2.destroyAllWindows()

        except Exception as e:
            if 'cap' in locals():
                cap.release()
            cv2.destroyAllWindows()
            raise Exception(f"Image collection failed: {str(e)}")
