import face_recognition
import os
import logging
import shutil
import cv2
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from db.connection import get_connection
from services.face_model_manager import FaceModelManager

# Configure logging
logging.basicConfig(
    filename="enhanced_face_recognition_training.log",
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class EnhancedFaceRecognitionService:
    def __init__(self):
        self.uploads_dir = os.path.join('storage', 'uploads')
        
        # Use the new face model manager
        self.model_manager = FaceModelManager()
    
    def get_untrained_soldiers(self) -> List[str]:
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

    def mark_soldiers_as_trained(self, force_ids: List[str], model_version: str) -> bool:
        """Mark soldiers as trained in the database"""
        if not force_ids:
            return True
            
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
            logging.info(f"Marked {len(force_ids)} soldiers as trained with version {model_version}")
            return True
            
        except Exception as e:
            logging.error(f"Error marking soldiers as trained: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()



    def process_soldier_images(self, force_id: str) -> Tuple[List, bool]:
        """
        Process all images for a single soldier and extract face encodings
        Returns: (encodings_list, success_flag)
        """
        soldier_dir = os.path.join(self.uploads_dir, force_id)
        if not os.path.exists(soldier_dir):
            logging.warning(f"No images found for soldier {force_id}")
            return [], False

        encodings = []
        processed_images = []
        first_valid_image = None
        
        try:
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
                            
                            encodings.append(face_encodings[0])
                            processed_images.append(filename)
                            logging.info(f"Processed image {filename} for soldier {force_id}")
                        else:
                            logging.warning(f"No face found in image {filename} for soldier {force_id}")
                            
                    except Exception as e:
                        logging.error(f"Error processing image {image_path}: {e}")
                        continue

            if encodings:
                # Delete training images immediately after processing for security
                shutil.rmtree(soldier_dir)
                logging.info(f"Deleted training images for soldier {force_id} for security")
                
                logging.info(f"Successfully processed {len(encodings)} images for soldier {force_id}")
                return encodings, True
            else:
                logging.error(f"No valid face encodings extracted for soldier {force_id}")
                return [], False
                
        except Exception as e:
            logging.error(f"Error processing soldier {force_id}: {e}")
            return [], False


    def train_model_enhanced(self, force_ids: Optional[List[str]] = None) -> Dict:
        """
        Enhanced training method with better error handling and recovery
        """
        model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            # Get soldiers to train
            if force_ids:
                soldiers_to_train = force_ids
            else:
                soldiers_to_train = self.get_untrained_soldiers()
            
            if not soldiers_to_train:
                logging.info("No new soldiers to train")
                return {"message": "No new soldiers to train", "status": "success"}

            logging.info(f"Starting training for {len(soldiers_to_train)} soldiers: {soldiers_to_train}")

            # Process each soldier individually
            new_encodings = []
            new_force_ids = []
            successfully_trained = []
            failed_soldiers = []

            for force_id in soldiers_to_train:
                logging.info(f"Processing soldier {force_id}...")
                encodings, success = self.process_soldier_images(force_id)
                
                if success and encodings:
                    # For multiple images per soldier, take the first encoding or average
                    # Here we take the first encoding for simplicity
                    new_encodings.append(encodings[0])
                    new_force_ids.append(force_id)
                    successfully_trained.append(force_id)
                    logging.info(f"Successfully processed soldier {force_id}")
                else:
                    failed_soldiers.append(force_id)
                    logging.error(f"Failed to process soldier {force_id}")

            # Update model with new soldiers using atomic operations
            if new_encodings:
                logging.info(f"Adding {len(new_encodings)} soldiers to model...")
                
                if self.model_manager.add_soldiers_incremental(new_encodings, new_force_ids):
                    # Mark soldiers as trained in database
                    if self.mark_soldiers_as_trained(successfully_trained, model_version):
                        logging.info(f"Training completed successfully for {len(successfully_trained)} soldiers")
                        
                        result = {
                            "message": f"Successfully trained model on {len(successfully_trained)} soldiers",
                            "status": "success",
                            "trained_soldiers": successfully_trained,
                            "failed_soldiers": failed_soldiers,
                            "model_version": model_version,
                            "total_soldiers_in_model": len(new_force_ids) + len(self._get_existing_soldiers())
                        }
                        
                        if failed_soldiers:
                            result["warning"] = f"{len(failed_soldiers)} soldiers failed to train"
                        
                        return result
                    else:
                        # Database update failed - need to rollback model changes
                        logging.error("Failed to update database - rolling back model changes")
                        # TODO: Implement model rollback
                        return {
                            "message": "Training failed: Database update error", 
                            "status": "error",
                            "error": "Failed to mark soldiers as trained in database"
                        }
                else:
                    return {
                        "message": "Training failed: Model update error", 
                        "status": "error",
                        "error": "Failed to update face recognition model"
                    }
            else:
                return {
                    "message": "Training failed: No soldiers successfully processed", 
                    "status": "error",
                    "failed_soldiers": failed_soldiers
                }

        except Exception as e:
            logging.error(f"Critical error in training: {e}")
            return {
                "message": f"Training failed with critical error: {str(e)}", 
                "status": "error",
                "error": str(e)
            }

    def _get_existing_soldiers(self) -> List[str]:
        """Get list of soldiers already in the model"""
        try:
            _, force_ids = self.model_manager.load_model_with_validation()
            return force_ids or []
        except:
            return []

    def validate_model_vs_database(self) -> Dict:
        """
        Validate that PKL model is consistent with database
        """
        try:
            # Get soldiers from PKL model
            _, pkl_force_ids = self.model_manager.load_model_with_validation()
            pkl_soldiers = set(pkl_force_ids or [])
            
            # Get soldiers from database
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT force_id FROM trained_soldiers")
            db_soldiers = {row[0] for row in cursor.fetchall()}
            conn.close()
            
            # Compare
            only_in_pkl = pkl_soldiers - db_soldiers
            only_in_db = db_soldiers - pkl_soldiers
            common = pkl_soldiers & db_soldiers
            
            is_consistent = len(only_in_pkl) == 0 and len(only_in_db) == 0
            
            return {
                "consistent": is_consistent,
                "total_pkl": len(pkl_soldiers),
                "total_db": len(db_soldiers),
                "common": len(common),
                "only_in_pkl": list(only_in_pkl),
                "only_in_db": list(only_in_db),
                "issues": [] if is_consistent else [
                    f"{len(only_in_pkl)} soldiers in PKL but not in DB",
                    f"{len(only_in_db)} soldiers in DB but not in PKL"
                ]
            }
            
        except Exception as e:
            return {
                "consistent": False,
                "error": str(e),
                "issues": [f"Validation failed: {str(e)}"]
            }

    def get_comprehensive_model_status(self) -> Dict:
        """
        Get comprehensive status of the face recognition model
        """
        try:
            # Get model info
            model_info = self.model_manager.get_model_info()
            
            # Validate model integrity
            integrity_check = self.model_manager.validate_model_integrity()
            
            # Check database consistency
            db_consistency = self.validate_model_vs_database()
            
            # Get untrained soldiers
            untrained = self.get_untrained_soldiers()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "model_info": model_info,
                "integrity_check": integrity_check,
                "database_consistency": db_consistency,
                "untrained_soldiers": untrained,
                "ready_for_training": len(untrained) > 0,
                "model_operational": integrity_check.get("valid", False) and db_consistency.get("consistent", False)
            }
            
        except Exception as e:
            return {
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "model_operational": False
            }
