import os
import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name, region_name="us-east-1"):
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
        return get_secret_value_response['SecretString']
    except ClientError as e:
        raise e

class Config:
    # Lambda-specific settings
    LAMBDA_FUNCTION_NAME = os.environ.get('AWS_LAMBDA_FUNCTION_NAME')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    
    # Get secrets from AWS Secrets Manager in production
    if os.environ.get('AWS_EXECUTION_ENV'):
        SUPABASE_URL = get_secret('SUPABASE_URL')
        SUPABASE_KEY = get_secret('SUPABASE_KEY')
        JWT_SECRET = get_secret('JWT_SECRET')
    else:
        # Local development fallback
        from dotenv import load_dotenv
        load_dotenv()
        SUPABASE_URL = os.getenv('SUPABASE_URL')
        SUPABASE_KEY = os.getenv('SUPABASE_KEY')
        JWT_SECRET = os.getenv('JWT_SECRET') 