import os
from dotenv import load_dotenv
from supabase import create_client, Client
import logging
from urllib.parse import urlparse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class Config:
    # Load configuration from environment variables
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    IS_LOCAL = os.getenv('IS_LOCAL', 'false').lower() == 'true'
    
    if IS_LOCAL:
        logger.info("Local development mode detected")
        # Get the local URL from environment
        local_url = os.getenv('SUPABASE_LOCAL_URL', 'http://host.docker.internal:54321')
        logger.info(f"Raw local URL from env: {local_url}")
        
        # Ensure local URL uses http:// and not https://
        if local_url.startswith('https://'):
            local_url = 'http://' + local_url[8:]
            
        SUPABASE_URL = local_url
        SUPABASE_ANON_KEY = os.getenv('SUPABASE_LOCAL_ANON_KEY', SUPABASE_ANON_KEY)
        logger.info(f"Using local Supabase URL: {SUPABASE_URL}")
        logger.info(f"Local anon key set: {bool(SUPABASE_ANON_KEY)}")
    
    # CORS settings
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    
    # Flask settings
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'

if not Config.SUPABASE_URL or not Config.SUPABASE_ANON_KEY:
    logger.error("Missing required Supabase configuration")
    logger.error(f"SUPABASE_URL set: {bool(Config.SUPABASE_URL)}")
    logger.error(f"SUPABASE_ANON_KEY set: {bool(Config.SUPABASE_ANON_KEY)}")
    raise ValueError("Supabase URL and anon key must be set")

logger.info(f"Initializing Supabase client with URL: {Config.SUPABASE_URL}")

try:
    # Initialize Supabase client
    supabase_client: Client = create_client(
        supabase_url=Config.SUPABASE_URL,
        supabase_key=Config.SUPABASE_ANON_KEY
    )
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    logger.error(f"Error type: {type(e)}")
    logger.error(f"Error details: {str(e)}")
    if Config.IS_LOCAL:
        logger.error("For local development, ensure:")
        logger.error("1. Supabase is running (supabase status)")
        logger.error("2. The port 54321 is accessible")
        logger.error("3. host.docker.internal is properly resolved")
        logger.error(f"Current environment variables:")
        logger.error(f"SUPABASE_LOCAL_URL={os.getenv('SUPABASE_LOCAL_URL')}")
        logger.error(f"IS_LOCAL={os.getenv('IS_LOCAL')}")
    raise

__all__ = ['Config', 'supabase_client']
