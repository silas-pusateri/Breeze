from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }})
    
    # Configure JWT
    app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Change this in production
    jwt = JWTManager(app)
    
    # Import and register blueprints
    from routes.auth import auth_bp
    from routes.tickets import tickets_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(tickets_bp)
    
    return app 