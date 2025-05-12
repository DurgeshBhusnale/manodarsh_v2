import cv2
import os
import time

class ImageCollectionService:
    def __init__(self):
        self.base_storage_path = os.path.join('storage', 'uploads')
        self.poses = [
            "Look straight at camera",
            "Tilt your face down",
            "Turn your face right",
            "Turn your face left",
            "Stand a little away",
            "Smile"
        ]
        self.images_per_pose = 10

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

            # Initialize camera
            cap = cv2.VideoCapture(0)  # Try 0 first, fallback to 1 if needed
            if not cap.isOpened():
                cap = cv2.VideoCapture(1)  # Try alternative camera
                if not cap.isOpened():
                    raise Exception("Could not access camera")

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
