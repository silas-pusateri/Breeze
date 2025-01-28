from functools import wraps
from flask import request, jsonify
from routes.auth import get_user_from_token

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow OPTIONS requests to pass through without authentication
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        try:
            get_user_from_token(request)
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 401
            
    return decorated 