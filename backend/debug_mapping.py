import os
import pandas as pd
import sys

# Log to a file instead of stdout
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mapping_debug.log')
def log(msg):
    with open(log_file, 'a') as f:
        f.write(str(msg) + '\n')

try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    TRAIN_DIR = os.path.join(DATA_DIR, 'cnn model dataset', 'plant_disease_dataset', 'train')
    PESTICIDE_CSV = os.path.join(DATA_DIR, 'Pesticides.csv')
    NUTRIENT_CSV = os.path.join(DATA_DIR, 'nutrients_fertilizers_AI_dataset.csv')
    OUTPUT_CSV = os.path.join(DATA_DIR, 'pesticide_mapped.csv')

    log(f"Starting. BASE_DIR: {BASE_DIR}")
    
    classes = [d for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))]
    log(f"Found {len(classes)} classes")

    # Load data
    df_p = pd.read_csv(PESTICIDE_CSV)
    df_n = pd.read_csv(NUTRIENT_CSV)
    log("Loaded CSVs")

    mapped = []
    for c in classes:
        # Basic logical matching
        p_row = df_p[df_p['Disease'].str.contains(c.split(' (')[0], case=False, na=False)]
        n_row = df_n[df_n['Crop'].str.contains(c[c.find("(")+1:c.find(")")] if "(" in c else "", case=False, na=False)]

        res = {
            "Disease": c,
            "Pesticide": p_row.iloc[0]['Chemical_Treatment_1'] if not p_row.empty else "General Fungicide",
            "Organic": p_row.iloc[0]['Organic_Treatment_1'] if not p_row.empty else "Neem Oil",
            "Nutrient": n_row.iloc[0]['Nutrient_Name'] if not n_row.empty else "NPK",
            "Fertilizer": n_row.iloc[0]['Fertilizer_Source'] if not n_row.empty else "Compost",
            "Dosage": f"Basal: {n_row.iloc[0]['Dose_Basal']}" if not n_row.empty else "5kg/tree"
        }
        mapped.append(res)

    pd.DataFrame(mapped).to_csv(OUTPUT_CSV, index=False)
    log("Success! File written.")

except Exception as e:
    log(f"ERROR: {str(e)}")
    import traceback
    log(traceback.format_exc())
