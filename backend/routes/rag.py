from flask import Blueprint, request, jsonify
from utils.rag_utils import rag_service
from utils.auth import requires_auth

rag_bp = Blueprint('rag', __name__)

@rag_bp.route('/query', methods=['POST'])
@requires_auth
async def query_rag():
    """
    Endpoint to query the RAG system
    """
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

@rag_bp.route('/documents', methods=['POST'])
@requires_auth
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