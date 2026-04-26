import os
import pandas as pd
import random

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset', 'train')
NEW_PESTICIDE_CSV = os.path.join(BASE_DIR, 'data', 'Pesticides.csv')
NUTRIENTS_CSV = os.path.join(BASE_DIR, 'data', 'nutrients_fertilizers_AI_dataset.csv')
MAPPED_CSV_PATH = os.path.join(BASE_DIR, 'data', 'pesticide_mapped_v2.csv')

def generate_mapping():
    print("🚀 Integrating Pesticides, Nutrients, and Fertilizers into class mapping...")
    
    # 1. Get all classes
    if not os.path.exists(TRAIN_DIR):
        print(f"Error: Training directory not found at {TRAIN_DIR}")
        return

    classes = sorted([d for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))])
    
    # 2. Load Data Sources
    df_pest = pd.read_csv(NEW_PESTICIDE_CSV) if os.path.exists(NEW_PESTICIDE_CSV) else pd.DataFrame()
    df_nut = pd.read_csv(NUTRIENTS_CSV) if os.path.exists(NUTRIENTS_CSV) else pd.DataFrame()

    mapped_data = []
    
    for cls_name in classes:
        # Standardize search name
        search_key = cls_name.lower().replace("_", " ").replace("-", " ")
        
        # Defaults
        chem_pest = "Mancozeb 75WP @ 2.5g/L"
        org_pest = "Neem Oil Spray"
        nutrient = "Nitrogen"
        fertilizer = "Urea"
        dosage = "50-100 kg/ha"
        
        # 3. Match Pesticide (from New Pesticides CSV)
        if not df_pest.empty:
            match = df_pest[df_pest['Disease'].str.contains(cls_name, case=False, na=False) | 
                           cls_name.lower().contains(df_pest['Disease'].str.lower(), regex=False).fillna(False)]
            
            if not match.empty:
                chem_pest = str(match.iloc[0]['Chemical_Treatment_1'])
                org_pest = str(match.iloc[0]['Organic_Treatment_1'])

        # 4. Match Nutrients (from Nutrients CSV)
        if not df_nut.empty:
            # Crop + Disease context matching
            # Extract crop from class name e.g. "early blight (tomato)" -> "tomato"
            plant_name = ""
            if "(" in cls_name and ")" in cls_name:
                plant_name = cls_name[cls_name.find("(")+1:cls_name.find(")")]
            
            nut_match = df_nut[
                (df_nut['Crop'].str.contains(plant_name, case=False, na=False)) &
                (df_nut['Disease_Context'].str.contains(cls_name.split(' (')[0], case=False, na=False))
            ]
            
            # Fallback to general growth for that plant
            if nut_match.empty and plant_name:
                nut_match = df_nut[
                    (df_nut['Crop'].str.contains(plant_name, case=False, na=False)) &
                    (df_nut['Disease_Context'].str.contains("General|All diseases", case=False, na=False))
                ]
                
            if not nut_match.empty:
                n_row = nut_match.iloc[0]
                nutrient = str(n_row['Nutrient_Name'])
                fertilizer = str(n_row['Fertilizer_Source'])
                dosage = f"Basal: {n_row['Dose_Basal']} | Top: {n_row['Dose_Top_Dressing']}"

        # 5. Handle Healthy Plants
        if 'healthy' in search_key:
            chem_pest = "None Needed"
            org_pest = "Maintain good watering"
            nutrient = "N-P-K (General)"
            fertilizer = "Balanced Compost"
            dosage = "As per soil test"
            
        mapped_data.append({
            "Disease": cls_name,
            "Pesticide": chem_pest,
            "Organic": org_pest,
            "Nutrient": nutrient,
            "Fertilizer": fertilizer,
            "Dosage": dosage
        })
        
    df_mapped = pd.DataFrame(mapped_data)
    df_mapped.to_csv(MAPPED_CSV_PATH, index=False)
    print(f"✅ Full Mapping generated at {MAPPED_CSV_PATH} with {len(mapped_data)} entries.")

if __name__ == '__main__':
    generate_mapping()
