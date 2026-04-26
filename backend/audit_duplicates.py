import os
import hashlib

def get_hash(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def check_duplicates(path):
    print(f"Checking duplicates in: {path}")
    files = [os.path.join(path, f) for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
    hashes = {}
    duplicates = []
    for f in files:
        h = get_hash(f)
        if h in hashes:
            duplicates.append((f, hashes[h]))
        else:
            hashes[h] = f
    return duplicates

TRAIN_DIR = r"c:\Users\sushi\OneDrive\Desktop\Smart Crop Disease Detection-Farming Decision Support System\backend\data\cnn model dataset\plant_disease_dataset\train"
# Check the first few subdirectories
subdirs = [os.path.join(TRAIN_DIR, d) for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))][:5]

for sd in subdirs:
    dupes = check_duplicates(sd)
    if dupes:
        print(f"Found {len(dupes)} duplicates in {os.path.basename(sd)}")
        # Print a few examples
        for d in dupes[:3]:
            print(f"  {os.path.basename(d[0])} is a duplicate of {os.path.basename(d[1])}")
    else:
        print(f"No duplicates found in {os.path.basename(sd)}")
