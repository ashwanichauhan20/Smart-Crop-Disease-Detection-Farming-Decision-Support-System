import pandas as pd
import os

# Paths
base_dir = r"c:\Users\sushi\OneDrive\Desktop\Smart Crop Disease Detection-Farming Decision Support System"
zaid_main_csv = os.path.join(base_dir, "backend", "data", "zaid_full_final_dataset.csv")
zaid_growth_csv = os.path.join(base_dir, "backend", "data", "zaid_growth_final.csv")
public_main_csv = os.path.join(base_dir, "frontend", "public", "data", "crop_seed_per_kattha_100.csv")
public_growth_csv = os.path.join(base_dir, "frontend", "public", "data", "seasonal_crops_growth_roadmap.csv")

print("Processing Main CSV (crop_seed_per_kattha_100.csv)...")
# crop,category,soil,season,seed_per_kattha,seed_unit,yield_quintal_per_bigha,profit_rating,notes
if os.path.exists(zaid_main_csv) and os.path.exists(public_main_csv):
    df_zaid_main = pd.read_csv(zaid_main_csv)
    # Map Zaid columns to public main CSV columns
    df_new = pd.DataFrame()
    df_new['crop'] = df_zaid_main['Crop']
    df_new['category'] = df_zaid_main['Category']
    df_new['soil'] = df_zaid_main['Soil_Type']
    df_new['season'] = df_zaid_main['Season']
    # Seed calculation assumptions to put it in gram/kattha
    # Seed_kg_per_bigha -> Kattha (assuming 20 kattha = 1 bigha -> kg * 1000 / 20 = kg * 50 to get grams)
    df_new['seed_per_kattha'] = (df_zaid_main['Seed_kg_per_bigha'] * 50).astype(int)
    df_new['seed_unit'] = "gram"
    df_new['yield_quintal_per_bigha'] = df_zaid_main['Yield_quintal_per_bigha']
    df_new['profit_rating'] = "High"
    df_new['notes'] = "Zaid crop, best in hot season with irrigation"

    df_public_main = pd.read_csv(public_main_csv)
    # Prevent duplicate appends 
    existing_crops = df_public_main['crop'].unique()
    df_new_to_add = df_new[~df_new['crop'].isin(existing_crops)]
    
    if len(df_new_to_add) > 0:
        df_merged_main = pd.concat([df_public_main, df_new_to_add], ignore_index=True)
        df_merged_main.to_csv(public_main_csv, index=False)
        print(f"Added {len(df_new_to_add)} crops to crop_seed_per_kattha_100.csv")
    else:
        print("No new crops to add to crop_seed_per_kattha_100.csv (all exist).")

print("\nProcessing Growth Roadmap CSV...")
if os.path.exists(zaid_growth_csv) and os.path.exists(public_growth_csv):
    df_zaid_growth = pd.read_csv(zaid_growth_csv)
    # Season,Crop,Total_Days,Stage1,Days1,Stage2,Days2,Stage3,Days3,Stage4,Days4,Stage5,Days5,Stage6,Days6
    df_new_growth = pd.DataFrame()
    df_new_growth['Season'] = df_zaid_growth['Season']
    df_new_growth['Crop_Name'] = df_zaid_growth['Crop']
    df_new_growth['Total_Duration_Days'] = df_zaid_growth['Total_Days'].astype(str)
    
    # Calculate Total_Stages based on non-empty Stage fields
    total_stages = []
    for idx, row in df_zaid_growth.iterrows():
        count = sum(1 for i in range(1, 7) if pd.notna(row.get(f'Stage{i}')))
        total_stages.append(count)
    df_new_growth['Total_Stages'] = total_stages

    # Map Stages
    for i in range(1, 7):
        stage_col = f'Stage{i}'
        days_col = f'Days{i}'
        df_new_growth[f'Stage_{i}_Name'] = df_zaid_growth[stage_col] if stage_col in df_zaid_growth else None
        df_new_growth[f'Stage_{i}_Days'] = df_zaid_growth[days_col] if days_col in df_zaid_growth else None

    df_public_growth = pd.read_csv(public_growth_csv)
    existing_growth_crops = df_public_growth['Crop_Name'].unique()
    df_growth_to_add = df_new_growth[~df_new_growth['Crop_Name'].isin(existing_growth_crops)]

    if len(df_growth_to_add) > 0:
        df_merged_growth = pd.concat([df_public_growth, df_growth_to_add], ignore_index=True)
        df_merged_growth.to_csv(public_growth_csv, index=False)
        print(f"Added {len(df_growth_to_add)} crops to seasonal_crops_growth_roadmap.csv")
    else:
        print("No new crops to add to growth roadmap (all exist).")

print("Zaid Data Merge Complete!")
