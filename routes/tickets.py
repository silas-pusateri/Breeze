from flask import Blueprint, request, jsonify
from datetime import datetime
from config import supabase, logger
from postgrest import APIError
import traceback

tickets_bp = Blueprint('tickets', __name__)

def get_user_from_token(token):
    try:
        # Get user info from Supabase token
        user = supabase.auth.get_user(token)
        return user.user
    except Exception as e:
        logger.error(f"Error getting user from token: {str(e)}")
        return None

def get_supabase_client(access_token, refresh_token):
    try:
        # Set the session
        supabase.auth.set_session(access_token, refresh_token)
        return supabase
    except Exception as e:
        logger.error(f"Error setting session: {str(e)}")
        return None

@tickets_bp.route('/tickets', methods=['POST'])
def create_ticket():
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user.email
        role = user.user_metadata.get('role', 'customer')
        
        data = request.get_json()
        logger.info(f"Creating ticket for {email} with role {role}")
        logger.info(f"Request data: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        title = data.get('title')
        description = data.get('description')
        
        if not title or not description:
            return jsonify({'error': 'Title and description are required'}), 422
            
        # Insert ticket into Supabase
        ticket_data = {
            'user_email': email,
            'title': title,
            'description': description,
            'created_at': datetime.now().isoformat(),
            'status': 'open',
            'assigned_to': None
        }
        
        logger.info(f"Inserting ticket data: {ticket_data}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # Proceed with insert
        try:
            result = (
                client
                .table('tickets')
                .insert(ticket_data)
                .execute()
            )
            logger.info(f"Insert result: {result}")
            
            if hasattr(result, 'data') and result.data:
                return jsonify(result.data[0]), 201
            else:
                return jsonify({'error': 'No data returned from insert operation'}), 500
                
        except APIError as api_e:
            logger.error(f"Supabase API error: {str(api_e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': f'Database API error: {str(api_e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error creating ticket: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Failed to create ticket',
            'details': str(e),
            'traceback': traceback.format_exc()
        }), 500

@tickets_bp.route('/tickets', methods=['GET'])
def get_tickets():
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user.email
        role = user.user_metadata.get('role', 'customer')
            
        logger.info(f"Fetching tickets for {email} with role {role}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # Query tickets based on role
        if role == 'customer':
            logger.info("Filtering tickets for customer")
            # Customers can only see their own tickets
            result = (
                client
                .table('tickets')
                .select('*')
                .eq('user_email', email)
                .execute()
            )
        else:
            logger.info("Fetching all tickets for agent")
            # Agents can see all tickets
            result = (
                client
                .table('tickets')
                .select('*')
                .execute()
            )
            
        logger.info(f"Query result: {result}")
        return jsonify(result.data if hasattr(result, 'data') and result.data else [])
        
    except Exception as e:
        logger.error(f"Error fetching tickets: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@tickets_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user.email
        role = user.user_metadata.get('role', 'customer')
            
        logger.info(f"Fetching ticket {ticket_id} for {email}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # Query specific ticket
        query = (
            client
            .table('tickets')
            .select('*')
            .eq('id', ticket_id)
        )
        
        if role == 'customer':
            # Customers can only see their own tickets
            query = query.eq('user_email', email)
            
        result = query.execute()
        logger.info(f"Query result: {result}")
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'Ticket not found'}), 404
            
        return jsonify(result.data[0])
        
    except Exception as e:
        logger.error(f"Error fetching ticket: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@tickets_bp.route('/tickets/<int:ticket_id>', methods=['PUT'])
def update_ticket(ticket_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user.email
        role = user.user_metadata.get('role', 'customer')
            
        logger.info(f"Updating ticket {ticket_id} for {email}")
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # Check if ticket exists and user has access
        existing_ticket = (
            client
            .table('tickets')
            .select('*')
            .eq('id', ticket_id)
        )
        
        if role == 'customer':
            existing_ticket = existing_ticket.eq('user_email', email)
            
        existing_result = existing_ticket.execute()
        
        if not hasattr(existing_result, 'data') or not existing_result.data:
            return jsonify({'error': 'Ticket not found or access denied'}), 404
            
        # Update ticket
        update_data = {}
        if 'title' in data:
            update_data['title'] = data['title']
        if 'description' in data:
            update_data['description'] = data['description']
        if 'status' in data and role == 'agent':  # Only agents can update status
            update_data['status'] = data['status']
        if 'assigned_to' in data and role == 'agent':  # Only agents can assign tickets
            update_data['assigned_to'] = data['assigned_to']
            
        logger.info(f"Updating with data: {update_data}")
        result = (
            client
            .table('tickets')
            .update(update_data)
            .eq('id', ticket_id)
            .execute()
        )
        logger.info(f"Update result: {result}")
        
        if hasattr(result, 'data') and result.data:
            return jsonify(result.data[0])
        else:
            return jsonify({'error': 'Failed to update ticket'}), 500
            
    except Exception as e:
        logger.error(f"Error updating ticket: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500 