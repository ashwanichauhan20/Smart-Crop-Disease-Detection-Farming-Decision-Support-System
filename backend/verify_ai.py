import urllib.request
import json
try:
    response = urllib.request.urlopen('http://localhost:5002/health')
    print("HEALTH:", response.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
