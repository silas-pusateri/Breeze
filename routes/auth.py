from flask import Blueprint, request, jsonify
from config import supabase, logger
import traceback

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
            return jsonify({
                'access_token': session.access_token,
                'refresh_token': session.refresh_token,
                'user': {
                    'email': user.email,
                    'role': user.user_metadata.get('role', 'customer')
                }
            })
        else:
            return jsonify({'error': 'Login failed'}), 401
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 401 