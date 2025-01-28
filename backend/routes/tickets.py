from flask import Blueprint, request, jsonify
from datetime import datetime
from config import supabase_client, logger
from postgrest import APIError
import traceback
from .auth import requires_auth, get_user_from_token
from utils.rag_utils import rag_service
from utils.async_utils import async_route
import uuid as uuid_pkg  # Rename to avoid conflict

tickets_bp = Blueprint('tickets', __name__)

def get_supabase_client(access_token, refresh_token):
    try:
        # Set the session
        supabase_client.auth.set_session(access_token, refresh_token)
        return supabase_client
    except Exception as e:
        logger.error(f"Error setting session: {str(e)}")
        return None

@tickets_bp.route('/tickets', methods=['POST'])
@requires_auth
@async_route
async def create_ticket():
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user['email']
        role = user['role']
        
        data = request.get_json()
        logger.info(f"Creating ticket for {email} with role {role}")
        logger.info(f"Request data: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        title = data.get('title')
        description = data.get('description')
        
        if not title or not description:
            return jsonify({'error': 'Title and description are required'}), 422
            
        # Generate UUID for the ticket
        ticket_uuid = str(uuid_pkg.uuid4())
            
        # Insert ticket into Supabase
        ticket_data = {
            'user_email': email,
            'title': title,
            'description': description,
            'created_at': datetime.now().isoformat(),
            'status': 'open',
            'assignee': data.get('assignee', []),  # Get assignee from request or default to empty array
            'username': user.get('user_metadata', {}).get('full_name', email),
            'responses': [],
            'related_uuids': [],
            'uuid': ticket_uuid
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
                # After successful ticket creation, upsert to Pinecone
                ticket = result.data[0]
                await rag_service.upsert_tickets([{
                    'id': str(ticket['id']),
                    'uuid': ticket['uuid'],
                    'title': ticket['title'],
                    'content': ticket['description'],
                    'metadata': {
                        'user_email': ticket['user_email'],
                        'status': ticket['status'],
                        'created_at': ticket['created_at'],
                        'updated_at': datetime.now().isoformat(),
                        'uuid': ticket['uuid'],
                        'username': ticket['username'],
                        'assignee': ticket.get('assignee', []),
                        'responses': ticket.get('responses', []),
                        'related_uuids': ticket.get('related_uuids', [])
                    }
                }])
                return jsonify(ticket), 201
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
            'details': str(e)
        }), 500

