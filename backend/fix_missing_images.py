"""
fix_missing_images.py
======================
Scans every image in the plant_disease_dataset (train/val/test).
Tries to open each one with PIL.
Removes any file that:
  - Cannot be opened (OneDrive cloud-only stub / corrupt file)
  - Is zero bytes
  - Has an unreadable format

Run ONCE before training.
"""

import os
import sys
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset')

VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}

def test_and_clean(split_name):
    split_path = os.path.join(DATA_DIR, split_name)
    if not os.path.exists(split_path):
        print(f"  [SKIP] '{split_name}' not found.")
        return 0, 0

    total = 0
    removed = 0

    for class_name in sorted(os.listdir(split_path)):
        class_path = os.path.join(split_path, class_name)
        if not os.path.isdir(class_path):
            continue

        for fname in os.listdir(class_path):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in VALID_EXTENSIONS:
                continue

            fpath = os.path.join(class_path, fname)
            total += 1

            # Check 1: Zero-byte file (classic OneDrive stub)
            try:
                size = os.path.getsize(fpath)
                if size == 0:
                    os.remove(fpath)
                    removed += 1
                    print(f"  [REMOVED - empty]  {class_name}/{fname}")
                    continue
            except OSError:
                try:
                    os.remove(fpath)
                except Exception:
                    pass
                removed += 1
                print(f"  [REMOVED - OSError] {class_name}/{fname}")
                continue

            # Check 2: Try actually opening with PIL
            try:
                with Image.open(fpath) as img:
                    img.verify()   # Checks file integrity without full decode
            except Exception:
                # verify() leaves file in broken state — re-open to confirm
                try:
                    with Image.open(fpath) as img2:
                        img2.load()   # Force full decode
                except Exception as e2:
                    try:
                        os.remove(fpath)
                    except Exception:
                        pass
                    removed += 1
                    print(f"  [REMOVED - corrupt] {class_name}/{fname}  ({type(e2).__name__})")
                    continue

    return total, removed


def main():
    print("=" * 60)
    print("  IMAGE DATASET INTEGRITY CHECK & CLEANUP")
    print("=" * 60)
    print(f"\n  Dataset root: {DATA_DIR}\n")

    grand_total   = 0
    grand_removed = 0

    for split in ['train', 'val', 'test']:
        print(f"\n[{split.upper()}]")
        total, removed = test_and_clean(split)
        grand_total   += total
        grand_removed += removed
        good = total - removed
        print(f"  Scanned: {total}  |  Removed: {removed}  |  Valid: {good}")

    print("\n" + "=" * 60)
    print(f"  DONE!  Total scanned: {grand_total}")
    print(f"         Total removed: {grand_removed}")
    print(f"         Total valid  : {grand_total - grand_removed}")
    print("=" * 60)

    if grand_removed > 0:
        print("\n✅ Cleanup complete. You can now run: python train_full.py")
    else:
        print("\n✅ All images are valid — no cleanup needed.")
        print("   Run: python train_full.py")

if __name__ == '__main__':
    main()
