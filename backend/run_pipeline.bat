@echo off
echo Executing AI Pipeline Setup...
call .\ai_venv\Scripts\activate
echo Environment Activated.

echo.
echo [1/2] Generating Pesticide Mappings...
python create_pesticide_mapping.py

echo.
echo [2/2] Training CNN Model (5 Epochs)...
python train_cnn.py

echo.
echo Pipeline Complete! You can now start the Flask Server.
