import requests
import sys
import glob

# URL of the AI server
URL = "http://127.0.0.1:5002/predict"

def test_single_image(image_path):
    print(f"\n[TESTING] Sending image: {image_path}")
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(URL, files=files)
            
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Successfully received data:")
            for key, value in result.items():
                print(f"  -> {key.capitalize()}: {value}")
        else:
            print("Error Response:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is ai_app.py running on port 5002?")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Test specific image provided by user
        test_single_image(sys.argv[1])
    else:
        # Automatically pick a random validation image for testing
        print("No image path provided, automatically picking a random validation image...")
        val_images = glob.glob(r"data\cnn model dataset\plant_disease_dataset\val\*\*.jpg") + glob.glob(r"data\cnn model dataset\plant_disease_dataset\val\*\*.JPG")
        
        if len(val_images) > 0:
            import random
            random_img = random.choice(val_images)
            test_single_image(random_img)
        else:
            print("Could not find any validation images. Please provide an image path manually.")
            print("Usage: python test_prediction.py <path_to_leaf_image.jpg>")
