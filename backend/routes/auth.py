from flask import Blueprint, request, jsonify
from config import supabase_client, logger
import traceback
from functools import wraps
from postgrest import APIError

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        logger.info(f"Registration request received with data: {data}")
        
        if not data:
            logger.error("No data provided in registration request")
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'customer')  # Default to customer if not specified
        
        logger.info(f"Processing registration for email: {email}, role: {role}")
        
        if not email or not password:
            logger.error("Missing required fields: email or password")
            return jsonify({'error': 'Email and password are required'}), 400
        
        if role not in ['customer', 'agent']:
            logger.error(f"Invalid role specified: {role}")
            return jsonify({'error': 'Invalid role specified'}), 400
        
        logger.info(f"Attempting Supabase registration for user: {email}")
        
        try:
            # Log the registration payload (excluding password)
            registration_payload = {
                "email": email,
                "options": {
                    "data": {
                        "role": role,
                        "email": email
                    }
                }
            }
            logger.info(f"Registration payload: {registration_payload}")
            
            # Register with Supabase Auth
            auth_response = supabase_client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "role": role,
                        "email": email
                    }
                }
            })
            
            logger.info(f"Supabase auth response received: {auth_response}")
            
            if not auth_response.user:
                logger.error("No user object in auth response")
                return jsonify({'error': 'Registration failed - no user created'}), 400
                
            # Log successful user creation
            logger.info(f"User registered successfully with ID: {auth_response.user.id}")
            logger.info(f"User metadata: {auth_response.user.user_metadata}")
            
            # Check if session was created
            if hasattr(auth_response, 'session'):
                logger.info("Session created successfully")
            else:
                logger.info("No session created (expected for email confirmation flow)")
            
            return jsonify({
                'message': 'Registration successful. Please check your email to verify your account.',
                'user': {
                    'id': auth_response.user.id,
                    'email': email,
                    'role': role
                }
            }), 201
            
        except Exception as auth_error:
            # Log the full error details
            logger.error(f"Supabase auth error: {str(auth_error)}")
            logger.error(f"Error type: {type(auth_error)}")
            logger.error(f"Error details: {getattr(auth_error, 'details', 'No details available')}")
            logger.error(f"Error code: {getattr(auth_error, 'code', 'No code available')}")
            logger.error(f"Full error attributes: {dir(auth_error)}")
            logger.error(traceback.format_exc())
            
            # Check if it's a specific error we can handle
            error_message = str(auth_error)
            if 'already registered' in error_message.lower():
                return jsonify({'error': 'This email is already registered'}), 400
            elif 'invalid email' in error_message.lower():
                return jsonify({'error': 'Invalid email format'}), 400
            else:
                return jsonify({'error': 'Registration failed. Please try again.', 'details': str(auth_error)}), 400
            
    except Exception as e:
        # Log any unexpected errors
        logger.error(f"Unexpected registration error: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Registration failed due to an unexpected error',
            'details': str(e)
        }), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        logger.info(f"Attempting login for user: {email}")
        
        try:
            # Sign in with Supabase
            auth_response = supabase_client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not auth_response.user or not auth_response.session:
                return jsonify({'error': 'Login failed'}), 401
            
            # Get user profile from the profiles table
            profile_response = supabase_client.table('profiles').select('*').eq('id', auth_response.user.id).execute()
            
            if not profile_response.data:
                logger.error(f"No profile found for user {auth_response.user.id}")
                return jsonify({'error': 'User profile not found'}), 404
            
            profile = profile_response.data[0]
            
            return jsonify({
                'access_token': auth_response.session.access_token,
                'refresh_token': auth_response.session.refresh_token,
                'user': {
                    'id': auth_response.user.id,
                    'email': profile['email'],
                    'role': profile['role']
                }
            })
            
        except Exception as auth_error:
            logger.error(f"Authentication error: {str(auth_error)}")
            return jsonify({'error': 'Login failed. Please try again.'}), 401
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 401

def get_user_from_token(request):
    auth_header = request.headers.get('Authorization')
    refresh_token = request.headers.get('X-Refresh-Token')
    
    if not auth_header:
        raise Exception('No token provided')
    
    if not auth_header.startswith('Bearer '):
        raise Exception('Invalid token format. Must be a Bearer token')
    
    if not refresh_token:
        raise Exception('No refresh token provided')
    
    token = auth_header.replace('Bearer ', '')
    
    try:
        # Set up the Supabase session with both tokens
        session = supabase_client.auth.set_session(token, refresh_token)
        
        if not session.user:
            raise Exception('Invalid session')
        
        # Get user profile from the profiles table
        profile_response = supabase_client.table('profiles').select('*').eq('id', session.user.id).execute()
        
        if not profile_response.data:
            raise Exception('User profile not found')
        
        profile = profile_response.data[0]
        
        return {
            'id': session.user.id,
            'email': profile['email'],
            'role': profile['role']
        }
    except Exception as e:
        logger.error(f"Error in get_user_from_token: {str(e)}")
        raise Exception('Invalid or expired token')

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            get_user_from_token(request)
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 401
    return decorated

def requires_agent(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            user = get_user_from_token(request)
            if user['role'] != 'agent':
                return jsonify({'error': 'Unauthorized. Agent role required.'}), 403
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 401
    return decorated 