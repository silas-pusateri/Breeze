import os
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class Config:
    # Load configuration from environment variables
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    # CORS settings
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    
    # Flask settings
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'

if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials. Please check your .env file.")

logger.info(f"Initializing Supabase client with URL: {Config.SUPABASE_URL}")
try:
    # Initialize Supabase client
    supabase_client: Client = create_client(
        supabase_url=Config.SUPABASE_URL,
        supabase_key=Config.SUPABASE_KEY
    )
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    raise

__all__ = ['supabase_client']
