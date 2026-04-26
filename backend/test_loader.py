import tensorflow as tf
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset', 'train')

try:
    print(f"Testing loader on: {TRAIN_DIR}")
    dataset = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        image_size=(224, 224),
        batch_size=32,
        max_num_classes=None
    )
    print("SUCCESS: Modern Keras loader can read the dataset folders!")
except Exception as e:
    print(f"FAILURE: Modern loader failed: {e}")
