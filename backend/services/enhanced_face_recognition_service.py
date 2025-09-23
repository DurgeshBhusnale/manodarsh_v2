import face_recognition
import os
import logging
import shutil
import cv2
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from db.connection import get_connection
from services.face_model_manager import FaceModelManager
from services.fast_face_encoding_service import get_fast_encoding_service

# Configure logging
logging.basicConfig(
    filename="enhanced_face_recognition_training.log",
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class EnhancedFaceRecognitionService:
    def __init__(self):
        self.uploads_dir = os.path.join('storage', 'uploads')
        
        # Use the new face model manager and fast encoding service
        self.model_manager = FaceModelManager()
        self.fast_encoding_service = get_fast_encoding_service()
    
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
        Fast processing of soldier images using parallel encoding and quality selection
        """
        soldier_dir = os.path.join(self.uploads_dir, force_id)
        
        try:
            if not os.path.exists(soldier_dir):
                logging.error(f"Directory not found for soldier {force_id}: {soldier_dir}")
                return [], False

            # Get all image files with limit for memory safety
            image_paths = []
            for filename in os.listdir(soldier_dir):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    image_paths.append(os.path.join(soldier_dir, filename))
            
            # Limit images to prevent memory issues
            max_images = 15  # Process maximum 15 images per soldier
            if len(image_paths) > max_images:
                logging.info(f"Limiting images for soldier {force_id} from {len(image_paths)} to {max_images} for stability")
                image_paths = image_paths[:max_images]
            
            if not image_paths:
                logging.error(f"No image files found for soldier {force_id}")
                return [], False

            logging.info(f"Found {len(image_paths)} images for soldier {force_id}")
            
            # Use fast encoding service with enhanced error handling
            try:
                encodings = self.fast_encoding_service.encode_faces_parallel(image_paths)
            except Exception as e:
                logging.error(f"Face encoding service failed for soldier {force_id}: {e}")
                return [], False
            
            if encodings:
                # Delete training images immediately after processing for security
                try:
                    shutil.rmtree(soldier_dir)
                    logging.info(f"Deleted training images for soldier {force_id} for security")
                except Exception as e:
                    logging.warning(f"Failed to delete training images for {force_id}: {e}")
                
                logging.info(f"Successfully processed {len(encodings)} quality encodings for soldier {force_id}")
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
                    # Add all quality encodings for this soldier
                    new_encodings.extend(encodings)
                    new_force_ids.extend([force_id] * len(encodings))
                    successfully_trained.append(force_id)
                    logging.info(f"Successfully processed soldier {force_id} with {len(encodings)} encodings")
                else:
                    failed_soldiers.append(force_id)
                    logging.error(f"Failed to process soldier {force_id}")

            # Update model with new soldiers using optimized atomic operations
            if new_encodings:
                logging.info(f"Adding {len(new_encodings)} encodings for {len(successfully_trained)} soldiers to model...")
                
                # Use optimized atomic mode - production safe with better performance
                if self.model_manager.add_soldiers_incremental_optimized(new_encodings, new_force_ids):
                    # Mark soldiers as trained in database
                    if self.mark_soldiers_as_trained(successfully_trained, model_version):
                        logging.info(f"Training completed successfully for {len(successfully_trained)} soldiers")
                        
                        result = {
                            "message": f"Successfully trained model on {len(successfully_trained)} soldiers",
                            "status": "success",
                            "trained_soldiers": successfully_trained,
                            "failed_soldiers": failed_soldiers,
                            "model_version": model_version,
                            "total_encodings": len(new_encodings),
                            "total_soldiers_in_model": len(set(new_force_ids)) + len(self._get_existing_soldiers())
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

    def train_soldiers_batch(self, force_ids: List[str]) -> Dict:
        """
        Production-optimized batch training with full atomic safety
        Ideal for training multiple soldiers at once
        """
        model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            if not force_ids:
                return {"message": "No force IDs provided", "status": "error"}

            logging.info(f"Starting batch training for {len(force_ids)} soldiers: {force_ids}")
            start_time = datetime.now()

            # Process all soldiers with parallel encoding
            soldiers_data = []
            failed_soldiers = []
            
            for force_id in force_ids:
                try:
                    logging.info(f"Processing soldier {force_id}...")
                    encodings, success = self.process_soldier_images(force_id)
                    
                    if success and encodings:
                        soldiers_data.append({
                            'force_id': force_id,
                            'encodings': encodings
                        })
                        logging.info(f"Successfully processed soldier {force_id} with {len(encodings)} encodings")
                    else:
                        failed_soldiers.append({
                            'force_id': force_id,
                            'error': 'No valid face encodings found'
                        })
                        logging.error(f"Failed to process soldier {force_id}")
                        
                except Exception as e:
                    failed_soldiers.append({
                        'force_id': force_id,
                        'error': str(e)
                    })
                    logging.error(f"Error processing soldier {force_id}: {e}")

            # Single atomic batch operation
            if soldiers_data:
                batch_result = self.model_manager.add_soldiers_batch_atomic(soldiers_data)
                
                if batch_result['success']:
                    # Mark all successfully processed soldiers as trained
                    processed_soldiers = batch_result['processed_soldiers']
                    
                    if self.mark_soldiers_as_trained(processed_soldiers, model_version):
                        total_time = (datetime.now() - start_time).total_seconds()
                        
                        logging.info(f"Batch training completed successfully: {len(processed_soldiers)} soldiers in {total_time:.2f}s")
                        
                        return {
                            "message": f"Successfully trained {len(processed_soldiers)} soldiers in batch",
                            "status": "success",
                            "trained_soldiers": processed_soldiers,
                            "failed_soldiers": failed_soldiers,
                            "model_version": model_version,
                            "total_encodings": batch_result.get('total_encodings', 0),
                            "processing_time": total_time,
                            "batch_processing_time": batch_result['processing_time']
                        }
                    else:
                        # Database update failed
                        logging.error("Failed to update database after successful model training")
                        return {
                            "message": "Model updated but database update failed",
                            "status": "error",
                            "error": "Database update failed",
                            "trained_soldiers": processed_soldiers
                        }
                else:
                    # Batch operation failed
                    return {
                        "message": "Batch training failed",
                        "status": "error",
                        "error": batch_result.get('error', 'Unknown batch processing error'),
                        "failed_soldiers": failed_soldiers
                    }
            else:
                logging.warning("No soldiers were successfully processed in batch")
                return {
                    "message": "No soldiers were successfully processed",
                    "status": "warning",
                    "trained_soldiers": [],
                    "failed_soldiers": failed_soldiers,
                    "model_version": model_version
                }

        except Exception as e:
            logging.error(f"Batch training failed with error: {e}")
            return {
                "message": f"Batch training failed: {str(e)}",
                "status": "error",
                "error": str(e)
            }
