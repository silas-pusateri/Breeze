from flask import Flask
from flask_cors import CORS
from config.lambda_config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS for Lambda
    CORS(app, resources={
        r"/*": {
            "origins": ["*"],  # Update this with your actual domain in production
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Refresh-Token"],
            "expose_headers": ["Content-Type", "Authorization", "X-Refresh-Token"]
        }
    })
    
    # Initialize Supabase client with proper connection handling
    from supabase import create_client
    
    @app.before_request
    def create_supabase():
        if not hasattr(app, 'supabase'):
            app.supabase = create_client(
                app.config['SUPABASE_URL'],
                app.config['SUPABASE_KEY']
            )
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.tickets import tickets_bp
    from routes.knowledge import knowledge_bp
    from routes.analytics import analytics_bp
    from routes.search import search_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(tickets_bp)
    app.register_blueprint(knowledge_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(search_bp)
    
    return app 