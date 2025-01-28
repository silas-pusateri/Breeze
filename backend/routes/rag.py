from flask import Blueprint, request, jsonify
from utils.rag_utils import rag_service
from utils.auth import requires_auth
from utils.async_utils import async_route

rag_bp = Blueprint('rag', __name__)

@rag_bp.route('/query', methods=['POST', 'OPTIONS'])
@requires_auth
@async_route
async def query_rag():
    """
    Endpoint to query the RAG system
    """
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400
            
        query = data['query']
        response = await rag_service.query(query)
        
        return jsonify({
            'response': response,
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@rag_bp.route('/upsert/files', methods=['POST'])
@requires_auth
@async_route
async def upsert_files():
    """
    Endpoint to upsert knowledge base files to the vector store
    """
    try:
        data = request.get_json()
        if not data or 'files' not in data:
            return jsonify({'error': 'Files are required'}), 400
            
        files = data['files']
        
        # Validate file format
        for file in files:
            if not all(key in file for key in ['content', 'title', 'path']):
                return jsonify({
                    'error': 'Each file must contain content, title, and path'
                }), 400
        
        await rag_service.upsert_knowledge_base_files(files)
        
        return jsonify({
            'message': f'Successfully upserted {len(files)} files',
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@rag_bp.route('/upsert/tickets', methods=['POST'])
@requires_auth
@async_route
async def upsert_tickets():
    """
    Endpoint to upsert tickets to the vector store
    """
    try:
        data = request.get_json()
        if not data or 'tickets' not in data:
            return jsonify({'error': 'Tickets are required'}), 400
            
        tickets = data['tickets']
        
        # Validate ticket format
        for ticket in tickets:
            if not all(key in ticket for key in ['content', 'title', 'id']):
                return jsonify({
                    'error': 'Each ticket must contain content, title, and id'
                }), 400
        
        await rag_service.upsert_tickets(tickets)
        
        return jsonify({
            'message': f'Successfully upserted {len(tickets)} tickets',
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@rag_bp.route('/delete', methods=['POST'])
@requires_auth
@async_route
async def delete_vectors():
    """
    Endpoint to delete vectors from the vector store
    """
    try:
        data = request.get_json()
        if not data or 'ids' not in data or 'namespace' not in data:
            return jsonify({'error': 'Vector IDs and namespace are required'}), 400
            
        ids = data['ids']
        namespace = data['namespace']
        
        # Validate namespace
        if namespace not in ['breeze_kb', 'breeze_tickets']:
            return jsonify({
                'error': 'Namespace must be either breeze_kb or breeze_tickets'
            }), 400
        
        await rag_service.delete_by_ids(ids, namespace)
        
        return jsonify({
            'message': f'Successfully deleted {len(ids)} vectors from {namespace}',
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@rag_bp.route('/documents', methods=['POST'])
@requires_auth
@async_route
async def add_documents():
    """
    Endpoint to add documents to the RAG system
    """
    try:
        data = request.get_json()
        if not data or 'documents' not in data:
            return jsonify({'error': 'Documents are required'}), 400
            
        documents = data['documents']
        metadata = data.get('metadata', None)
        
        await rag_service.add_documents(documents, metadata)
        
        return jsonify({
            'message': 'Documents added successfully',
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500 