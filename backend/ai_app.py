import os
import json
import pandas as pd
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras.models import load_model
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for the React frontend requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'disease_model.h5')
CLASS_INDICES_PATH = os.path.join(MODEL_DIR, 'class_indices.json')
MAPPED_CSV_PATH = os.path.join(BASE_DIR, 'data', 'pesticide.csv')

import difflib

# Preload variables at start
model = None
class_indices = {}
pesticide_records = []

def init_server():
    global model, class_indices, pesticide_records
    print("--- Initializing Flask Server Assets ---")
    
    # 1. Load Model
    if os.path.exists(MODEL_PATH):
        try:
            print(f"Loading Keras model from {MODEL_PATH}...")
            model = load_model(MODEL_PATH)
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}")
        
    # 2. Load reverse JSON mappings (index -> Disease String)
    if os.path.exists(CLASS_INDICES_PATH):
        try:
            with open(CLASS_INDICES_PATH, 'r') as f:
                class_indices = json.load(f)
            print(f"Loaded {len(class_indices)} class indices.")
        except Exception as e:
            print(f"Error loading class indices: {e}")
    else:
        print(f"Warning: Class map not found at {CLASS_INDICES_PATH}.")

    # 3. Load Mapped Pesticides into a list of records for fuzzy matching
    if os.path.exists(MAPPED_CSV_PATH):
        try:
            df = pd.read_csv(MAPPED_CSV_PATH)
            df.columns = df.columns.str.strip()
            # Clear list before populating
            pesticide_records = []
            for _, row in df.iterrows():
                disease_str = str(row.get('Disease', '')).strip().lower()
                plant_str = str(row.get('Plant', '')).strip().lower()
                if disease_str or plant_str:
                    pesticide_records.append({
                        "search_key": f"{disease_str} {plant_str}",
                        "pesticide": str(row.get('Chemical_Treatment_1', 'None Recommended')),
                        "organic": str(row.get('Organic_Treatment_1', 'None Recommended')),
                        "nutrient": "N-P-K (General)",
                        "fertilizer": "Balanced Compost",
                        "dosage": "Consult local guide"
                    })
            print(f"Pesticide lookup map created with {len(pesticide_records)} entries.")
        except Exception as e:
            print(f"Error building pesticide map: {e}")
    else:
        print(f"Warning: Pesticide mapping not found at {MAPPED_CSV_PATH}.")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "active",
        "model_loaded": model is not None,
        "classes_mapped": len(class_indices),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route('/predict', methods=['POST'])
def predict_disease():
    if model is None:
        return jsonify({"error": "CNN model is not loaded. Please ensure disease_model.h5 exists and restart."}), 500

    if 'image' not in request.files and 'file' not in request.files:
        return jsonify({"error": "No image uploaded. Use 'image' or 'file' key."}), 400

    file = request.files.get('image') or request.files.get('file')
    if file.filename == '':
        return jsonify({"error": "Empty file name"}), 400

    try:
        # Preprocess the incoming image to strictly 224x224 RGB
        print(f"LOG: Processing file: {file.filename}")
        img = Image.open(file.stream).convert('RGB')
        img = img.resize((224, 224))
        
        # Expand dimension (1, 224, 224, 3) + standard normalization
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Execute prediction
        predictions = model.predict(img_array)
        
        # Obtain index of highest probability
        predicted_idx_num = np.argmax(predictions[0])
        predicted_idx_str = str(predicted_idx_num)
        confidence_val = float(np.max(predictions[0])) * 100
        
        print(f"LOG: Predicted Index={predicted_idx_str}, Confidence={confidence_val:.2f}%")
        
        # Safe lookup in class_indices
        if predicted_idx_str not in class_indices:
            # Try numeric lookup too just in case
            if predicted_idx_num in class_indices:
                predicted_disease = class_indices[predicted_idx_num]
            else:
                print(f"Error: Predicted index {predicted_idx_str} not in class_indices!")
                return jsonify({"error": "Predicted index unmatched in label map."}), 500
        else:
            predicted_disease = class_indices[predicted_idx_str]
            
        print(f"LOG: Identified Disease -> {predicted_disease}")

        
        # Determine Exact Treatment Payload
        exact_map_path = os.path.join(MODEL_DIR, "exact_disease_treatment.json")
        data = {
            "pesticide": "Broad-spectrum Fungicide/Insecticide",
            "organic": "Neem Oil Extract (5ml/L)",
            "nutrient": "Potassium-rich balanced fertilizer",
            "fertilizer": "Vermicompost enriched base",
            "dosage": "General agricultural guidelines"
        }
        
        try:
            with open(exact_map_path, 'r') as mf:
                exact_map = json.load(mf)
                if predicted_disease in exact_map:
                    data = exact_map[predicted_disease]
        except Exception as e:
            print(f"Error reading exact map: {e}")
        
        print(f"Success: {predicted_disease} identified.")

        return jsonify({
            "disease": predicted_disease,
            "confidence": f"{confidence_val:.2f}%",
            "pesticide": data["pesticide"],
            "organic": data["organic"],
            "nutrient": data["nutrient"],
            "fertilizer": data["fertilizer"],
            "dosage": data["dosage"]
        }), 200

    except Exception as e:
         import traceback
         trace_str = traceback.format_exc()
         print(f"Prediction Exception: {str(e)}")
         
         # Log to local file for deep debugging
         log_path = os.path.join(BASE_DIR, "error_log.txt")
         try:
              with open(log_path, "a") as f:
                   time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                   f.write(f"\n--- Prediction Error at {time_now} ---\n{trace_str}\n")
         except:
              pass
         return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    # Flush output immediately for logging
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(line_buffering=True)
    
    print("--- Starting AI Microservice (Port 5002) ---")
    init_server()
    app.run(host='0.0.0.0', port=5002, debug=False)
