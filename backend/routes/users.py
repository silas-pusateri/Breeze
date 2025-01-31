from flask import Blueprint, jsonify, request
from config import supabase_client, logger
import traceback
from .auth import requires_auth, get_user_from_token

users_bp = Blueprint('users', __name__)

@users_bp.route('/users/agents', methods=['GET'])
@requires_auth
def get_agents():
    try:
        # Get user from token for role verification
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        role = user['role']
        if role != 'agent':
            return jsonify({'error': 'Unauthorized access'}), 403

        try:
            # Use regular client to fetch users with agent role
            response = supabase_client.table('users').select('id, email, metadata').eq('role', 'agent').execute()
            users = response.data if response else []
            
            # Format response
            agents = []
            for user in users:
                agents.append({
                    'id': user['id'],
                    'email': user['email'],
                    'name': user['metadata'].get('full_name', user['email'])
                })
            
            return jsonify(agents)
            
        except Exception as e:
            logger.error(f"Error in Supabase operation: {str(e)}")
            return jsonify({'error': 'Failed to fetch agents'}), 500
        
    except Exception as e:
        logger.error(f"Error fetching agents: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500 