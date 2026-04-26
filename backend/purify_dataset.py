import os
import hashlib

# Path Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset', 'train')

def get_hash(file_path):
    """Generates an MD5 hash of the file content."""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def purify_directory(parent_path):
    if not os.path.exists(parent_path):
        print(f"Directory not found: {parent_path}")
        return

    print(f"Purifying: {parent_path}")
    subdirs = [os.path.join(parent_path, d) for d in os.listdir(parent_path) if os.path.isdir(os.path.join(parent_path, d))]
    
    total_deleted = 0
    for sd in subdirs:
        hashes = {}
        duplicates = []
        files = [os.path.join(sd, f) for f in os.listdir(sd) if os.path.isfile(os.path.join(sd, f))]
        
        for f in files:
            h = get_hash(f)
            if h in hashes:
                duplicates.append(f)
            else:
                hashes[h] = f
        
        # Delete duplicates
        for d in duplicates:
            try:
                os.remove(d)
                total_deleted += 1
            except Exception as e:
                print(f"Error deleting {d}: {e}")
                
        if duplicates:
            print(f"  Removed {len(duplicates)} duplicate(s) from {os.path.basename(sd)}")

    print(f"\nPurification complete! A total of {total_deleted} duplicate image(s) were removed.")

if __name__ == "__main__":
    purify_directory(DATA_DIR)
