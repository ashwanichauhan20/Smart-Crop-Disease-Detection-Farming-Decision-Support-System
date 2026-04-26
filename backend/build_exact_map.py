import json
import os
import pandas as pd
import difflib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASS_INDICES_PATH = os.path.join(BASE_DIR, 'model', 'class_indices.json')
MAPPED_CSV_PATH = os.path.join(BASE_DIR, 'data', 'pesticide.csv')
OUTPUT_JSON_PATH = os.path.join(BASE_DIR, 'model', 'exact_disease_treatment.json')

def build_exact_map():
    with open(CLASS_INDICES_PATH, 'r') as f:
        classes = json.load(f)
        
    df = pd.read_csv(MAPPED_CSV_PATH)
    df.columns = df.columns.str.strip()
    
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

    exact_map = {}
    
    for _, raw_class_name in classes.items():
        class_str = raw_class_name.lower().replace("___", " ").replace("_", " ").replace("(", " ").replace(")", " ")
        
        # If it's a healthy leaf, just hardcode the healthy response
        if "healthy" in class_str or "unknown" in class_str:
            exact_map[raw_class_name] = {
                "pesticide": "Not Needed (Healthy Plant)",
                "organic": "Not Needed (Maintain regular watering)",
                "nutrient": "Standard N-P-K (e.g. 10-10-10)",
                "fertilizer": "Regular Organic Compost",
                "dosage": "Routine application"
            }
            continue
            
        pred_tokens = set(class_str.split())
        
        best_match = None
        highest_score = 0
        
        for rec in pesticide_records:
            rec_key = rec["search_key"]
            rec_tokens = set(rec_key.split())
            
            overlap = len(pred_tokens.intersection(rec_tokens))
            ratio_boost = difflib.SequenceMatcher(None, class_str, rec_key).ratio()
            
            final_score = overlap + ratio_boost
            
            if final_score > highest_score:
                highest_score = final_score
                best_match = rec
                
        if best_match and highest_score > 1.0:
            exact_map[raw_class_name] = {
                "pesticide": best_match["pesticide"],
                "organic": best_match["organic"],
                "nutrient": best_match["nutrient"],
                "fertilizer": best_match["fertilizer"],
                "dosage": best_match["dosage"]
            }
        else:
            # Fallback if really unmatched
            exact_map[raw_class_name] = {
                "pesticide": "Broad-spectrum Fungicide/Insecticide",
                "organic": "Neem Oil Extract (5ml/L)",
                "nutrient": "Potassium-rich balanced fertilizer",
                "fertilizer": "Vermicompost enriched base",
                "dosage": "General agricultural guidelines"
            }
            
    with open(OUTPUT_JSON_PATH, 'w') as f:
        json.dump(exact_map, f, indent=4)
        print(f"✅ Generated exact mapping for all 71 classes: {OUTPUT_JSON_PATH}")

if __name__ == "__main__":
    build_exact_map()
