import os
import json
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASS_INDICES_PATH = os.path.join(BASE_DIR, 'model', 'class_indices.json')
MAPPED_CSV_PATH = os.path.join(BASE_DIR, 'data', 'pesticide_mapped.csv')

def load_data():
    classes = {}
    if os.path.exists(CLASS_INDICES_PATH):
        with open(CLASS_INDICES_PATH, 'r') as f:
            classes = json.load(f)
    return classes

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "active", "demo": True})

@app.route('/predict', methods=['POST'])
def predict():
    classes = load_data()
    disease = random.choice(list(classes.values())) if classes else "Unknown Disease"
    
    # Mock data for immediate unblocking
    return jsonify({
        "disease": disease,
        "confidence": f"{random.uniform(85, 99):.2f}%",
        "pesticide": "Pesticide X (Placeholder)",
        "organic": "Neem Oil Solution",
        "nutrient": "Nitrogen / Potassium",
        "fertilizer": "Organic Compost",
        "dosage": "5ml per litre"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
