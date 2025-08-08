#!/usr/bin/env python3
"""
Enhanced Face Model Manager with atomic operations, versioning, and validation
"""
import pickle
import os
import shutil
import threading
import hashlib
import json
import glob
from datetime import datetime
from typing import List, Tuple, Dict, Optional
import logging
import numpy as np

class FaceModelManager:
    def __init__(self):
        self.model_dir = os.path.join('storage', 'models')
        self.model_filename = os.path.join(self.model_dir, 'face_recognition_model.pkl')
        self.metadata_filename = os.path.join(self.model_dir, 'model_metadata.json')
        self.lock = threading.RLock()  # Reentrant lock for thread safety
        
        # Ensure directories exist
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
                
        self.setup_logging()
        
        # Clean up old backups on initialization
        self._cleanup_atomic_backups(keep_count=1)
        self._cleanup_migration_backups(keep_count=1)
    
    def setup_logging(self):
        logging.basicConfig(
            filename="face_model_manager.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    def _generate_model_hash(self, encodings: List, force_ids: List) -> str:
        """Generate hash of model data for integrity checking"""
        # Convert encodings to string representation for hashing
        encodings_str = str([enc.tolist() if hasattr(enc, 'tolist') else enc for enc in encodings])
        force_ids_str = str(force_ids)
        combined_data = encodings_str + force_ids_str
        return hashlib.sha256(combined_data.encode()).hexdigest()
    
    def _create_metadata(self, encodings: List, force_ids: List, version: str) -> Dict:
        """Create metadata for model version"""
        return {
            'version': version,
            'timestamp': datetime.now().isoformat(),
            'soldier_count': len(force_ids),
            'force_ids': force_ids,
            'model_hash': self._generate_model_hash(encodings, force_ids),
            'encoding_dimensions': encodings[0].shape if encodings else None
        }
    
    def _save_metadata(self, metadata: Dict):
        """Save model metadata"""
        with open(self.metadata_filename, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def _load_metadata(self) -> Optional[Dict]:
        """Load model metadata"""
        try:
            if os.path.exists(self.metadata_filename):
                with open(self.metadata_filename, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logging.error(f"Error loading metadata: {e}")
        return None
    
    def _cleanup_atomic_backups(self, keep_count: int = 1):
        """Clean up old atomic backups, keeping only the latest ones"""
        try:
            # Get all atomic backup files
            backup_pattern = os.path.join(self.model_dir, 'face_recognition_model.pkl.backup_*')
            backup_files = glob.glob(backup_pattern)
            
            if len(backup_files) <= keep_count:
                return  # Nothing to clean
            
            # Sort by timestamp (newest first)
            backup_files.sort(reverse=True)
            
            # Remove old backups (keep only the newest ones)
            for backup_file in backup_files[keep_count:]:
                try:
                    os.remove(backup_file)
                    logging.info(f"Removed old atomic backup: {os.path.basename(backup_file)}")
                except Exception as e:
                    logging.error(f"Error removing backup {backup_file}: {e}")
                    
        except Exception as e:
            logging.error(f"Error cleaning up atomic backups: {e}")
    
    def _cleanup_migration_backups(self, keep_count: int = 1):
        """Clean up old migration backups, keeping only the latest ones"""
        try:
            migration_dir = os.path.join(self.model_dir, 'migration_backup')
            if not os.path.exists(migration_dir):
                return
            
            # Get all migration backup files
            migration_files = []
            for file in os.listdir(migration_dir):
                if file.startswith('face_model_') and file.endswith('.pkl'):
                    migration_files.append(os.path.join(migration_dir, file))
            
            if len(migration_files) <= keep_count:
                return  # Nothing to clean
            
            # Sort by modification time (newest first)
            migration_files.sort(key=os.path.getmtime, reverse=True)
            
            # Remove old migration backups
            for migration_file in migration_files[keep_count:]:
                try:
                    os.remove(migration_file)
                    logging.info(f"Removed old migration backup: {os.path.basename(migration_file)}")
                except Exception as e:
                    logging.error(f"Error removing migration backup {migration_file}: {e}")
                    
        except Exception as e:
            logging.error(f"Error cleaning up migration backups: {e}")
    
    def atomic_save_model(self, encodings: List, force_ids: List, version: Optional[str] = None) -> bool:
        """
        Atomically save model with backup and validation
        """
        with self.lock:
            try:
                # Generate version if not provided
                if not version:
                    version = datetime.now().strftime("%Y%m%d_%H%M%S")
                
                # Create temporary file for atomic write
                temp_filename = self.model_filename + '.tmp'
                temp_metadata = self.metadata_filename + '.tmp'
                
                # Save to temporary files
                with open(temp_filename, "wb") as f:
                    pickle.dump((encodings, force_ids), f)
                
                # Create and save metadata
                metadata = self._create_metadata(encodings, force_ids, version)
                with open(temp_metadata, 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                # Validate the saved data
                with open(temp_filename, "rb") as f:
                    test_data = pickle.load(f)
                
                # Handle both formats for validation
                if isinstance(test_data, dict):
                    test_encodings = test_data['encodings']
                    test_force_ids = test_data['force_ids']
                else:
                    test_encodings, test_force_ids = test_data
                
                # Verify integrity
                if len(test_encodings) != len(encodings) or test_force_ids != force_ids:
                    raise ValueError("Model validation failed after save")
                
                # Atomic move to final location
                if os.name == 'nt':  # Windows
                    if os.path.exists(self.model_filename):
                        os.replace(temp_filename, self.model_filename)
                        os.replace(temp_metadata, self.metadata_filename)
                    else:
                        os.rename(temp_filename, self.model_filename)
                        os.rename(temp_metadata, self.metadata_filename)
                else:  # Unix-like
                    os.rename(temp_filename, self.model_filename)
                    os.rename(temp_metadata, self.metadata_filename)
                
                # Clean up old backups after successful save
                self._cleanup_atomic_backups(keep_count=1)
                self._cleanup_migration_backups(keep_count=1)
                
                logging.info(f"Model saved atomically - Version: {version}, Soldiers: {len(force_ids)}")
                return True
                
            except Exception as e:
                logging.error(f"Error in atomic save: {e}")
                
                # Cleanup temp files if they exist
                for temp_file in [temp_filename, temp_metadata]:
                    if os.path.exists(temp_file):
                        try:
                            os.remove(temp_file)
                        except:
                            pass
                
                return False
    
    def load_model_with_validation(self) -> Tuple[Optional[List], Optional[List]]:
        """
        Load model with integrity validation
        """
        with self.lock:
            try:
                if not os.path.exists(self.model_filename):
                    logging.warning("Model file does not exist")
                    return None, None
                
                # Load model data
                with open(self.model_filename, "rb") as f:
                    data = pickle.load(f)
                
                # Handle both old tuple format and new dict format
                if isinstance(data, dict):
                    encodings = data['encodings']
                    force_ids = data['force_ids']
                else:
                    encodings, force_ids = data
                
                # Load and validate metadata if exists
                metadata = self._load_metadata()
                if metadata:
                    # Verify hash
                    current_hash = self._generate_model_hash(encodings, force_ids)
                    if current_hash != metadata.get('model_hash'):
                        logging.warning("Model hash mismatch - possible corruption")
                    
                    # Verify soldier count
                    if len(force_ids) != metadata.get('soldier_count', 0):
                        logging.warning("Soldier count mismatch in metadata")
                
                logging.info(f"Model loaded successfully - {len(force_ids)} soldiers")
                return encodings, force_ids
                
            except Exception as e:
                logging.error(f"Error loading model: {e}")
                return None, None
    
    def add_soldiers_incremental(self, new_encodings: List, new_force_ids: List) -> bool:
        """
        Add new soldiers to existing model incrementally
        """
        with self.lock:
            try:
                # Load existing model
                existing_encodings, existing_force_ids = self.load_model_with_validation()
                if existing_encodings is None:
                    existing_encodings, existing_force_ids = [], []
                
                # Check for duplicates
                duplicates = set(new_force_ids) & set(existing_force_ids)
                if duplicates:
                    logging.warning(f"Duplicate force IDs found: {duplicates}")
                    # Remove duplicates from new data
                    filtered_encodings = []
                    filtered_force_ids = []
                    for enc, fid in zip(new_encodings, new_force_ids):
                        if fid not in existing_force_ids:
                            filtered_encodings.append(enc)
                            filtered_force_ids.append(fid)
                    new_encodings, new_force_ids = filtered_encodings, filtered_force_ids
                
                # Combine data
                combined_encodings = existing_encodings + new_encodings
                combined_force_ids = existing_force_ids + new_force_ids
                
                # Save atomically
                return self.atomic_save_model(combined_encodings, combined_force_ids)
                
            except Exception as e:
                logging.error(f"Error in incremental add: {e}")
                return False
    
    def remove_soldiers(self, force_ids_to_remove: List[str]) -> bool:
        """
        Remove soldiers from model
        """
        with self.lock:
            try:
                # Load existing model
                encodings, force_ids = self.load_model_with_validation()
                if encodings is None:
                    logging.error("Cannot remove soldiers - model not loaded")
                    return False
                
                # Filter out soldiers to remove
                new_encodings = []
                new_force_ids = []
                removed_count = 0
                
                for enc, fid in zip(encodings, force_ids):
                    if fid not in force_ids_to_remove:
                        new_encodings.append(enc)
                        new_force_ids.append(fid)
                    else:
                        removed_count += 1
                
                if removed_count == 0:
                    logging.warning("No soldiers found to remove")
                    return True
                
                # Save updated model
                success = self.atomic_save_model(new_encodings, new_force_ids)
                if success:
                    logging.info(f"Successfully removed {removed_count} soldiers")
                
                return success
                
            except Exception as e:
                logging.error(f"Error removing soldiers: {e}")
                return False
    
    def get_model_info(self) -> Dict:
        """
        Get comprehensive model information
        """
        with self.lock:
            try:
                encodings, force_ids = self.load_model_with_validation()
                metadata = self._load_metadata()
                
                info = {
                    'model_exists': encodings is not None,
                    'total_encodings': len(force_ids) if force_ids else 0,
                    'unique_soldiers': len(set(force_ids)) if force_ids else 0,
                    'avg_encodings_per_soldier': round(len(force_ids) / len(set(force_ids)), 1) if force_ids else 0,
                    'soldier_count': len(set(force_ids)) if force_ids else 0,  # Keep for backwards compatibility
                    'force_ids': force_ids or [],
                    'metadata': metadata,
                    'encoding_dimensions': encodings[0].shape if encodings else None,
                    'model_size_bytes': os.path.getsize(self.model_filename) if os.path.exists(self.model_filename) else 0
                }
                
                return info
                
            except Exception as e:
                logging.error(f"Error getting model info: {e}")
                return {'error': str(e)}
    
    def validate_model_integrity(self) -> Dict:
        """
        Comprehensive model integrity check
        """
        with self.lock:
            try:
                results = {
                    'valid': True,
                    'issues': [],
                    'details': {}
                }
                
                # Check if model file exists
                if not os.path.exists(self.model_filename):
                    results['valid'] = False
                    results['issues'].append("Model file does not exist")
                    return results
                
                # Load and validate model
                encodings, force_ids = self.load_model_with_validation()
                if encodings is None:
                    results['valid'] = False
                    results['issues'].append("Failed to load model")
                    return results
                
                # Check data consistency
                if len(encodings) != len(force_ids):
                    results['valid'] = False
                    results['issues'].append(f"Encoding count ({len(encodings)}) != Force ID count ({len(force_ids)})")
                
                # Check for unusual encoding counts per soldier (instead of duplicates)
                from collections import Counter
                force_id_counts = Counter(force_ids)
                
                # Multiple encodings per soldier is normal (~30 per soldier)
                unusual_counts = {}
                for fid, count in force_id_counts.items():
                    if count < 15 or count > 50:  # Allow reasonable range
                        unusual_counts[fid] = count
                
                if unusual_counts:
                    results['issues'].append(f"Soldiers with unusual encoding counts: {unusual_counts}")
                    # Don't mark as invalid unless severely abnormal
                    severe_issues = {fid: count for fid, count in unusual_counts.items() if count < 5 or count > 100}
                    if severe_issues:
                        results['valid'] = False
                
                # Check encoding dimensions
                if encodings:
                    expected_dim = 128
                    for i, enc in enumerate(encodings):
                        if not hasattr(enc, 'shape') or enc.shape != (expected_dim,):
                            results['valid'] = False
                            results['issues'].append(f"Invalid encoding dimensions for soldier {force_ids[i]}: expected ({expected_dim},), got {getattr(enc, 'shape', 'unknown')}")
                            break
                
                results['details'] = {
                    'total_encodings': len(force_ids),
                    'unique_soldiers': len(set(force_ids)),
                    'avg_encodings_per_soldier': round(len(force_ids) / len(set(force_ids)), 1) if force_ids else 0,
                    'encoding_dimensions': encodings[0].shape if encodings else None,
                    'model_size_bytes': os.path.getsize(self.model_filename)
                }
                
                return results
                
            except Exception as e:
                return {
                    'valid': False,
                    'issues': [f"Validation error: {str(e)}"],
                    'details': {}
                }
