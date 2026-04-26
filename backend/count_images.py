import os
path = r'c:\Users\sushi\OneDrive\Desktop\Smart Crop Disease Detection-Farming Decision Support System\backend\data\cnn model dataset\plant_disease_dataset\train'
count = sum(len(files) for r, d, files in os.walk(path))
classes = len([name for name in os.listdir(path) if os.path.isdir(os.path.join(path, name))])
print(f"Total_images: {count}")
print(f"Total_classes: {classes}")
