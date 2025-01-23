FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy source code
COPY backend/ .

# Expose port
EXPOSE 5001

# Run the application
CMD ["python", "main.py"] 