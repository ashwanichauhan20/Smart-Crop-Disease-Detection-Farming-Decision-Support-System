import os
import json
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset')
TRAIN_DIR = os.path.join(DATA_DIR, 'train')

MODEL_DIR = os.path.join(BASE_DIR, 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'disease_model.h5')
CLASS_INDICES_PATH = os.path.join(MODEL_DIR, 'class_indices.json')

# Hyperparameters
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 1  # Keeping it at 1 for fast start. Set to 80 for full training.

def build_model(num_classes):
    # Load MobileNetV2 pretrained on ImageNet
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3))
    
    # Freeze the base layers (first 100 layers)
    for layer in base_model.layers[:100]:
        layer.trainable = False
    for layer in base_model.layers[100:]:
        layer.trainable = True

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(optimizer=Adam(learning_rate=0.0001), 
                  loss='sparse_categorical_crossentropy', 
                  metrics=['accuracy'])
    return model

def main():
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    if not os.path.exists(TRAIN_DIR):
        print(f"Error: dataset path not found at {TRAIN_DIR}")
        return

    # 1. Faster Loading for initial fix (using tiny subset)
    print("Loading tiny dataset subset for initial system fix...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        validation_split=0.1,
        subset="training",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=8, # Smaller batch for fast OOM prevention
    ).take(10) # Only take 10 batches (80 images total)

    val_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        validation_split=0.1,
        subset="validation",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=8,
    ).take(2) # Only take 2 batches

    val_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
    )

    class_names = train_ds.class_names
    num_classes = len(class_names)
    
    # Save class indices (format: {"0": "DiseaseName", ...})
    class_indices = {str(i): name for i, name in enumerate(class_names)}
    with open(CLASS_INDICES_PATH, 'w') as f:
        json.dump(class_indices, f)
    print(f"Saved {num_classes} class indices into {CLASS_INDICES_PATH}")

    # Optimize data performance
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    # 2. Build & Compile Model
    print(f"Building MobileNetV2 model for {num_classes} classes...")
    model = build_model(num_classes)
    
    # 3. Train Model
    print(f"Starting training for {EPOCHS} epoch(s)...")
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS
    )
    
    # 4. Save Model
    print("Saving model weights...")
    model.save(MODEL_PATH)
    print(f"Model successfully saved to {MODEL_PATH}")

if __name__ == '__main__':
    main()
