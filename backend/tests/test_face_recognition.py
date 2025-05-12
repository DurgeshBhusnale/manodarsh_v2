import os
import cv2
import face_recognition
import pickle
from pathlib import Path

def test_face_recognition():
    # Load the trained model
    model_path = Path("storage/models/face_recognition_model.pkl")
    
    if not model_path.exists():
        print(f"Error: Model file not found at {model_path}")
        return
        
    print("Loading model...")
    with open(model_path, "rb") as f:
        known_face_encodings, known_force_ids = pickle.load(f)
    
    # Load a test image
    test_image_path = "tests/test_images/test_soldier_100000005.jpg"
    
    if not os.path.exists(test_image_path):
        print(f"Please place a test image at {test_image_path}")
        return
        
    print("Processing test image...")
    # Load and encode the test image
    test_image = face_recognition.load_image_file(test_image_path)
    test_face_encodings = face_recognition.face_encodings(test_image)
    
    if not test_face_encodings:
        print("No face detected in test image!")
        return
        
    # Compare with known faces
    matches = face_recognition.compare_faces(known_face_encodings, test_face_encodings[0])
    
    if True in matches:
        first_match_index = matches.index(True)
        recognized_force_id = known_force_ids[first_match_index]
        print(f"✅ Success! Recognized soldier with Force ID: {recognized_force_id}")
    else:
        print("❌ No match found - Face not recognized")

if __name__ == "__main__":
    test_face_recognition()