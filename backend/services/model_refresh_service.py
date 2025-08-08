import threading
import time
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict
from services.face_model_manager import FaceModelManager

class ModelRefreshService:
    """
    Service to handle automatic model refreshing for real-time recognition
    """
    
    def __init__(self):
        self.model_manager = FaceModelManager()
        self.current_model_version = None
        self.current_encodings = None
        self.current_force_ids = None
        self.last_refresh_time = None
        self.refresh_lock = threading.RLock()
        self.auto_refresh_interval = 300  # 5 minutes default
        self.auto_refresh_thread = None
        self.auto_refresh_enabled = False
        
        # Load initial model
        self.refresh_model()
        
        logging.basicConfig(
            filename="model_refresh_service.log",
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    def start_auto_refresh(self, interval_seconds: int = 300):
        """Start automatic model refresh in background thread"""
        with self.refresh_lock:
            if self.auto_refresh_enabled:
                logging.warning("Auto refresh already running")
                return
            
            self.auto_refresh_interval = interval_seconds
            self.auto_refresh_enabled = True
            
            self.auto_refresh_thread = threading.Thread(
                target=self._auto_refresh_loop,
                daemon=True
            )
            self.auto_refresh_thread.start()
            
            logging.info(f"Auto refresh started with {interval_seconds}s interval")
    
    def stop_auto_refresh(self):
        """Stop automatic model refresh"""
        with self.refresh_lock:
            self.auto_refresh_enabled = False
            if self.auto_refresh_thread:
                self.auto_refresh_thread.join(timeout=5)
            logging.info("Auto refresh stopped")
    
    def _auto_refresh_loop(self):
        """Background thread for automatic model refresh"""
        while self.auto_refresh_enabled:
            try:
                time.sleep(self.auto_refresh_interval)
                if self.auto_refresh_enabled:
                    self.refresh_model(auto_refresh=True)
            except Exception as e:
                logging.error(f"Error in auto refresh loop: {e}")
                time.sleep(60)  # Wait 1 minute before retrying
    
    def refresh_model(self, force: bool = False, auto_refresh: bool = False) -> Dict:
        """
        Refresh the in-memory model if needed
        
        Args:
            force: Force refresh even if model hasn't changed
            auto_refresh: Called from auto refresh thread
        
        Returns:
            Dict with refresh status and info
        """
        with self.refresh_lock:
            try:
                # Check if model file exists and get modification time
                model_path = self.model_manager.model_filename
                if not os.path.exists(model_path):
                    logging.warning("Model file does not exist")
                    return {
                        "refreshed": False,
                        "reason": "Model file does not exist",
                        "current_soldiers": 0
                    }
                
                # Get file modification time
                model_mtime = os.path.getmtime(model_path)
                model_modified = datetime.fromtimestamp(model_mtime)
                
                # Check if refresh is needed
                needs_refresh = (
                    force or 
                    self.current_encodings is None or
                    self.last_refresh_time is None or
                    model_modified > self.last_refresh_time
                )
                
                if not needs_refresh:
                    if not auto_refresh:  # Don't log for auto refresh to avoid spam
                        logging.debug("Model refresh not needed")
                    return {
                        "refreshed": False,
                        "reason": "Model is up to date",
                        "current_soldiers": len(self.current_force_ids) if self.current_force_ids else 0,
                        "last_refresh": self.last_refresh_time.isoformat() if self.last_refresh_time else None
                    }
                
                # Load model
                logging.info("Refreshing face recognition model...")
                encodings, force_ids = self.model_manager.load_model_with_validation()
                
                if encodings is None or force_ids is None:
                    logging.error("Failed to load model during refresh")
                    return {
                        "refreshed": False,
                        "reason": "Failed to load model",
                        "error": "Model validation failed"
                    }
                
                # Update current model
                old_count = len(self.current_force_ids) if self.current_force_ids else 0
                new_count = len(force_ids)
                
                self.current_encodings = encodings
                self.current_force_ids = force_ids
                self.last_refresh_time = datetime.now()
                
                # Get model metadata for version info
                metadata = self.model_manager._load_metadata()
                if metadata:
                    self.current_model_version = metadata.get('version', 'unknown')
                
                refresh_type = "auto" if auto_refresh else "manual"
                logging.info(f"Model refreshed ({refresh_type}) - Soldiers: {old_count} -> {new_count}")
                
                return {
                    "refreshed": True,
                    "reason": f"Model updated ({refresh_type})",
                    "old_soldier_count": old_count,
                    "new_soldier_count": new_count,
                    "soldiers_added": new_count - old_count,
                    "model_version": self.current_model_version,
                    "refresh_time": self.last_refresh_time.isoformat()
                }
                
            except Exception as e:
                logging.error(f"Error refreshing model: {e}")
                return {
                    "refreshed": False,
                    "reason": "Refresh failed",
                    "error": str(e)
                }
    
    def get_current_model(self) -> Tuple[Optional[List], Optional[List]]:
        """
        Get the current in-memory model
        
        Returns:
            Tuple of (encodings, force_ids) or (None, None) if not loaded
        """
        with self.refresh_lock:
            return self.current_encodings, self.current_force_ids
    
    def get_model_status(self) -> Dict:
        """Get current model status and metadata"""
        with self.refresh_lock:
            return {
                "model_loaded": self.current_encodings is not None,
                "soldier_count": len(self.current_force_ids) if self.current_force_ids else 0,
                "model_version": self.current_model_version,
                "last_refresh": self.last_refresh_time.isoformat() if self.last_refresh_time else None,
                "auto_refresh_enabled": self.auto_refresh_enabled,
                "auto_refresh_interval": self.auto_refresh_interval,
                "force_ids": self.current_force_ids or []
            }
    
    def force_refresh(self) -> Dict:
        """Force immediate model refresh"""
        return self.refresh_model(force=True)
    
    def is_soldier_in_model(self, force_id: str) -> bool:
        """Check if a soldier is in the current model"""
        with self.refresh_lock:
            return (
                self.current_force_ids is not None and 
                force_id in self.current_force_ids
            )
    
    def get_soldier_index(self, force_id: str) -> Optional[int]:
        """Get the index of a soldier in the current model"""
        with self.refresh_lock:
            if self.current_force_ids and force_id in self.current_force_ids:
                return self.current_force_ids.index(force_id)
            return None


# Global instance for singleton pattern
_global_model_refresh_service = None
_service_lock = threading.Lock()

def get_model_refresh_service() -> ModelRefreshService:
    """Get the global model refresh service instance (singleton)"""
    global _global_model_refresh_service
    
    with _service_lock:
        if _global_model_refresh_service is None:
            _global_model_refresh_service = ModelRefreshService()
            # Start auto refresh by default
            _global_model_refresh_service.start_auto_refresh(300)  # 5 minutes
        
        return _global_model_refresh_service
