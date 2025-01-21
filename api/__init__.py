from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.tickets import tickets_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(tickets_bp)
    
    return app 