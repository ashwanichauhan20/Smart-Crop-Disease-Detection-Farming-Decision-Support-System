"""
train_full.py  —  Bulletproof Full Dataset Training
=====================================================
Uses a custom tf.data pipeline built from PRE-VERIFIED file paths.
Scans EVERY image with PIL before training starts — skips any file
that OneDrive hasn't downloaded (FileNotFoundError / OSError).
No more crashes mid-training.

Usage:
    python -u train_full.py
"""

import os
import json
import datetime
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from PIL import Image

# ─────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset')
TRAIN_DIR = os.path.join(DATA_DIR, 'train')
VAL_DIR   = os.path.join(DATA_DIR, 'val')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
MODEL_PATH         = os.path.join(MODEL_DIR, 'disease_model.h5')
BEST_CKPT_PATH     = os.path.join(MODEL_DIR, 'best_model.h5')
CLASS_INDICES_PATH = os.path.join(MODEL_DIR, 'class_indices.json')

# ─────────────────────────────────────────────────────────────────
# HYPERPARAMETERS
# ─────────────────────────────────────────────────────────────────
IMG_SIZE   = (224, 224)
BATCH_SIZE = 32
EPOCHS     = 20
LR         = 1e-4
VALID_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}

os.makedirs(MODEL_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────
# STEP 1: Scan directory, verify every file is truly readable
# ─────────────────────────────────────────────────────────────────
def scan_verified_files(split_dir):
    """
    Walks split_dir, tries to open each image file with PIL.
    Returns:
        paths  : list of absolute file paths (verified readable)
        labels : list of integer class indices
        classes: sorted list of class names (index = position)
    """
    if not os.path.isdir(split_dir):
        return [], [], []

    # Discover classes from folder names
    classes = sorted([
        d for d in os.listdir(split_dir)
        if os.path.isdir(os.path.join(split_dir, d))
    ])
    class_to_idx = {c: i for i, c in enumerate(classes)}

    paths, labels = [], []
    total, skipped = 0, 0

    print(f"  Pre-scanning {split_dir} ...")
    for cls in classes:
        cls_dir = os.path.join(split_dir, cls)
        for fname in os.listdir(cls_dir):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in VALID_EXTS:
                continue
            fpath = os.path.join(cls_dir, fname)
            total += 1

            # Quick byte-level verification: read first 64 bytes
            try:
                with open(fpath, 'rb') as f:
                    header = f.read(64)
                if len(header) < 4:
                    skipped += 1
                    continue
                # Also verify PIL can decode it
                with Image.open(fpath) as img:
                    img.verify()
            except Exception:
                skipped += 1
                continue

            paths.append(fpath)
            labels.append(class_to_idx[cls])

    print(f"    Found {total} files → {total-skipped} valid, {skipped} skipped (OneDrive/corrupt)")
    return paths, labels, classes


# ─────────────────────────────────────────────────────────────────
# STEP 2: Build tf.data.Dataset from verified path lists
# ─────────────────────────────────────────────────────────────────
def load_and_augment(path, label, augment=True):
    """Load image from disk, resize, normalize, optionally augment."""
    raw = tf.io.read_file(path)
    img = tf.image.decode_image(raw, channels=3, expand_animations=False)
    img = tf.image.resize(img, IMG_SIZE)
    img = tf.cast(img, tf.float32) / 255.0

    if augment:
        img = tf.image.random_flip_left_right(img)
        img = tf.image.random_flip_up_down(img)
        img = tf.image.random_brightness(img, max_delta=0.2)
        img = tf.image.random_contrast(img, lower=0.8, upper=1.2)
        img = tf.image.random_saturation(img, lower=0.8, upper=1.2)
        # Random rotation via crop-and-resize trick (lightweight)
        img = tf.image.random_crop(img, size=[int(IMG_SIZE[0]*0.9), int(IMG_SIZE[1]*0.9), 3])
        img = tf.image.resize(img, IMG_SIZE)

    return img, label


def make_dataset(paths, labels, augment=True, shuffle=True):
    path_ds  = tf.data.Dataset.from_tensor_slices(paths)
    label_ds = tf.data.Dataset.from_tensor_slices(labels)
    ds = tf.data.Dataset.zip((path_ds, label_ds))

    if shuffle:
        ds = ds.shuffle(buffer_size=min(len(paths), 5000), seed=42)

    ds = ds.map(
        lambda p, l: load_and_augment(p, l, augment=augment),
        num_parallel_calls=tf.data.AUTOTUNE
    )
    ds = ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    return ds


# ─────────────────────────────────────────────────────────────────
# STEP 3: Build MobileNetV2 model
# ─────────────────────────────────────────────────────────────────
def build_model(num_classes):
    base = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3)
    )
    base.trainable = False  # Frozen for Phase 1

    x = base.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.4)(x)
    out = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base.input, outputs=out)
    model.compile(
        optimizer=Adam(learning_rate=LR),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model, base


# ─────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  FULL DATASET TRAINING  —  MobileNetV2 Transfer Learning")
    print("  (OneDrive-safe: pre-verified file pipeline)")
    print("=" * 60)

    # ── 1. Scan & verify files ────────────────────────────────────
    print("\n[1] Pre-verifying training images (skipping OneDrive stubs)...")
    train_paths, train_labels, classes = scan_verified_files(TRAIN_DIR)

    print("\n[2] Pre-verifying validation images...")
    val_paths, val_labels, val_classes = scan_verified_files(VAL_DIR)

    # If val has fewer classes, map to train class indices
    if val_classes and val_classes != classes:
        val_class_to_idx = {c: classes.index(c) for c in val_classes if c in classes}
        val_paths_filtered, val_labels_filtered = [], []
        val_cls_names = sorted([
            d for d in os.listdir(VAL_DIR)
            if os.path.isdir(os.path.join(VAL_DIR, d))
        ])
        # Rebuild val labels using train class indices
        val_paths_filtered, val_labels_filtered = [], []
        for p, _ in zip(val_paths, val_labels):
            cls_name = os.path.basename(os.path.dirname(p))
            if cls_name in val_class_to_idx:
                val_paths_filtered.append(p)
                val_labels_filtered.append(val_class_to_idx[cls_name])
        val_paths, val_labels = val_paths_filtered, val_labels_filtered
        print(f"  Mapped val classes to train indices ({len(val_paths)} usable val images)")

    if len(train_paths) == 0:
        print("\n❌ No valid training images found. Check dataset path.")
        return

    num_classes = len(classes)
    print(f"\n  ✅ Training images : {len(train_paths)}")
    print(f"  ✅ Validation images: {len(val_paths)}")
    print(f"  ✅ Classes         : {num_classes}")

    # Save class map  {index -> class_name}
    idx_to_class = {str(i): c for i, c in enumerate(classes)}
    with open(CLASS_INDICES_PATH, 'w') as f:
        json.dump(idx_to_class, f, indent=2)
    print(f"  Class indices saved → {CLASS_INDICES_PATH}")

    # ── 3. Build tf.data pipelines ────────────────────────────────
    print("\n[3] Building tf.data pipelines...")
    train_ds = make_dataset(train_paths, train_labels, augment=True,  shuffle=True)
    val_ds   = make_dataset(val_paths,   val_labels,   augment=False, shuffle=False)

    # ── 4. Build model ────────────────────────────────────────────
    print(f"\n[4] Building MobileNetV2 model ({num_classes} output classes)...")
    model, base_model = build_model(num_classes)
    print(f"  Total params: {model.count_params():,}")

    # ── 5. Phase 1 callbacks ──────────────────────────────────────
    callbacks_p1 = [
        ModelCheckpoint(BEST_CKPT_PATH, monitor='val_accuracy',
                        save_best_only=True, verbose=1),
        EarlyStopping(monitor='val_accuracy', patience=5,
                      restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                          patience=3, min_lr=1e-7, verbose=1),
    ]

    # ── 6. Phase 1: Train head only ───────────────────────────────
    print(f"\n[5] Phase 1 — Training head layers (base frozen) for up to {EPOCHS} epochs...")
    start = datetime.datetime.now()

    h1 = model.fit(train_ds, validation_data=val_ds,
                   epochs=EPOCHS, callbacks=callbacks_p1, verbose=1)
    p1_best = max(h1.history.get('val_accuracy', [0]))
    print(f"\n  Phase 1 best val_accuracy = {p1_best:.4f} ({p1_best*100:.2f}%)")

    # ── 7. Phase 2: Fine-tune top 50 base layers ─────────────────
    print("\n[6] Phase 2 — Unfreezing top 50 base layers for fine-tuning...")
    base_model.trainable = True
    for layer in base_model.layers[:-50]:
        layer.trainable = False

    model.compile(
        optimizer=Adam(learning_rate=LR / 10),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    callbacks_p2 = [
        ModelCheckpoint(BEST_CKPT_PATH, monitor='val_accuracy',
                        save_best_only=True, verbose=1),
        EarlyStopping(monitor='val_accuracy', patience=5,
                      restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                          patience=3, min_lr=1e-8, verbose=1),
    ]

    h2 = model.fit(train_ds, validation_data=val_ds,
                   epochs=10, callbacks=callbacks_p2, verbose=1)
    p2_best = max(h2.history.get('val_accuracy', [0]))
    print(f"\n  Phase 2 best val_accuracy = {p2_best:.4f} ({p2_best*100:.2f}%)")

    # ── 8. Save final model ───────────────────────────────────────
    print(f"\n[7] Saving final model → {MODEL_PATH}")
    model.save(MODEL_PATH)

    elapsed = datetime.datetime.now() - start
    final_acc = max(p1_best, p2_best)

    print("\n" + "=" * 60)
    print("  ✅ TRAINING COMPLETE!")
    print(f"  Best val_accuracy : {final_acc:.4f}  ({final_acc*100:.2f}%)")
    print(f"  Total time        : {elapsed}")
    print(f"  Model saved to    : {MODEL_PATH}")
    print(f"  Best checkpoint   : {BEST_CKPT_PATH}")
    print(f"  Class indices     : {CLASS_INDICES_PATH}")
    print("\n" + "=" * 60)
    print("  ✅ AUTOMATIC POST-TRAINING VERIFICATION")
    print("=" * 60)
    
    # Check it ourselves on 5 random validation images
    import random
    if len(val_paths) > 0:
        sample_indices = random.sample(range(len(val_paths)), min(5, len(val_paths)))
        correct_predictions = 0
        for idx in sample_indices:
            img_path = val_paths[idx]
            true_label_idx = val_labels[idx]
            true_class_name = classes[true_label_idx] if true_label_idx < len(classes) else str(true_label_idx)
            
            # Predict
            img = tf.keras.preprocessing.image.load_img(img_path, target_size=IMG_SIZE)
            img_array = tf.keras.preprocessing.image.img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0) / 255.0
            
            predictions = model.predict(img_array, verbose=0)
            pred_idx = np.argmax(predictions[0])
            pred_class_name = classes[pred_idx] if pred_idx < len(classes) else str(pred_idx)
            confidence = predictions[0][pred_idx] * 100
            
            match = "✅" if pred_idx == true_label_idx else "❌"
            if pred_idx == true_label_idx:
                correct_predictions += 1
                
            print(f"  {match} True: {true_class_name.ljust(25)} | Pred: {pred_class_name.ljust(25)} | Conf: {confidence:.2f}%")
            
        print(f"\n  Final Verification Score: {correct_predictions}/{len(sample_indices)} random validation samples.")
    else:
        print("  ❌ No validation paths found to perform verification.")

    print("\n  ▶ Now start the AI server: python -u ai_app.py")


if __name__ == '__main__':
    main()
