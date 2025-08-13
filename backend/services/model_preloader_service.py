import threading
import logging
import os
import time
from typing import Optional, Tuple, List
from datetime import datetime
import cv2
from keras.models import model_from_json
from services.face_model_manager import FaceModelManager
from services.model_refresh_service import get_model_refresh_service

class ModelPreloaderService:
    """
    Service to preload all ML models at application startup for instant access
    Perfect for CRPF scenario: Single device, multiple soldiers, long-running app
    """
    
    # Singleton instance
    _instance = None
    _instance_lock = threading.Lock()
    
    def __init__(self):
        self.models_ready = False
        self.preload_start_time = None
        self.preload_end_time = None
        
        # Cached models
        self.face_model_cache = None
        self.face_ids_cache = None
        self.emotion_model_cache = None
        self.face_cascade_cache = None
        
        # Thread safety
        self.load_lock = threading.RLock()
        
        # Model managers
        self.face_model_manager = FaceModelManager()
        self.model_refresh_service = get_model_refresh_service()
        
        self.setup_logging()
        
        # Start preloading immediately
        print("[PRELOADER] Initializing Model Preloader Service...")
        self._start_preloading()
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance of ModelPreloaderService"""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    print("[PRELOADER] Creating new ModelPreloaderService singleton instance...")
                    cls._instance = cls()
        return cls._instance
    
    def setup_logging(self):
        logging.basicConfig(
            filename="model_preloader_service.log",
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    def _start_preloading(self):
        """Start model preloading in background thread"""
        preload_thread = threading.Thread(
            target=self._preload_all_models,
            daemon=True,
            name="ModelPreloader"
        )
        preload_thread.start()
    
    def _preload_all_models(self):
        """Preload all models during application startup"""
        with self.load_lock:
            try:
                self.preload_start_time = datetime.now()
                print("[PRELOADER] Starting model preloading...")
                logging.info("Model preloading started")
                
                # Step 1: Load Face Cascade (fastest)
                print("[PRELOADER] Loading face detection cascade...")
                self._load_face_cascade()
                
                # Step 2: Load Emotion Detection Model  
                print("[PRELOADER] Loading emotion detection model...")
                self._load_emotion_model()
                
                # Step 3: Load Face Recognition Model (largest)
                print("[PRELOADER] Loading face recognition model...")
                self._load_face_recognition_model()
                
                self.preload_end_time = datetime.now()
                preload_duration = (self.preload_end_time - self.preload_start_time).total_seconds()
                
                self.models_ready = True
                print(f"[SUCCESS] All models preloaded successfully in {preload_duration:.2f} seconds!")
                print(f"[MEMORY] Memory usage: ~{self._estimate_memory_usage():.1f}MB")
                logging.info(f"Model preloading completed in {preload_duration:.2f} seconds")
                
            except Exception as e:
                logging.error(f"Model preloading failed: {e}")
                print(f"[ERROR] Model preloading failed: {e}")
                self.models_ready = False
    
    def _load_face_cascade(self):
        """Load face detection cascade"""
        try:
            current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            cascade_path = os.path.join(current_dir, 'haarcascades', 'haarcascade_frontalface_default.xml')
            
            self.face_cascade_cache = cv2.CascadeClassifier(cascade_path)
            if self.face_cascade_cache.empty():
                raise Exception("Failed to load face cascade classifier")
                
            logging.info("Face cascade loaded successfully")
            
        except Exception as e:
            logging.error(f"Failed to load face cascade: {e}")
            raise
    
    def _load_emotion_model(self):
        """Load emotion detection model"""
        try:
            current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_json_path = os.path.join(current_dir, 'model', 'emotion_model.json')
            model_h5_path = os.path.join(current_dir, 'model', 'emotion_model.h5')
            
            # Load model architecture
            with open(model_json_path, 'r') as json_file:
                loaded_model_json = json_file.read()
            
            self.emotion_model_cache = model_from_json(loaded_model_json)
            self.emotion_model_cache.load_weights(model_h5_path)
            
            logging.info("Emotion detection model loaded successfully")
            
        except Exception as e:
            logging.error(f"Failed to load emotion model: {e}")
            raise
    
    def _load_face_recognition_model(self):
        """Load face recognition model with all soldier encodings"""
        try:
            # Use existing model refresh service to get current model
            encodings, force_ids = self.model_refresh_service.get_current_model()
            
            if encodings is None or force_ids is None:
                # Try to refresh the model
                refresh_result = self.model_refresh_service.force_refresh()
                logging.info(f"Face model refresh result: {refresh_result}")
                
                # Get model after refresh
                encodings, force_ids = self.model_refresh_service.get_current_model()
            
            if encodings is not None and force_ids is not None:
                self.face_model_cache = encodings
                self.face_ids_cache = force_ids
                logging.info(f"Face recognition model loaded with {len(force_ids)} soldiers")
            else:
                logging.warning("No face recognition model available - continuing without it")
                self.face_model_cache = []
                self.face_ids_cache = []
                
        except Exception as e:
            logging.error(f"Failed to load face recognition model: {e}")
            # Don't fail completely - system can work without face recognition
            self.face_model_cache = []
            self.face_ids_cache = []
    
    def _estimate_memory_usage(self):
        """Estimate total memory usage of cached models"""
        memory_mb = 0
        
        # Emotion model: ~2-3MB
        if self.emotion_model_cache:
            memory_mb += 2.5
        
        # Face cascade: ~1MB
        if self.face_cascade_cache:
            memory_mb += 1.0
        
        # Face recognition model: ~10KB per soldier
        if self.face_model_cache:
            soldiers_count = len(self.face_ids_cache) if self.face_ids_cache else 0
            memory_mb += (soldiers_count * 10) / 1000  # Convert KB to MB
        
        return memory_mb
    
    def get_face_cascade(self):
        """Get preloaded face cascade - instant access"""
        if not self.models_ready:
            logging.warning("Models not ready yet - falling back to on-demand loading")
            return None
        return self.face_cascade_cache
    
    def get_emotion_model(self):
        """Get preloaded emotion model - instant access"""
        if not self.models_ready:
            logging.warning("Models not ready yet - falling back to on-demand loading")
            return None
        return self.emotion_model_cache
    
    def get_face_recognition_model(self) -> Tuple[Optional[List], Optional[List]]:
        """Get preloaded face recognition model - instant access"""
        if not self.models_ready:
            logging.warning("Models not ready yet - falling back to on-demand loading")
            return None, None
        return self.face_model_cache, self.face_ids_cache
    
    def get_face_encodings(self) -> Optional[dict]:
        """Get preloaded face encodings as dictionary - instant access"""
        if not self.models_ready or not self.face_model_cache or not self.face_ids_cache:
            logging.warning("Face encodings not ready yet - falling back to on-demand loading")
            return None
        
        # Convert lists to dictionary format expected by enhanced emotion detection service
        face_encodings_dict = {}
        if self.face_model_cache and self.face_ids_cache:
            for i, force_id in enumerate(self.face_ids_cache):
                if i < len(self.face_model_cache):
                    face_encodings_dict[force_id] = self.face_model_cache[i]
        
        return face_encodings_dict if face_encodings_dict else None
    
    def is_ready(self) -> bool:
        """Check if all models are loaded and ready"""
        return self.models_ready
    
    def get_status(self) -> dict:
        """Get detailed status of model preloader"""
        if self.preload_start_time and self.preload_end_time:
            load_time = (self.preload_end_time - self.preload_start_time).total_seconds()
        else:
            load_time = None
        
        return {
            "ready": self.models_ready,
            "soldiers_loaded": len(self.face_ids_cache) if self.face_ids_cache else 0,
            "estimated_memory_mb": self._estimate_memory_usage(),
            "load_time_seconds": load_time,
            "models": {
                "face_cascade": self.face_cascade_cache is not None,
                "emotion_model": self.emotion_model_cache is not None,
                "face_recognition": self.face_model_cache is not None
            }
        }
    
    def refresh_face_model(self):
        """Refresh face recognition model (when new soldiers are added)"""
        with self.load_lock:
            try:
                logging.info("Refreshing face recognition model...")
                self._load_face_recognition_model()
                logging.info("Face recognition model refreshed successfully")
                return True
            except Exception as e:
                logging.error(f"Failed to refresh face recognition model: {e}")
                return False

# Singleton instance
_model_preloader_instance = None

def get_model_preloader_service() -> ModelPreloaderService:
    """Get singleton instance of ModelPreloaderService"""
    global _model_preloader_instance
    if _model_preloader_instance is None:
        _model_preloader_instance = ModelPreloaderService()
    return _model_preloader_instance
