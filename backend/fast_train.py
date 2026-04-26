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

# Tiny Hyperparameters for Quick Start
IMG_SIZE = (224, 224)
EPOCHS = 1

def main():
    if not os.path.exists(MODEL_DIR): os.makedirs(MODEL_DIR)
    
    # 1. Load tiny subset
    print("🚀 Quick-Fix: Loading tiny dataset subset...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR, validation_split=0.1, subset="training", seed=123,
        image_size=IMG_SIZE, batch_size=4
    ).take(5)

    val_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR, validation_split=0.1, subset="validation", seed=123,
        image_size=IMG_SIZE, batch_size=4
    ).take(2)

    class_names = train_ds.class_names
    num_classes = len(class_names)
    
    # Save mapping
    class_indices = {str(i): name for i, name in enumerate(class_names)}
    with open(CLASS_INDICES_PATH, 'w') as f: json.dump(class_indices, f)

    # 2. Build Minimal Model (Fastest)
    base_model = MobileNetV2(weights=None, include_top=False, input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3))
    x = GlobalAveragePooling2D()(base_model.output)
    predictions = Dense(num_classes, activation='softmax')(x)
    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy')
    
    # 3. Fast Train
    print("🧠 Quick-Fix: Generating basic model structure...")
    model.fit(train_ds, validation_data=val_ds, epochs=1)
    
    # 4. Save
    model.save(MODEL_PATH)
    print(f"✅ Fast model saved to {MODEL_PATH}")

if __name__ == '__main__': main()
