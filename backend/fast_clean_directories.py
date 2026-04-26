import os
import re

# Path Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset')

def clean_name(name):
    """Replaces spaces and parentheses with underscores."""
    cleaned = re.sub(r'[^a-zA-Z0-9]', '_', name)
    cleaned = re.sub(r'_+', '_', cleaned) # remove duplicate underscores
    return cleaned.strip('_')

def fast_process_directory(parent_path):
    if not os.path.exists(parent_path):
        print(f"Directory not found: {parent_path}")
        return

    print(f"Processing: {parent_path}")
    subdirs = [d for d in os.listdir(parent_path) if os.path.isdir(os.path.join(parent_path, d))]
    
    for old_dir in subdirs:
        new_dir_name = clean_name(old_dir)
        old_dir_path = os.path.join(parent_path, old_dir)
        new_dir_path = os.path.join(parent_path, new_dir_name)
        
        # 1. Faster subdirectory cleaning
        if old_dir != new_dir_name:
            print(f"Renaming folder: {old_dir} -> {new_dir_name}")
            if os.path.exists(new_dir_path):
                 # Merge if exists
                 for f in os.listdir(old_dir_path):
                      try:
                           os.rename(os.path.join(old_dir_path, f), os.path.join(new_dir_path, f))
                      except:
                           pass
                 os.rmdir(old_dir_path)
            else:
                 os.rename(old_dir_path, new_dir_path)

if __name__ == "__main__":
    for part in ['train', 'val', 'test']:
        fast_process_directory(os.path.join(DATA_DIR, part))
    print("\nFast Directory cleaning complete!")
