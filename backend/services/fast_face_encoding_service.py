#!/usr/bin/env python3
"""
Fast Face Encoding Service with Parallel Processing and Quality Control
"""
import os
import cv2
import face_recognition
import numpy as np
import concurrent.futures
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime

class FastFaceEncodingService:
    def __init__(self, max_workers: int = 1):  # Reduced to 1 for maximum stability
        self.max_workers = 1  # Force single-threaded processing to prevent crashes
        self.setup_logging()
    
    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def encode_faces_parallel(self, image_paths: List[str]) -> List[np.ndarray]:
        """
        Process face encodings with fallback to sequential processing for stability
        
        Args:
            image_paths: List of paths to image files
            
        Returns:
            List of face encodings (numpy arrays)
        """
        if not image_paths:
            return []
            
        self.logger.info(f"Processing {len(image_paths)} images")
        start_time = datetime.now()
        
        # Use sequential processing for maximum stability
        try:
            encodings_with_quality = []
            for i, path in enumerate(image_paths):
                self.logger.info(f"Processing image {i+1}/{len(image_paths)}: {os.path.basename(path)}")
                try:
                    result = self._encode_single_image_with_quality(path)
                    if result is not None:
                        encodings_with_quality.append(result)
                        self.logger.info(f"Successfully processed {os.path.basename(path)} (quality: {result['quality_score']:.2f})")
                    else:
                        self.logger.warning(f"No face detected in {os.path.basename(path)}")
                except Exception as e:
                    self.logger.error(f"Error processing {os.path.basename(path)}: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"Critical error in face encoding: {e}")
            return []
        
        # Sort by quality and return best encodings
        if not encodings_with_quality:
            self.logger.error("No valid face encodings found")
            return []
            
        encodings_with_quality.sort(key=lambda x: x['quality_score'], reverse=True)
        
        # Take top encodings (max 12 for optimization)
        max_encodings = min(12, len(encodings_with_quality))
        best_encodings = [item['encoding'] for item in encodings_with_quality[:max_encodings]]
        
        processing_time = (datetime.now() - start_time).total_seconds()
        self.logger.info(f"Processed {len(image_paths)} images in {processing_time:.2f}s, selected {len(best_encodings)} best encodings")
        
        return best_encodings
    
    def _encode_single_image_with_quality(self, image_path: str) -> Optional[Dict]:
        """
        Encode single image with quality assessment and enhanced error handling
        
        Args:
            image_path: Path to image file
            
        Returns:
            Dict with encoding and quality score, or None if failed
        """
        try:
            # Verify file exists and is readable
            if not os.path.exists(image_path):
                self.logger.error(f"Image file does not exist: {image_path}")
                return None
                
            # Load and process image with error handling
            try:
                image = face_recognition.load_image_file(image_path)
            except Exception as e:
                self.logger.error(f"Failed to load image {image_path}: {e}")
                return None
                
            if image is None or image.size == 0:
                self.logger.error(f"Image is None or empty after loading: {image_path}")
                return None
            
            # Detect faces with error handling
            try:
                face_locations = face_recognition.face_locations(image, model="hog")  # Faster HOG model
            except Exception as e:
                self.logger.error(f"Face detection failed for {image_path}: {e}")
                # Clean up image from memory
                del image
                return None
                
            if not face_locations:
                self.logger.debug(f"No faces detected in {image_path}")
                # Clean up image from memory
                del image
                return None
            
            # Get face encoding with error handling
            try:
                face_encodings = face_recognition.face_encodings(image, face_locations)
            except Exception as e:
                self.logger.error(f"Face encoding failed for {image_path}: {e}")
                # Clean up image from memory
                del image
                return None
                
            if not face_encodings:
                self.logger.debug(f"No face encodings generated for {image_path}")
                # Clean up image from memory
                del image
                return None
            
            # Calculate quality score with error handling
            try:
                quality_score = self._calculate_image_quality(image, face_locations[0])
            except Exception as e:
                self.logger.warning(f"Quality calculation failed for {image_path}, using default: {e}")
                quality_score = 50.0  # Default quality score
            
            # Store the encoding before cleaning up
            encoding = face_encodings[0].copy()  # Make a copy before cleanup
            
            # Clean up image from memory
            del image
            del face_locations
            del face_encodings
            
            return {
                'encoding': encoding,
                'quality_score': quality_score,
                'path': image_path
            }
            
        except Exception as e:
            self.logger.error(f"Unexpected error encoding {image_path}: {e}")
            return None
    
    def _calculate_image_quality(self, image: np.ndarray, face_location: Tuple) -> float:
        """
        Calculate quality score for face image
        
        Args:
            image: RGB image array
            face_location: Tuple of (top, right, bottom, left)
            
        Returns:
            Quality score (0-100, higher is better)
        """
        top, right, bottom, left = face_location
        
        # Initialize quality score
        quality_score = 0.0
        
        # Face size quality (30 points max)
        face_area = (right - left) * (bottom - top)
        image_area = image.shape[0] * image.shape[1]
        face_ratio = face_area / image_area
        
        if face_ratio > 0.05:  # Face is >5% of image
            quality_score += min(30, face_ratio * 600)  # Cap at 30 points
        
        # Face position quality (25 points max)
        face_center_x = (left + right) / 2
        face_center_y = (top + bottom) / 2
        image_center_x = image.shape[1] / 2
        image_center_y = image.shape[0] / 2
        
        # Distance from center (normalized)
        center_distance = np.sqrt(
            ((face_center_x - image_center_x) / image.shape[1])**2 +
            ((face_center_y - image_center_y) / image.shape[0])**2
        )
        
        # Closer to center = higher score
        quality_score += max(0, 25 * (1 - center_distance * 2))
        
        # Brightness quality (25 points max)
        face_region = image[top:bottom, left:right]
        brightness = np.mean(face_region)
        
        # Optimal brightness range: 80-180
        if 80 <= brightness <= 180:
            quality_score += 25
        elif 60 <= brightness < 80 or 180 < brightness <= 200:
            quality_score += 15  # Acceptable range
        elif 40 <= brightness < 60 or 200 < brightness <= 220:
            quality_score += 5   # Poor but usable
        
        # Sharpness quality (20 points max)
        try:
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            sharpness = cv2.Laplacian(gray_face, cv2.CV_64F).var()
            
            # Normalize sharpness score
            if sharpness > 500:
                quality_score += 20
            elif sharpness > 200:
                quality_score += 15
            elif sharpness > 100:
                quality_score += 10
            elif sharpness > 50:
                quality_score += 5
        except Exception:
            pass  # Skip sharpness if conversion fails
        
        return min(100, quality_score)  # Cap at 100
    
    def validate_encoding_diversity(self, encodings: List[np.ndarray]) -> Dict:
        """
        Validate that encodings have good diversity
        
        Args:
            encodings: List of face encodings
            
        Returns:
            Dict with validation results
        """
        if len(encodings) < 3:
            return {
                'valid': False,
                'reason': 'Too few encodings',
                'diversity_score': 0.0
            }
        
        # Calculate pairwise distances
        distances = []
        for i in range(len(encodings)):
            for j in range(i + 1, len(encodings)):
                distance = np.linalg.norm(encodings[i] - encodings[j])
                distances.append(distance)
        
        avg_distance = np.mean(distances)
        std_distance = np.std(distances)
        
        # Good encoding set has moderate diversity
        # Too similar = overfitting, too different = poor quality
        if 0.2 < avg_distance < 0.7:
            return {
                'valid': True,
                'diversity_score': avg_distance,
                'std_deviation': std_distance,
                'reason': 'Good diversity'
            }
        elif avg_distance <= 0.2:
            return {
                'valid': False,
                'diversity_score': avg_distance,
                'reason': 'Encodings too similar - may need more varied poses'
            }
        else:
            return {
                'valid': False,
                'diversity_score': avg_distance,
                'reason': 'Encodings too different - may indicate quality issues'
            }
    
    def select_best_encodings(self, image_paths: List[str], target_count: int = 8) -> List[np.ndarray]:
        """
        Select best quality encodings from available images
        
        Args:
            image_paths: List of image file paths
            target_count: Desired number of encodings
            
        Returns:
            List of best quality face encodings
        """
        # Get all encodings with quality scores
        all_results = []
        
        for path in image_paths:
            result = self._encode_single_image_with_quality(path)
            if result:
                all_results.append(result)
        
        if not all_results:
            return []
        
        # Sort by quality and take top N
        all_results.sort(key=lambda x: x['quality_score'], reverse=True)
        target_count = min(target_count, len(all_results))
        
        best_encodings = [result['encoding'] for result in all_results[:target_count]]
        
        # Validate diversity
        validation = self.validate_encoding_diversity(best_encodings)
        self.logger.info(f"Selected {len(best_encodings)} encodings - {validation['reason']}")
        
        return best_encodings


# Singleton instance
_fast_encoding_service = None

def get_fast_encoding_service() -> FastFaceEncodingService:
    """Get singleton instance of FastFaceEncodingService"""
    global _fast_encoding_service
    if _fast_encoding_service is None:
        _fast_encoding_service = FastFaceEncodingService()
    return _fast_encoding_service
