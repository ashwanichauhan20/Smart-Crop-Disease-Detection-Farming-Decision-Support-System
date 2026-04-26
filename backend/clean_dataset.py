import os
import shutil
import re
from PIL import Image

# Path Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset')

def clean_name(name):
    """Replaces spaces, dots, and parentheses with underscores."""
    cleaned = re.sub(r'[^a-zA-Z0-9]', '_', name)
    cleaned = re.sub(r'_+', '_', cleaned) # remove duplicate underscores
    return cleaned.strip('_')

def process_directory(parent_path):
    if not os.path.exists(parent_path):
        print(f"Directory not found: {parent_path}")
        return

    print(f"Processing: {parent_path}")
    subdirs = [d for d in os.listdir(parent_path) if os.path.isdir(os.path.join(parent_path, d))]
    
    for old_dir in subdirs:
        new_dir_name = clean_name(old_dir)
        old_dir_path = os.path.join(parent_path, old_dir)
        new_dir_path = os.path.join(parent_path, new_dir_name)
        
        # 1. Rename files inside first
        for filename in os.listdir(old_dir_path):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                old_file_path = os.path.join(old_dir_path, filename)
                
                # Fast rename (SKIP corruption check for speed)
                ext = os.path.splitext(filename)[1].lower()
                clean_filename = clean_name(os.path.splitext(filename)[0]) + ext
                new_file_path = os.path.join(old_dir_path, clean_filename)
                
                if old_file_path != new_file_path:
                    if os.path.exists(new_file_path):
                         os.remove(new_file_path)
                    os.rename(old_file_path, new_file_path)

        # 2. Rename the directory itself
        if old_dir_path != new_dir_path:
            print(f"Renaming folder: {old_dir} -> {new_dir_name}")
            if os.path.exists(new_dir_path):
                # Merge if exists
                for f in os.listdir(old_dir_path):
                    shutil.move(os.path.join(old_dir_path, f), os.path.join(new_dir_path, f))
                os.rmdir(old_dir_path)
            else:
                os.rename(old_dir_path, new_dir_path)

if __name__ == "__main__":
    for part in ['train', 'val', 'test']:
        process_directory(os.path.join(DATA_DIR, part))
    print("\nDataset cleaning complete!")
