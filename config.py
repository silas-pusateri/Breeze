import os
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials. Please check your .env file.")

logger.info(f"Initializing Supabase client with URL: {SUPABASE_URL}")
try:
    # Initialize Supabase client
    supabase: Client = create_client(
        supabase_url=SUPABASE_URL,
        supabase_key=SUPABASE_KEY
    )
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    raise 