@tickets_bp.route('/tickets', methods=['GET'])
@requires_auth
def get_tickets():
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user['email']
        role = user['role']
            
        logger.info(f"Fetching tickets for {email} with role {role}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # Define fields to select
        select_fields = ['*', 'username', 'responses', 'related_uuids', 'assignee']
        
        # Query tickets based on role
        if role == 'customer':
            logger.info("Filtering tickets for customer")
            # Customers can only see their own tickets
            result = (
                client
                .table('tickets')
                .select(','.join(select_fields))
                .eq('user_email', email)
                .order('created_at', desc=True)
                .execute()
            )
        else:
            logger.info("Fetching all tickets for agent")
            # Agents can see all tickets
            result = (
                client
                .table('tickets')
                .select(','.join(select_fields))
                .order('created_at', desc=True)
                .execute()
            )
            
        logger.info(f"Query result: {result}")
        
        # Process tickets to include additional metadata
        if hasattr(result, 'data') and result.data:
            tickets = result.data
            for ticket in tickets:
                # Ensure all array fields are initialized
                ticket['responses'] = ticket.get('responses', [])
                ticket['related_uuids'] = ticket.get('related_uuids', [])
                ticket['assignee'] = ticket.get('assignee', [])
                # Set username if not present
                if not ticket.get('username'):
                    ticket['username'] = ticket['user_email']
            return jsonify(tickets)
        return jsonify([])
        
    except Exception as e:
        logger.error(f"Error fetching tickets: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@tickets_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@requires_auth
def get_ticket(ticket_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user['email']
        role = user['role']
            
        logger.info(f"Fetching ticket {ticket_id} for {email}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # Define fields to select
        select_fields = ['*', 'username', 'responses', 'related_uuids', 'assignee']
        
        # Query specific ticket
        query = (
            client
            .table('tickets')
            .select(','.join(select_fields))
            .eq('id', ticket_id)
        )
        
        if role == 'customer':
            # Customers can only see their own tickets
            query = query.eq('user_email', email)
            
        result = query.execute()
        logger.info(f"Query result: {result}")
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'Ticket not found'}), 404
            
        # Process ticket to include additional metadata
        ticket = result.data[0]
        # Ensure all array fields are initialized
        ticket['responses'] = ticket.get('responses', [])
        ticket['related_uuids'] = ticket.get('related_uuids', [])
        ticket['assignee'] = ticket.get('assignee', [])
        # Set username if not present
        if not ticket.get('username'):
            ticket['username'] = ticket['user_email']
            
        return jsonify(ticket)
        
    except Exception as e:
        logger.error(f"Error fetching ticket: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@tickets_bp.route('/tickets/<int:ticket_id>', methods=['PUT'])
@requires_auth
@async_route
async def update_ticket(ticket_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user['email']
        role = user['role']
            
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
            
        result = existing_ticket.execute()
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'Ticket not found or access denied'}), 404
            
        current_ticket = result.data[0]
        
        # Prepare update data based on user role
        update_data = {}
        
        # Customers can only update description and add responses
        if role == 'customer':
            if 'description' in data:
                update_data['description'] = data['description']
            if 'responses' in data:
                # Append new responses to existing ones
                current_responses = current_ticket.get('responses', [])
                new_response = {
                    'content': data['responses'][-1]['content'],
                    'created_at': datetime.now().isoformat(),
                    'user_email': email,
                    'username': user.get('user_metadata', {}).get('full_name', email)
                }
                update_data['responses'] = current_responses + [new_response]
        else:
            # Agents can update all fields
            allowed_fields = ['description', 'status', 'assignee', 'responses']
            for field in allowed_fields:
                if field in data:
                    if field == 'responses' and data[field]:
                        # Handle responses similar to customer case
                        current_responses = current_ticket.get('responses', [])
                        new_response = {
                            'content': data['responses'][-1]['content'],
                            'created_at': datetime.now().isoformat(),
                            'user_email': email,
                            'username': user.get('user_metadata', {}).get('full_name', email)
                        }
                        update_data['responses'] = current_responses + [new_response]
                    else:
                        update_data[field] = data[field]
            
            # Handle related_uuids separately to prevent accidental overwrites
            if 'related_uuids' in data:
                current_related = set(current_ticket.get('related_uuids', []))
                new_related = set(data['related_uuids'])
                update_data['related_uuids'] = list(current_related.union(new_related))
        
        # Update the ticket
        update_result = (
            client
            .table('tickets')
            .update(update_data)
            .eq('id', ticket_id)
            .execute()
        )
        
        if hasattr(update_result, 'data') and update_result.data:
            # After successful ticket update, upsert to Pinecone
            ticket = update_result.data[0]
            await rag_service.upsert_tickets([{
                'id': str(ticket['id']),
                'uuid': ticket['uuid'],
                'title': ticket['title'],
                'content': ticket['description'],
                'metadata': {
                    'user_email': ticket['user_email'],
                    'status': ticket['status'],
                    'created_at': ticket['created_at'],
                    'updated_at': datetime.now().isoformat(),
                    'uuid': ticket['uuid'],
                    'username': ticket['username'],
                    'assignee': ticket.get('assignee', []),
                    'responses': ticket.get('responses', []),
                    'related_uuids': ticket.get('related_uuids', [])
                }
            }])
            return jsonify(ticket)
        else:
            return jsonify({'error': 'Failed to update ticket'}), 500
            
    except Exception as e:
        logger.error(f"Error updating ticket: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@tickets_bp.route('/tickets/uuid/<string:uuid>', methods=['GET'])
@requires_auth
def get_ticket_by_uuid(uuid):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user['email']
        role = user['role']
            
        logger.info(f"Fetching ticket with UUID {uuid} for {email}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # Define fields to select
        select_fields = ['*', 'username', 'responses', 'related_uuids', 'assignee']
        
        # Query specific ticket by UUID
        query = (
            client
            .table('tickets')
            .select(','.join(select_fields))
            .eq('uuid', uuid)
        )
        
        if role == 'customer':
            # Customers can only see their own tickets
            query = query.eq('user_email', email)
            
        result = query.execute()
        logger.info(f"Query result: {result}")
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'Ticket not found'}), 404
            
        # Process ticket to include additional metadata
        ticket = result.data[0]
        # Ensure all array fields are initialized
        ticket['responses'] = ticket.get('responses', [])
        ticket['related_uuids'] = ticket.get('related_uuids', [])
        ticket['assignee'] = ticket.get('assignee', [])
        # Set username if not present
        if not ticket.get('username'):
            ticket['username'] = ticket['user_email']
            
        return jsonify(ticket)
        
    except Exception as e:
        logger.error(f"Error fetching ticket by UUID: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Add endpoint to get related tickets
@tickets_bp.route('/tickets/<int:ticket_id>/related', methods=['GET'])
@requires_auth
def get_related_tickets(ticket_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user['email']
        role = user['role']
            
        logger.info(f"Fetching related tickets for ticket {ticket_id}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # First get the current ticket to check access and get its UUID
        current_ticket = (
            client
            .table('tickets')
            .select('*, uuid')
            .eq('id', ticket_id)
        )
        
        if role == 'customer':
            current_ticket = current_ticket.eq('user_email', email)
            
        result = current_ticket.execute()
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'Ticket not found or access denied'}), 404
            
        current_ticket_data = result.data[0]
        current_uuid = current_ticket_data['uuid']
        
        # Get relationships where current ticket is either ticket_uuid_1 or ticket_uuid_2
        relationships_1 = (
            client
            .table('ticket_relationships')
            .select('ticket_uuid_2')
            .eq('ticket_uuid_1', current_uuid)
            .execute()
        )
        
        relationships_2 = (
            client
            .table('ticket_relationships')
            .select('ticket_uuid_1')
            .eq('ticket_uuid_2', current_uuid)
            .execute()
        )
        
        # Combine related ticket UUIDs
        related_uuids = []
        
        if hasattr(relationships_1, 'data') and relationships_1.data:
            related_uuids.extend([r['ticket_uuid_2'] for r in relationships_1.data])
            
        if hasattr(relationships_2, 'data') and relationships_2.data:
            related_uuids.extend([r['ticket_uuid_1'] for r in relationships_2.data])
            
        # Get related tickets
        related_tickets = []
        for uuid in related_uuids:
            query = (
                client
                .table('tickets')
                .select('*, uuid')
                .eq('uuid', uuid)
            )
            
            if role == 'customer':
                query = query.eq('user_email', email)
                
            ticket_result = query.execute()
            if hasattr(ticket_result, 'data') and ticket_result.data:
                related_tickets.append(ticket_result.data[0])
        
        return jsonify({
            'current_ticket': current_ticket_data,
            'related_tickets': related_tickets
        })
        
    except Exception as e:
        logger.error(f"Error fetching related tickets: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@tickets_bp.route('/tickets/<int:ticket_id>/link', methods=['POST'])
@requires_auth
def link_tickets(ticket_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401
            
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
            
        email = user['email']
        role = user['role']
            
        data = request.get_json()
        if not data or 'related_uuid' not in data:
            return jsonify({'error': 'Related ticket UUID is required'}), 400
            
        related_uuid = data['related_uuid']
        logger.info(f"Linking ticket {ticket_id} with ticket UUID {related_uuid}")
        
        # Get Supabase client with session
        client = get_supabase_client(token, refresh_token)
        if not client:
            return jsonify({'error': 'Failed to initialize Supabase client'}), 500
        
        # First get the current ticket to check access and get its UUID
        current_ticket = (
            client
            .table('tickets')
            .select('*')
            .eq('id', ticket_id)
        )
        
        if role == 'customer':
            current_ticket = current_ticket.eq('user_email', email)
            
        result = current_ticket.execute()
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'Ticket not found or access denied'}), 404
            
        current_ticket_data = result.data[0]
        current_uuid = current_ticket_data['uuid']
        
        # Check if the related ticket exists
        related_ticket = (
            client
            .table('tickets')
            .select('*')
            .eq('uuid', related_uuid)
        )
        
        if role == 'customer':
            related_ticket = related_ticket.eq('user_email', email)
            
        related_result = related_ticket.execute()
        
        if not hasattr(related_result, 'data') or not related_result.data:
            return jsonify({'error': 'Related ticket not found or access denied'}), 404
            
        # Create or update ticket relationships
        # First check if relationship already exists
        existing_relationship = (
            client
            .table('ticket_relationships')
            .select('*')
            .eq('uuid_1', current_uuid)
            .eq('uuid_2', related_uuid)
            .execute()
        )
        
        if not hasattr(existing_relationship, 'data') or not existing_relationship.data:
            # Create new relationship
            relationship_data = {
                'uuid_1': current_uuid,
                'uuid_2': related_uuid,
                'created_at': datetime.now().isoformat(),
                'created_by': email
            }
            
            relationship_result = (
                client
                .table('ticket_relationships')
                .insert(relationship_data)
                .execute()
            )
            
            if not hasattr(relationship_result, 'data'):
                return jsonify({'error': 'Failed to create ticket relationship'}), 500
                
        return jsonify({
            'message': 'Tickets linked successfully',
            'ticket_1': current_ticket_data,
            'ticket_2': related_result.data[0]
        })
        
    except Exception as e:
        logger.error(f"Error linking tickets: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500 