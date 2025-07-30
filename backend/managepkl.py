import argparse
import pickle
import os

# Path to the .pkl file
PKL_PATH = os.path.join('storage', 'models', 'face_recognition_model.pkl')

def load_pkl():
    if os.path.exists(PKL_PATH):
        with open(PKL_PATH, 'rb') as f:
            return pickle.load(f)
    else:
        return ([], [])  # (encodings, force_ids)

def save_pkl(encodings, force_ids):
    with open(PKL_PATH, 'wb') as f:
        pickle.dump((encodings, force_ids), f)

def create_from_db():
    print("This function requires database access. Please implement DB logic or use another method to populate PKL.")

def list_soldiers():
    encodings, force_ids = load_pkl()
    print(f"Total soldiers in PKL: {len(force_ids)}")
    for fid in force_ids:
        print(fid)

def delete_all():
    save_pkl([], [])
    print("All soldiers deleted from PKL.")

def delete_selected(ids):
    encodings, force_ids = load_pkl()
    new_encodings = []
    new_force_ids = []
    for enc, fid in zip(encodings, force_ids):
        if fid not in ids:
            new_encodings.append(enc)
            new_force_ids.append(fid)
    save_pkl(new_encodings, new_force_ids)
    print(f"Deleted soldiers: {ids}")

def add_soldier(force_id):
    encodings, force_ids = load_pkl()
    if force_id in force_ids:
        print(f"Soldier {force_id} already exists in PKL.")
        return
    # Dummy encoding; replace with real encoding logic
    encodings.append([])
    force_ids.append(force_id)
    save_pkl(encodings, force_ids)
    print(f"Added soldier {force_id} to PKL.")

def show_metrics(force_id):
    encodings, force_ids = load_pkl()
    if force_id in force_ids:
        idx = force_ids.index(force_id)
        print(f"Metrics for {force_id}: {encodings[idx]}")
    else:
        print(f"Soldier {force_id} not found in PKL.")

def main():
    parser = argparse.ArgumentParser(description='Manage soldiers and face metrics in PKL file')
    parser.add_argument('--create', action='store_true', help='Create PKL from DB')
    parser.add_argument('--list', action='store_true', help='List all soldiers in PKL')
    parser.add_argument('--delete-all', action='store_true', help='Delete all soldiers from PKL')
    parser.add_argument('--delete', nargs='+', help='Delete selected soldiers by force_id')
    parser.add_argument('--add', help='Add soldier by force_id')
    parser.add_argument('--show', help='Show metrics for soldier by force_id')
    args = parser.parse_args()

    if args.create:
        create_from_db()
    elif args.list:
        list_soldiers()
    elif args.delete_all:
        delete_all()
    elif args.delete:
        delete_selected(args.delete)
    elif args.add:
        add_soldier(args.add)
    elif args.show:
        show_metrics(args.show)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
