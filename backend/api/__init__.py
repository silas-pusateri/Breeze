from flask import Flask
from flask_cors import CORS
from config import Config, supabase_client

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS
    CORS(app, resources={
        r"/*": {
            "origins": app.config['ALLOWED_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Refresh-Token"],
            "expose_headers": ["Content-Type", "Authorization", "X-Refresh-Token"]
        }
    })
    
    # Make supabase client available to the app
    app.supabase = supabase_client
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.tickets import tickets_bp
    from routes.knowledge import knowledge_bp
    from routes.analytics import analytics_bp
    from routes.search import search_bp
    from routes.rag import rag_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(tickets_bp)
    app.register_blueprint(knowledge_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(rag_bp, url_prefix='/api/rag')
    
    return app 