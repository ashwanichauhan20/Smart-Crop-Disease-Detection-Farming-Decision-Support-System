import os
import pandas as pd

# Path Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
PESTICIDES_NEW = os.path.join(DATA_DIR, 'Pesticides.csv')
PESTICIDES_OLD = os.path.join(DATA_DIR, 'Pesticide_Dataset', 'Pesticides.csv')
NUTRIENTS_CSV = os.path.join(DATA_DIR, 'nutrients_fertilizers_AI_dataset.csv')
MASTER_SOLUTIONS = os.path.join(DATA_DIR, 'Pesticide_Dataset', 'Master_Solutions.csv')

def integrate_data():
    print("🚀 Integrating all support data (Pesticides + Nutrients + Fertilizers)...")
    
    # 1. Load Pesticides
    df_pest_new = pd.read_csv(PESTICIDES_NEW) if os.path.exists(PESTICIDES_NEW) else pd.DataFrame()
    df_pest_old = pd.read_csv(PESTICIDES_OLD) if os.path.exists(PESTICIDES_OLD) else pd.DataFrame()
    
    # Simple merge of pesticides first
    if not df_pest_new.empty:
        df_pest_new['Disease'] = df_pest_new['Disease'].str.strip()
        df_pest_new['Plant'] = df_pest_new['Plant'].str.strip()
    
    # 2. Load Nutrients
    df_nutrients = pd.read_csv(NUTRIENTS_CSV) if os.path.exists(NUTRIENTS_CSV) else pd.DataFrame()
    if not df_nutrients.empty:
        df_nutrients['Disease_Context'] = df_nutrients['Disease_Context'].str.strip()
        df_nutrients['Crop'] = df_nutrients['Crop'].str.strip()

    # 3. Comprehensive Solution Table (Per Disease)
    # We want a table where Disease -> Pesticide + Nutrient + Dosage
    
    master_rows = []
    # Use the Pesticides_New as the primary disease list
    for _, row in df_pest_new.iterrows():
        disease = row['Disease']
        plant = row['Plant']
        
        # Find matching Nutrient info
        # Match by Crop (Plant) and Disease_Context (if disease name is found in it)
        nut_match = pd.DataFrame()
        if not df_nutrients.empty:
            # Fuzzy match disease in Disease_Context
            nut_match = df_nutrients[
                (df_nutrients['Crop'].str.contains(plant, case=False, na=False)) &
                (df_nutrients['Disease_Context'].str.contains(disease, case=False, na=False))
            ]
            
            # If no specific disease match, fallback to "General growth" for that crop
            if nut_match.empty:
                nut_match = df_nutrients[
                    (df_nutrients['Crop'].str.contains(plant, case=False, na=False)) &
                    (df_nutrients['Disease_Context'].str.contains("General|All diseases", case=False, na=False))
                ]

        # Take first match if multiple exist
        nutrient = ""
        fertilizer = ""
        dose = ""
        org_alt = ""
        
        if not nut_match.empty:
            n_row = nut_match.iloc[0]
            nutrient = n_row['Nutrient_Name']
            fertilizer = n_row['Fertilizer_Source']
            dose = f"Basal: {n_row['Dose_Basal']} | Top: {n_row['Dose_Top_Dressing']}"
            org_alt = n_row['Organic_Alternative']

        master_rows.append({
            "Disease": disease,
            "Plant": plant,
            "Chemical_Pesticide": row['Chemical_Treatment_1'],
            "Organic_Pesticide": row['Organic_Treatment_1'],
            "Nutrient": nutrient,
            "Fertilizer": fertilizer,
            "Dosage": dose,
            "Organic_Fertilizer": org_alt,
            "Causal_Organism": row.get('Causal_Organism', '')
        })

    df_master = pd.DataFrame(master_rows)
    os.makedirs(os.path.dirname(MASTER_SOLUTIONS), exist_ok=True)
    df_master.to_csv(MASTER_SOLUTIONS, index=False)
    
    print(f"✅ Master Integration Complete! Final file: {MASTER_SOLUTIONS}")
    print(f"Total entries: {len(df_master)}")

if __name__ == "__main__":
    integrate_data()
