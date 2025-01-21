from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

# Temporary user storage (replace with Supabase later)
users = {}

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
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
    
    # Create access token for automatic login
    access_token = create_access_token(identity={
        'username': username,
        'role': role
    })
    
    return jsonify({
        'message': 'User registered successfully',
        'access_token': access_token,
        'role': role
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = users.get(username)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity={
        'username': username,
        'role': user['role']
    })
    
    return jsonify({
        'access_token': access_token,
        'role': user['role']
    }), 200 