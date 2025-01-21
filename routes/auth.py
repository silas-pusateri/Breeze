from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

# Temporary user storage (replace with Supabase later)
users = {
    'test': {
        'password': generate_password_hash('test'),
        'role': 'customer'
    },
    'agent': {
        'password': generate_password_hash('agent'),
        'role': 'agent'
    }
}

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print("Register - Received data:", data)  # Debug log
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'customer')  # 'customer' or 'agent'
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        if username in users:
            return jsonify({'error': 'Username already exists'}), 400
        
        users[username] = {
            'password': generate_password_hash(password),
            'role': role
        }
        
        print("Users after registration:", list(users.keys()))  # Debug log
        
        # Create token with username as identity and role as additional claim
        access_token = create_access_token(
            identity=username,
            additional_claims={'role': role}
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'role': role
        }), 201
    except Exception as e:
        print("Register error:", str(e))  # Debug log
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print("Login - Received data:", data)  # Debug log
        print("Available users:", list(users.keys()))  # Debug log
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        user = users.get(username)
        if not user:
            print(f"User {username} not found")  # Debug log
            return jsonify({'error': 'Invalid credentials'}), 401
            
        if not check_password_hash(user['password'], password):
            print(f"Invalid password for user {username}")  # Debug log
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create token with username as identity and role as additional claim
        access_token = create_access_token(
            identity=username,
            additional_claims={'role': user['role']}
        )
        
        return jsonify({
            'access_token': access_token,
            'role': user['role']
        }), 200
    except Exception as e:
        print("Login error:", str(e))  # Debug log
        return jsonify({'error': str(e)}), 500 