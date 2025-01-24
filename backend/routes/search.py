from flask import Blueprint, request, jsonify
from config import supabase_client

search_bp = Blueprint('search', __name__)

@search_bp.route('/api/search', methods=['GET'])
def search():
    # Get the token from the Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No valid token provided'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        # Verify the token with Supabase
        user = supabase_client.auth.get_user(token)
        if not user or not user.user:
            return jsonify({'error': 'Invalid token'}), 401
        
        current_user = user.user.email
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'tickets': [], 'files': []})

        # Check if user is an agent using user metadata
        is_agent = user.user.user_metadata.get('role') == 'agent'

        # Search tickets based on user role using Supabase
        search_pattern = f"%{query}%"
        
        # Build tickets query
        tickets_query = supabase_client.table('tickets') \
            .select('id, title, description, status, user_email, created_at') \
            .ilike('title', search_pattern)

        # Get tickets matching description as well
        tickets_desc_query = supabase_client.table('tickets') \
            .select('id, title, description, status, user_email, created_at') \
            .ilike('description', search_pattern)

        # If not an agent, filter by user's email
        if not is_agent:
            tickets_query = tickets_query.eq('user_email', current_user)
            tickets_desc_query = tickets_desc_query.eq('user_email', current_user)

        # Execute both queries
        title_results = tickets_query.execute()
        desc_results = tickets_desc_query.execute()

        # Combine and deduplicate results
        all_tickets = {ticket['id']: ticket for ticket in title_results.data}
        all_tickets.update({ticket['id']: ticket for ticket in desc_results.data})
        tickets_result = list(all_tickets.values())

        # Search knowledge files
        files_query = supabase_client.table('knowledge_files') \
            .select('id, filename, uploaded_at, uploaded_by, file_type, file_size') \
            .ilike('filename', search_pattern)

        files_result = files_query.execute()

        # Sort results by created_at/uploaded_at in descending order
        tickets_result.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Transform the files result to match the expected format
        files_data = [{
            'id': f['id'],
            'filename': f['filename'],
            'created_at': f['uploaded_at'],
            'user_email': f['uploaded_by'],
            'file_type': f['file_type'],
            'file_size': f['file_size']
        } for f in files_result.data]
        
        return jsonify({
            'tickets': tickets_result[:100],  # Limit to 100 results
            'files': files_data[:100]  # Limit to 100 results
        })

    except Exception as e:
        print(f"Search error: {str(e)}")  # Add debug logging
        return jsonify({'error': str(e)}), 500