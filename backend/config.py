from supabase import create_client, Client
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')  # Use SUPABASE_KEY instead of SUPABASE_ANON_KEY

if not supabase_url or not supabase_key:
    raise ValueError("Missing required environment variables for Supabase configuration")

supabase_client: Client = create_client(supabase_url, supabase_key)

# Initialize Pinecone
pinecone_api_key = os.getenv('PINECONE_API_KEY')
if not pinecone_api_key:
    raise ValueError("Missing required environment variable: PINECONE_API_KEY")

class Config:
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')  # anon key
    #SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')  # service role key
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')

# Initialize Supabase clients
try:
    # Regular client with anon key
    supabase_client: Client = create_client(
        Config.SUPABASE_URL,
        Config.SUPABASE_KEY
    )
    
    # Service role client for admin operations
    #service_role_client: Client = create_client(
    #    Config.SUPABASE_URL,
    #    Config.SUPABASE_SERVICE_KEY
    #)
except Exception as e:
    logger.error(f"Error initializing Supabase client: {str(e)}")
    raise 