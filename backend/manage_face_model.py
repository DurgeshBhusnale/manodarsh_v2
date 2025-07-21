#!/usr/bin/env python3
"""
Face Recognition Model Management Script
This script helps manage the face recognition model for the CRPF system.
"""

import pickle
import os
import shutil
from datetime import datetime
import sys

def load_face_model():
    """Load the current face recognition model"""
    model_path = os.path.join('storage', 'models', 'face_recognition_model.pkl')
    
    if not os.path.exists(model_path):
        print("❌ Face recognition model not found!")
        return None, None
    
    try:
        with open(model_path, "rb") as f:
            known_face_encodings, known_force_ids = pickle.load(f)
        return known_face_encodings, known_force_ids
    except Exception as e:
        print(f"❌ Error loading face model: {e}")
        return None, None

def backup_face_model():
    """Create a backup of the current face model"""
    model_path = os.path.join('storage', 'models', 'face_recognition_model.pkl')
    if not os.path.exists(model_path):
        print("❌ No face model to backup")
        return False
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join('storage', 'models', f'face_recognition_model_backup_{timestamp}.pkl')
    
    try:
        shutil.copy2(model_path, backup_path)
        print(f"✅ Face model backed up to: {backup_path}")
        return True
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False

def show_model_info():
    """Show information about the current face model"""
    print("=== Face Recognition Model Information ===")
    
    known_face_encodings, known_force_ids = load_face_model()
    if known_face_encodings is None:
        return
    
    print(f"📊 Total trained soldiers: {len(known_force_ids)}")
    print(f"🆔 Force IDs in model:")
    for i, force_id in enumerate(known_force_ids):
        print(f"   {i+1}. {force_id}")
    
    print(f"📏 Face encoding dimensions: {known_face_encodings[0].shape if known_face_encodings else 'N/A'}")

def remove_soldier_from_model(force_id_to_remove):
    """Remove a specific soldier from the face recognition model"""
    print(f"=== Removing Soldier {force_id_to_remove} from Face Model ===")
    
    # Load current model
    known_face_encodings, known_force_ids = load_face_model()
    if known_face_encodings is None:
        return False
    
    # Check if soldier exists
    if force_id_to_remove not in known_force_ids:
        print(f"❌ Soldier {force_id_to_remove} not found in face model")
        print(f"Available Force IDs: {known_force_ids}")
        return False
    
    # Create backup first
    print("📦 Creating backup...")
    if not backup_face_model():
        print("❌ Failed to create backup. Aborting removal.")
        return False
    
    # Remove soldier
    try:
        # Find index of soldier to remove
        soldier_index = known_force_ids.index(force_id_to_remove)
        
        # Remove from both lists
        new_face_encodings = [enc for i, enc in enumerate(known_face_encodings) if i != soldier_index]
        new_force_ids = [fid for fid in known_force_ids if fid != force_id_to_remove]
        
        # Save updated model
        model_path = os.path.join('storage', 'models', 'face_recognition_model.pkl')
        with open(model_path, "wb") as f:
            pickle.dump((new_face_encodings, new_force_ids), f)
        
        print(f"✅ Successfully removed soldier {force_id_to_remove}")
        print(f"📊 Soldiers remaining: {len(new_force_ids)}")
        print(f"🆔 Remaining Force IDs: {new_force_ids}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error removing soldier: {e}")
        return False

def update_soldier_id(old_force_id, new_force_id):
    """Update a soldier's Force ID in the face model"""
    print(f"=== Updating Soldier ID: {old_force_id} → {new_force_id} ===")
    
    # Load current model
    known_face_encodings, known_force_ids = load_face_model()
    if known_face_encodings is None:
        return False
    
    # Check if old soldier exists
    if old_force_id not in known_force_ids:
        print(f"❌ Soldier {old_force_id} not found in face model")
        return False
    
    # Check if new soldier ID already exists
    if new_force_id in known_force_ids:
        print(f"❌ Soldier {new_force_id} already exists in face model")
        return False
    
    # Create backup first
    print("📦 Creating backup...")
    if not backup_face_model():
        print("❌ Failed to create backup. Aborting update.")
        return False
    
    try:
        # Update the Force ID
        updated_force_ids = [new_force_id if fid == old_force_id else fid for fid in known_force_ids]
        
        # Save updated model
        model_path = os.path.join('storage', 'models', 'face_recognition_model.pkl')
        with open(model_path, "wb") as f:
            pickle.dump((known_face_encodings, updated_force_ids), f)
        
        print(f"✅ Successfully updated soldier ID: {old_force_id} → {new_force_id}")
        print(f"📊 Total soldiers: {len(updated_force_ids)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating soldier ID: {e}")
        return False

def clear_all_faces():
    """Clear all faces from the model (use with caution!)"""
    print("=== ⚠️  CLEARING ALL FACES FROM MODEL ⚠️ ===")
    print("This will remove ALL trained faces from the face recognition model!")
    
    confirm = input("Are you sure? Type 'DELETE ALL' to confirm: ").strip()
    if confirm != "DELETE ALL":
        print("❌ Operation cancelled")
        return False
    
    # Create backup first
    print("📦 Creating backup...")
    if not backup_face_model():
        print("❌ Failed to create backup. Aborting clear operation.")
        return False
    
    try:
        # Create empty model
        empty_encodings = []
        empty_force_ids = []
        
        # Save empty model
        model_path = os.path.join('storage', 'models', 'face_recognition_model.pkl')
        with open(model_path, "wb") as f:
            pickle.dump((empty_encodings, empty_force_ids), f)
        
        print("✅ All faces cleared from model")
        print("ℹ️  You will need to retrain faces for all soldiers")
        
        return True
        
    except Exception as e:
        print(f"❌ Error clearing faces: {e}")
        return False

def main():
    """Main menu for face model management"""
    print("CRPF Face Recognition Model Management")
    print("=" * 50)
    
    while True:
        print("\n📋 Available Actions:")
        print("1. Show model information")
        print("2. Remove soldier from model")
        print("3. Update soldier Force ID")
        print("4. Create backup")
        print("5. Clear all faces (⚠️ DANGEROUS)")
        print("6. Exit")
        
        choice = input("\nSelect an option (1-6): ").strip()
        
        if choice == "1":
            show_model_info()
            
        elif choice == "2":
            show_model_info()
            force_id = input("\nEnter Force ID to remove: ").strip()
            if force_id:
                remove_soldier_from_model(force_id)
            
        elif choice == "3":
            show_model_info()
            old_id = input("\nEnter current Force ID: ").strip()
            new_id = input("Enter new Force ID: ").strip()
            if old_id and new_id:
                update_soldier_id(old_id, new_id)
                
        elif choice == "4":
            backup_face_model()
            
        elif choice == "5":
            clear_all_faces()
            
        elif choice == "6":
            print("👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid option. Please try again.")

if __name__ == "__main__":
    main()
