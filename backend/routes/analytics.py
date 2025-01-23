from flask import Blueprint, request, jsonify
from datetime import datetime
from config import supabase, logger
from .auth import requires_agent, requires_auth, get_user_from_token
import traceback

analytics_bp = Blueprint('analytics', __name__)

def get_supabase_client(token, refresh_token):
    try:
        # Set the session
        session = supabase.auth.set_session(token, refresh_token)
        return supabase, session.user
    except Exception as e:
        logger.error(f"Error setting session: {str(e)}")
        return None, None

@analytics_bp.route('/analytics/widgets', methods=['GET'])
@requires_auth
def get_widgets():
    try:
        logger.info("Attempting to get widgets...")
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            logger.error("Missing authorization tokens")
            return jsonify({'error': 'No authorization tokens provided'}), 401

        # Get Supabase client with session
        client, user = get_supabase_client(token, refresh_token)
        if not client or not user:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500

        logger.info(f"User email: {user.email}")
        
        # Query widgets based on user's email
        logger.info(f"Querying widgets for user: {user.email}")
        result = (
            client
            .table('dashboard_widgets')
            .select('*')
            .eq('user_email', user.email)
            .execute()
        )
        
        logger.info(f"Query result: {result}")
        widgets = result.data if hasattr(result, 'data') and result.data else []
        logger.info(f"Returning {len(widgets)} widgets")
        return jsonify(widgets), 200

    except Exception as e:
        logger.error(f"Failed to get widgets: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/analytics/widgets', methods=['POST'])
@requires_agent
def save_widgets():
    try:
        logger.info("Attempting to save widgets...")
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            logger.error("Missing authorization tokens")
            return jsonify({'error': 'No authorization tokens provided'}), 401

        # Get Supabase client with session
        client, user = get_supabase_client(token, refresh_token)
        if not client or not user:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500

        logger.info(f"User email: {user.email}")
        
        data = request.get_json()
        if not data or not isinstance(data, list):
            logger.error(f"Invalid widget data received: {data}")
            return jsonify({'error': 'Invalid widget data'}), 400

        logger.info(f"Received {len(data)} widgets to save")

        # Delete existing widgets for this user
        logger.info(f"Deleting existing widgets for user: {user.email}")
        delete_result = (
            client
            .table('dashboard_widgets')
            .delete()
            .eq('user_email', user.email)
            .execute()
        )
        logger.info(f"Delete result: {delete_result}")

        # Insert new widgets
        logger.info("Preparing widget data for insertion...")
        widget_data = [{
            'user_email': user.email,
            'widget_data': widget,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        } for widget in data]

        logger.info("Inserting new widgets...")
        result = (
            client
            .table('dashboard_widgets')
            .insert(widget_data)
            .execute()
        )
        
        logger.info(f"Insert result: {result}")
        if not hasattr(result, 'data'):
            logger.error("No data returned from insert operation")
            return jsonify({'error': 'Failed to save widgets - no data returned'}), 500

        return jsonify(result.data), 201

    except Exception as e:
        logger.error(f"Failed to save widgets: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500 