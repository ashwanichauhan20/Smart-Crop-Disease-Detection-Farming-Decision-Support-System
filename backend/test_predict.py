import requests
from PIL import Image
import numpy as np
import io

img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_byte_arr = img_byte_arr.getvalue()

try:
    files = {'image': ('test.jpg', img_byte_arr, 'image/jpeg')}
    res = requests.post('http://localhost:5002/predict', files=files)
    print("STATUS:", res.status_code)
    print("RESPONSE:", res.text)
except Exception as e:
    print("ERROR:", e)
