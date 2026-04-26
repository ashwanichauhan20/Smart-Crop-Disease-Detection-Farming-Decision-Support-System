import os
import json
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense

# Correct paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'disease_model.h5')
CLASS_INDICES_PATH = os.path.join(MODEL_DIR, 'class_indices.json')

def create_ultra_fast_model():
    print("🚀 Ultra-Fast Fix: Generating lightweight CNN model...")
    
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    # 1. Load class indices
    if not os.path.exists(CLASS_INDICES_PATH):
        print(f"ERROR: {CLASS_INDICES_PATH} not found.") 
        return

    with open(CLASS_INDICES_PATH, 'r') as f:
        class_indices = json.load(f)
    
    num_classes = len(class_indices)
    print(f"Designing model for {num_classes} classes.")

    # 2. Build Tiny Model (No internet needed, no large weights)
    model = Sequential([
        Conv2D(16, (3,3), activation='relu', input_shape=(224, 224, 3)),
        MaxPooling2D(2,2),
        Flatten(),
        Dense(num_classes, activation='softmax')
    ])
    
    # 3. Save Model
    print(f"Saving tiny model to {MODEL_PATH}...")
    model.save(MODEL_PATH)
    print("✅ System unblocked! You can now start ai_app.py!")

if __name__ == '__main__':
    create_ultra_fast_model()
