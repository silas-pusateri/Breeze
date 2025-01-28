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
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        logger.info(f"Registering user with email: {email}")
        
        # Basic registration with Supabase Auth
        auth_response = supabase_client.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if auth_response.user:
            return jsonify({
                'message': 'Registration successful. Please check your email to verify your account.',
                'user': {
                    'email': email
                }
            }), 201
        else:
            return jsonify({'error': 'Registration failed'}), 400
            
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 400

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
        
        # Sign in with Supabase
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        # Get the session and user information
        session = auth_response.session
        user = auth_response.user
        
        if session and user:
            try:
                # Fetch user profile from the profiles table
                profile_response = supabase_client.table('profiles').select('role').eq('id', user.id).execute()
                
                if not profile_response.data:
                    logger.error(f"No profile found for user {user.id}")
                    return jsonify({'error': 'User profile not found'}), 404
                
                role = profile_response.data[0]['role']
                logger.info(f"User role from profile: {role}")
                
                return jsonify({
                    'access_token': session.access_token,
                    'refresh_token': session.refresh_token,
                    'user': {
                        'email': user.email,
                        'role': role
                    }
                })
            except Exception as profile_error:
                logger.error(f"Error fetching profile: {str(profile_error)}")
                return jsonify({'error': 'Failed to fetch user profile'}), 500
        else:
            return jsonify({'error': 'Login failed'}), 401
        
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
        
        # Get user information from Supabase using the session
        user = session.user
        if not user:
            raise Exception('Invalid session')
            
        # Fetch user profile from the profiles table
        # profile_response = supabase_client.table('profiles').select('role').eq('id', user.id).execute()
        
        #if not profile_response.data:
        #    logger.error(f"No profile found for user {user.id}")
        #    raise Exception('User profile not found')
            
        #role = profile_response.data[0]['role']
            
        return {
            'email': user.email,
            'role': role
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