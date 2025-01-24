#!/bin/bash

# Create a temporary build directory
rm -rf lambda_build
mkdir lambda_build

# Install dependencies
pip install -r requirements.txt --target ./lambda_build

# Copy application files
cp -r app.py lambda.py main.py api config routes ./lambda_build/

# Create deployment package
cd lambda_build
zip -r ../lambda_function.zip .
cd ..

# Clean up
rm -rf lambda_build

echo "Lambda deployment package created as lambda_function.zip" 