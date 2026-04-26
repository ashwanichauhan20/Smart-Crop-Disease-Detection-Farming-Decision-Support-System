import os
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'disease_model.h5')
CLASS_PATH = os.path.join(BASE_DIR, 'model', 'class_indices.json')
CSV_PATH = os.path.join(BASE_DIR, 'data', 'pesticide_mapped.csv')

def test():
    print("--- 🔍 AI Diagnostic Starting ---")
    
    # 1. Check Model
    if not os.path.exists(MODEL_PATH):
        print("❌ MODEL MISSING:", MODEL_PATH)
        return
    print("✅ Model found.")
    
    # 2. Check CSV
    if not os.path.exists(CSV_PATH):
        print("❌ CSV MISSING:", CSV_PATH)
        return
    df = pd.read_csv(CSV_PATH)
    print(f"✅ CSV found. Rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    
    # 3. Check Labels
    with open(CLASS_PATH, 'r') as f:
        labels = json.load(f)
    print(f"✅ Labels found: {len(labels)}")
    
    # 4. Test Lookup
    test_disease = labels["0"]
    print(f"Testing lookup for: '{test_disease}'")
    match = df[df['Disease'].str.lower() == test_disease.lower()]
    if match.empty:
        print("⚠️ Warning: No match in CSV for first label.")
    else:
        print(f"✅ Match found: {match.iloc[0]['Pesticide']}")

if __name__ == '__main__':
    test()
