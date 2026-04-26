import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(BASE_DIR, 'data', 'cnn model dataset', 'plant_disease_dataset', 'train')
NEW_PESTICIDE_CSV = os.path.join(BASE_DIR, 'data', 'Pesticides.csv')
NUTRIENTS_CSV = os.path.join(BASE_DIR, 'data', 'nutrients_fertilizers_AI_dataset.csv')
MAPPED_CSV_PATH = os.path.join(BASE_DIR, 'data', 'pesticide_mapped.csv')

def generate():
    print("Starting Mapping Generation...")
    if not os.path.exists(TRAIN_DIR):
        print("ERROR: Train dir not found")
        return

    classes = [d for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))]
    print(f"Found {len(classes)} classes.")

    df_pest = pd.read_csv(NEW_PESTICIDE_CSV) if os.path.exists(NEW_PESTICIDE_CSV) else pd.DataFrame()
    df_nut = pd.read_csv(NUTRIENTS_CSV) if os.path.exists(NUTRIENTS_CSV) else pd.DataFrame()

    results = []
    for cls in classes:
        # Default Info
        row = {
            "Disease": cls,
            "Pesticide": "Mancozeb 75WP @ 2.5g/L",
            "Organic": "Neem Oil Spray",
            "Nutrient": "N-P-K (Balanced)",
            "Fertilizer": "Organic Compost",
            "Dosage": "5-10 kg per plant"
        }

        # Fuzzy match for pesticide
        if not df_pest.empty:
            p_match = df_pest[df_pest['Disease'].str.contains(cls.split(' (')[0], case=False, na=False)]
            if not p_match.empty:
                row["Pesticide"] = p_match.iloc[0]["Chemical_Treatment_1"]
                row["Organic"] = p_match.iloc[0]["Organic_Treatment_1"]

        # Fuzzy match for nutrients
        if not df_nut.empty:
            crop = ""
            if "(" in cls: crop = cls[cls.find("(")+1:cls.find(")")]
            
            n_match = df_nut[df_nut['Crop'].str.contains(crop, case=False, na=False)] if crop else pd.DataFrame()
            if not n_match.empty:
                n_row = n_match.iloc[0]
                row["Nutrient"] = n_row["Nutrient_Name"]
                row["Fertilizer"] = n_row["Fertilizer_Source"]
                row["Dosage"] = f"Basal: {n_row['Dose_Basal']} | Top: {n_row['Dose_Top_Dressing']}"

        if "healthy" in cls.lower():
            row["Pesticide"] = "None"
            row["Organic"] = "None"
            row["Dosage"] = "Normal feeding"

        results.append(row)

    pd.DataFrame(results).to_csv(MAPPED_CSV_PATH, index=False)
    print(f"DONE! Saved to {MAPPED_CSV_PATH}")

if __name__ == "__main__":
    generate()
