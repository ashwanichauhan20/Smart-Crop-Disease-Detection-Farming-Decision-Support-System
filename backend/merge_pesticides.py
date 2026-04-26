import os
import pandas as pd

# Path Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NEW_CSV = os.path.join(BASE_DIR, 'data', 'Pesticides.csv')
OLD_CSV = os.path.join(BASE_DIR, 'data', 'Pesticide_Dataset', 'Pesticides.csv')
MASTER_CSV = os.path.join(BASE_DIR, 'data', 'Pesticide_Dataset', 'Pesticides_Master.csv')

def merge_csvs():
    if not os.path.exists(NEW_CSV) or not os.path.exists(OLD_CSV):
        print(f"Error: Missing CSV files. NEW={os.path.exists(NEW_CSV)}, OLD={os.path.exists(OLD_CSV)}")
        return

    print("Merging pesticide datasets...")
    
    # 1. Load Data
    df_new = pd.read_csv(NEW_CSV)
    df_old = pd.read_csv(OLD_CSV)
    
    # 2. Normalize Names
    # New: Disease, Old: Pest Name
    df_new['Disease'] = df_new['Disease'].str.strip()
    df_old['Pest Name'] = df_old['Pest Name'].str.strip()
    
    # 3. Handle Duplicates
    # Convert Old File to match New File structure (roughly)
    # File O columns are: [Pest Name, Most Commonly Used Pesticides]
    # File N columns are: [Disease, Plant, ..., Organic_Treatment_1, ..., Chemical_Treatment_1...]
    
    # Create a list of diseases in the new file
    new_diseases = set(df_new['Disease'].str.lower())
    
    # Filter out rows from the old file that are already in the new file
    df_old_unique = df_old[~df_old['Pest Name'].str.lower().isin(new_diseases)]
    
    # 4. Merge Unique Entries from Old into New
    # Since the columns are different, we will create a standard set of columns for the master file
    # We will use the New file columns as the standard.
    
    # Map Old columns to New structure: "Pest Name" -> "Disease", "Most Commonly Used Pesticides" -> "Chemical_Treatment_1"
    new_rows = []
    for _, row in df_old_unique.iterrows():
        new_row = {col: "" for col in df_new.columns}
        new_row['Disease'] = row['Pest Name']
        new_row['Chemical_Treatment_1'] = row['Most Commonly Used Pesticides']
        new_row['Source'] = "Old Dataset"
        new_rows.append(new_row)
    
    df_old_converted = pd.DataFrame(new_rows)
    df_master = pd.concat([df_new, df_old_converted], ignore_index=True)
    
    # Final Deduplication on Disease Name (just in case)
    df_master.drop_duplicates(subset=['Disease'], keep='first', inplace=True)
    
    # 5. Save Output
    os.makedirs(os.path.dirname(MASTER_CSV), exist_ok=True)
    df_master.to_csv(MASTER_CSV, index=False)
    
    print(f"Merge complete! Final master file saved to: {MASTER_CSV}")
    print(f"Total entries: {len(df_master)} (Added {len(df_old_converted)} unique entries from old file)")

if __name__ == "__main__":
    merge_csvs()
