from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import io
from datetime import datetime
from functools import wraps
from .auth import get_user_from_token, requires_auth, requires_agent
from config import supabase, logger
import traceback

knowledge_bp = Blueprint('knowledge', __name__)

ALLOWED_EXTENSIONS = {'md', 'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@knowledge_bp.route('/knowledge/upload', methods=['POST'])
@requires_agent
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401

        # Set the session first
        session = supabase.auth.set_session(token, refresh_token)
        logger.info(f"Session user metadata: {session.user.user_metadata}")
        logger.info(f"Session user role: {session.user.user_metadata.get('role')}")
        
        # Then get user info
        user = get_user_from_token(request)
        logger.info(f"User info from token: {user}")
        
        filename = secure_filename(file.filename)
        file_content = file.read()
        file_size = len(file_content)
        file_type = filename.rsplit('.', 1)[1].lower()
        
        file_data = {
            'filename': filename,
            'file_type': file_type,
            'content': file_content.decode('utf-8') if file_type in ['txt', 'md'] else str(file_content),
            'file_size': file_size,
            'uploaded_by': user['email'],
            'uploaded_at': datetime.now().isoformat()
        }
        
        # Log the Supabase client state
        logger.info("About to execute insert...")
        logger.info(f"Current auth state - has session: {bool(supabase.auth.get_session())}")
        
        result = (
            supabase
            .table('knowledge_files')
            .insert(file_data)
            .execute()
        )
        
        if hasattr(result, 'data') and result.data:
            return jsonify({'message': 'File uploaded successfully', 'id': result.data[0]['id']}), 201
        else:
            return jsonify({'error': 'Failed to upload file'}), 500

    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@knowledge_bp.route('/knowledge/files', methods=['GET'])
@requires_auth
def list_files():
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401

        # Set the session
        supabase.auth.set_session(token, refresh_token)
        
        result = (
            supabase
            .table('knowledge_files')
            .select('id, filename, file_type, file_size, uploaded_by, uploaded_at')
            .execute()
        )
        
        return jsonify(result.data if hasattr(result, 'data') and result.data else []), 200

    except Exception as e:
        logger.error(f"Failed to list files: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@knowledge_bp.route('/knowledge/files/<int:file_id>', methods=['GET'])
@requires_auth
def get_file(file_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401

        # Set the session
        supabase.auth.set_session(token, refresh_token)
        
        result = (
            supabase
            .table('knowledge_files')
            .select('*')
            .eq('id', file_id)
            .execute()
        )
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'File not found'}), 404

        file_data = result.data[0]
        content = file_data['content']
        
        if file_data['file_type'] in ['txt', 'md']:
            content = content.encode('utf-8')
        else:
            content = eval(content)  # Convert string representation back to bytes

        return send_file(
            io.BytesIO(content),
            mimetype=f'application/{file_data["file_type"]}',
            as_attachment=True,
            download_name=file_data['filename']
        )

    except Exception as e:
        logger.error(f"Failed to get file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@knowledge_bp.route('/knowledge/files/<int:file_id>', methods=['DELETE'])
@requires_agent
def delete_file(file_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401

        # Set the session
        supabase.auth.set_session(token, refresh_token)
        
        result = (
            supabase
            .table('knowledge_files')
            .delete()
            .eq('id', file_id)
            .execute()
        )
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'File not found'}), 404

        return jsonify({'message': 'File deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Failed to delete file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500 