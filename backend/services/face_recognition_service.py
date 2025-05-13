import face_recognition
import os
import pickle
import logging
from datetime import datetime
from db.connection import get_connection
import shutil
import cv2

# Configure logging
logging.basicConfig(
    filename="face_recognition_training.log",
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class FaceRecognitionService:
    def __init__(self):
        self.uploads_dir = os.path.join('storage', 'uploads')
        self.model_dir = os.path.join('storage', 'models')
        self.profile_pics_dir = os.path.join('storage', 'profile_pics')
        self.model_filename = os.path.join(self.model_dir, 'face_recognition_model.pkl')
        
        # Ensure required directories exist
        for directory in [self.model_dir, self.profile_pics_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                
    def get_untrained_soldiers(self):
        """Get list of soldiers who haven't been trained yet"""
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT u.force_id 
                FROM users u 
                LEFT JOIN trained_soldiers t ON u.force_id = t.force_id 
                WHERE t.force_id IS NULL AND u.user_type = 'soldier'
            """)
            
            return [row['force_id'] for row in cursor.fetchall()]
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def mark_soldiers_as_trained(self, force_ids, model_version):
        """Mark soldiers as trained in the database"""
        if not force_ids:
            return
            
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Create batch insert query
            values = [(force_id, model_version) for force_id in force_ids]
            cursor.executemany(
                "INSERT INTO trained_soldiers (force_id, model_version) VALUES (%s, %s)",
                values
            )
            
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def save_profile_picture(self, force_id: str, source_path: str) -> bool:
        """Save a profile picture for a soldier"""
        try:
            # Read the source image
            image = cv2.imread(source_path)
            if image is None:
                logging.error(f"Could not read image {source_path}")
                return False
                
            # Save as PNG for better quality
            profile_pic_path = os.path.join(self.profile_pics_dir, f"{force_id}.png")
            cv2.imwrite(profile_pic_path, image)
            logging.info(f"Saved profile picture for soldier {force_id}")
            return True
        except Exception as e:
            logging.error(f"Error saving profile picture for soldier {force_id}: {e}")
            return False
                
    def train_model(self):
        """Train the face recognition model on new soldiers"""
        # Get untrained soldiers
        untrained_soldiers = self.get_untrained_soldiers()
        if not untrained_soldiers:
            logging.info("No new soldiers to train")
            return {"message": "No new soldiers to train"}

        known_face_encodings = []
        known_force_ids = []
        trained_force_ids = []
        model_version = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Load existing model if it exists
        if os.path.exists(self.model_filename):
            try:
                with open(self.model_filename, "rb") as f:
                    known_face_encodings, known_force_ids = pickle.load(f)
                logging.info(f"Loaded existing model with {len(known_force_ids)} soldiers")
            except Exception as e:
                logging.error(f"Error loading existing model: {e}")
                known_face_encodings = []
                known_force_ids = []

        # Process each untrained soldier
        for force_id in untrained_soldiers:
            soldier_dir = os.path.join(self.uploads_dir, force_id)
            if not os.path.exists(soldier_dir):
                logging.warning(f"No images found for soldier {force_id}")
                continue

            processed = False
            first_valid_image = None
            
            for filename in os.listdir(soldier_dir):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    image_path = os.path.join(soldier_dir, filename)
                    try:
                        image = face_recognition.load_image_file(image_path)
                        face_encodings = face_recognition.face_encodings(image)
                        if face_encodings:
                            # Store first valid image path for profile picture
                            if not first_valid_image:
                                first_valid_image = image_path
                                
                            known_face_encodings.append(face_encodings[0])
                            known_force_ids.append(force_id)
                            processed = True
                            logging.info(f"Processed image {filename} for soldier {force_id}")
                    except Exception as e:
                        logging.error(f"Error processing image {image_path}: {e}")

            if processed:
                trained_force_ids.append(force_id)
                
                # Save profile picture before deleting training images
                if first_valid_image:
                    self.save_profile_picture(force_id, first_valid_image)
                
                # Delete the soldier's image folder after successful processing
                try:
                    shutil.rmtree(soldier_dir)
                    logging.info(f"Deleted images for soldier {force_id}")
                except Exception as e:
                    logging.error(f"Error deleting images for soldier {force_id}: {e}")

        # Save the updated model
        if trained_force_ids:
            try:
                with open(self.model_filename, "wb") as f:
                    pickle.dump((known_face_encodings, known_force_ids), f)
                logging.info(f"Saved model with {len(known_force_ids)} total soldiers")
                
                # Mark soldiers as trained in database
                self.mark_soldiers_as_trained(trained_force_ids, model_version)
                
                return {
                    "message": f"Successfully trained model on {len(trained_force_ids)} new soldiers",
                    "trained_soldiers": trained_force_ids
                }
            except Exception as e:
                logging.error(f"Error saving model: {e}")
                raise
        else:
            return {"message": "No new soldiers were successfully trained"}
