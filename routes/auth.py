from flask import Blueprint, request, jsonify
from config import supabase, logger
import traceback
from functools import wraps

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'customer')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        logger.info(f"Registering user with email: {email}, role: {role}")
        
        # Register user with Supabase
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "role": role
                }
            }
        })
        
        # Get the session information
        session = auth_response.session
        
        if session:
            return jsonify({
                'message': 'Registration successful',
                'access_token': session.access_token,
                'user': {
                    'email': email,
                    'role': role
                }
            }), 201
        else:
            # Registration successful but needs email verification
            return jsonify({
                'message': 'Registration successful. Please check your email to verify your account.',
                'user': {
                    'email': email,
                    'role': role
                }
            }), 201
        
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
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        # Get the session and user information
        session = auth_response.session
        user = auth_response.user
        
        if session and user:
            # Get the role from user metadata
            role = user.user_metadata.get('role', 'customer')
            logger.info(f"User role from metadata: {role}")
            
            return jsonify({
                'access_token': session.access_token,
                'refresh_token': session.refresh_token,
                'user': {
                    'email': user.email,
                    'role': role
                }
            })
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
        session = supabase.auth.set_session(token, refresh_token)
        
        # Get user information from Supabase using the session
        user = session.user
        if not user:
            raise Exception('Invalid session')
            
        return {
            'email': user.email,
            'role': user.user_metadata.get('role', 'customer')
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