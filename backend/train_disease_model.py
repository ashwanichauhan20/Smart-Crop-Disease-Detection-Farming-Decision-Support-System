import os
import json
import psutil
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D, Input
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
import numpy as np

# --- Configuration ---
# Hardcoded paths based on the known environment
BASE_DIR = r"c:\Users\sushi\OneDrive\Desktop\Smart Crop Disease Detection-Farming Decision Support System\backend\data\cnn model dataset\plant_disease_dataset"
TRAIN_DIR = os.path.join(BASE_DIR, "train")
VAL_DIR = os.path.join(BASE_DIR, "val")
MODEL_SAVE_PATH = "crop_disease_model.h5"
CLASS_INDICES_PATH = "class_indices.json"

def clean_class_name(name):
    # e.g., Tomato___Early_blight -> Tomato Early blight
    return name.replace("___", " ").replace("_", " ").title()

def get_system_capabilities():
    """
    Adaptive training requirements:
    Analyzes RAM and GPU to determine optimal image size and batch size
    """
    try:
        import psutil
        mem = psutil.virtual_memory()
        total_ram_gb = mem.total / (1024 ** 3)
    except ImportError:
        total_ram_gb = 8 # Assumption Medium

    physical_devices = tf.config.list_physical_devices('GPU')
    has_gpu = len(physical_devices) > 0

    if has_gpu or total_ram_gb > 16:
        img_size = (224, 224)
        batch_size = 32
        print("System capability: HIGH")
    elif total_ram_gb >= 8:
        img_size = (160, 160)
        batch_size = 32
        print("System capability: MEDIUM")
    else:
        img_size = (128, 128)
        batch_size = 16
        print("System capability: LOW")
        
    print(f"Total RAM: {total_ram_gb:.2f} GB | GPU Available: {has_gpu}")
    print(f"Selected Image Size: {img_size} | Selected Batch Size: {batch_size}")
    
    return img_size, batch_size

def train_model():
    img_size, batch_size = get_system_capabilities()
    
    print("\n--- Initializing Data Generators ---")
    # Data Processing: Normalize and augment
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest'
    )
    
    val_datagen = ImageDataGenerator(rescale=1./255)
    
    # Check if directories exist
    if not os.path.exists(TRAIN_DIR) or not os.path.exists(VAL_DIR):
        print(f"Error: Dataset directories not found at {BASE_DIR}")
        return

    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical'
    )
    
    val_generator = val_datagen.flow_from_directory(
        VAL_DIR,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    # 5. Mapping index -> correct disease name
    raw_indices = train_generator.class_indices
    index_to_clean = {v: clean_class_name(k) for k, v in raw_indices.items()}
    class_mapping = {
        "raw_to_index": raw_indices,
        "index_to_clean": index_to_clean
    }
    
    with open(CLASS_INDICES_PATH, "w") as f:
        json.dump(class_mapping, f, indent=4)
    print(f"Saved class mappings to {CLASS_INDICES_PATH}")
    
    # Print sample mapping for debugging
    print("Sample Class Indices Mapping:")
    for k in list(raw_indices.keys())[:5]:
        print(f"  {k} -> {raw_indices[k]} -> {index_to_clean[raw_indices[k]]}")
    
    print("\n--- Building Optimised Model ---")
    num_classes = len(raw_indices)
    
    # Creating a base model using MobileNetV2 for lightweight performance
    input_tensor = Input(shape=(img_size[0], img_size[1], 3))
    base_model = MobileNetV2(
        input_tensor=input_tensor,
        include_top=False,
        weights='imagenet'
    )
    
    base_model.trainable = False # Initial training step: freeze base layers
    
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.5)(x) # Dropout to prevent overfitting
    predictions = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Adaptive Training: Epochs and Callbacks
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True, verbose=1),
        ModelCheckpoint(MODEL_SAVE_PATH, save_best_only=True, monitor='val_accuracy', verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-6, verbose=1)
    ]
    
    print("\n--- Starting Training ---")
    # Base epochs starts at 10. EarlyStopping acts if model is stable earlier,
    # but normally with a large dataset 10 epochs is a good start.
    epochs = 10
    
    history = model.fit(
        train_generator,
        epochs=epochs,
        validation_data=val_generator,
        callbacks=callbacks
    )
    
    # 6. Printing accuracy
    print("\n--- Training Complete ---")
    final_train_acc = history.history['accuracy'][-1]
    final_val_acc = history.history['val_accuracy'][-1]
    print(f"Final Model Saved to {MODEL_SAVE_PATH}")
    print(f"Final Training Accuracy: {final_train_acc:.4f}")
    print(f"Final Validation Accuracy: {final_val_acc:.4f}")

# 3. Loading model & 4. Predicting disease
def predict_disease(img_path):
    # Verify model and classes exist
    if not os.path.exists(MODEL_SAVE_PATH):
        print(f"Error: Model not found at {MODEL_SAVE_PATH}")
        return None
    if not os.path.exists(CLASS_INDICES_PATH):
        print(f"Error: Class mapping not found at {CLASS_INDICES_PATH}")
        return None

    # Determine image size dynamically or read from model
    model = load_model(MODEL_SAVE_PATH)
    img_size = (model.input_shape[1], model.input_shape[2])
    print(f"Loading image with size {img_size}")

    with open(CLASS_INDICES_PATH, "r") as f:
        mapping = json.load(f)
    
    index_to_clean = mapping["index_to_clean"]
    
    # Ensure prediction uses SAME preprocessing
    try:
        from tensorflow.keras.preprocessing import image
        img = image.load_img(img_path, target_size=img_size)
    except Exception as e:
        print(f"Error loading image: {e}")
        return None
        
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    
    # Apply identical normalization (rescale=1./255)
    img_array = img_array / 255.0 
    
    predictions = model.predict(img_array)
    predicted_index = np.argmax(predictions[0])
    confidence = predictions[0][predicted_index]
    
    predicted_class_name = index_to_clean[str(predicted_index)]
    
    print(f"\n--- Prediction Result ---")
    print(f"Image: {img_path}")
    print(f"Disease: {predicted_class_name}")
    print(f"Confidence: {confidence:.4f}")
    
    return predicted_class_name, confidence

if __name__ == "__main__":
    import sys
    # Adding a simple command line switch
    if len(sys.argv) > 1 and sys.argv[1] == "predict":
        if len(sys.argv) > 2:
            predict_disease(sys.argv[2])
        else:
            print("Usage: python train_disease_model.py predict <path_to_image>")
    else:
        train_model()
