from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import io
from datetime import datetime
from functools import wraps
from .auth import get_user_from_token, requires_auth, requires_agent
from config import supabase_client, logger
import traceback
import base64
from utils.rag_utils import rag_service
from utils.async_utils import async_route

knowledge_bp = Blueprint('knowledge', __name__)

ALLOWED_EXTENSIONS = {'md', 'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@knowledge_bp.route('/knowledge/upload', methods=['POST'])
@requires_agent
@async_route
async def upload_file():
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

        try:
            # Set the session first
            session = supabase_client.auth.set_session(token, refresh_token)
            logger.info(f"Session user metadata: {session.user.user_metadata}")
            logger.info(f"Session user role: {session.user.user_metadata.get('role')}")
            logger.info(f"Session user ID: {session.user.id}")
        except Exception as auth_error:
            logger.error(f"Authentication error: {str(auth_error)}")
            return jsonify({'error': 'Authentication failed'}), 401
        
        # Then get user info
        user = get_user_from_token(request)
        if not user:
            return jsonify({'error': 'Invalid user token'}), 401
            
        logger.info(f"User info from token: {user}")
        
        filename = secure_filename(file.filename)
        file_content = file.read()
        file_size = len(file_content)
        file_type = filename.rsplit('.', 1)[1].lower()
        
        # For text and markdown files, decode as UTF-8
        if file_type in ['txt', 'md']:
            try:
                file_content = file_content.decode('utf-8')
            except UnicodeDecodeError:
                # If UTF-8 fails, try other common encodings
                for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                    try:
                        file_content = file_content.decode(encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    return jsonify({'error': 'File encoding not supported'}), 400
        else:
            # For binary files, encode as base64
            file_content = base64.b64encode(file_content).decode('utf-8')
        
        file_data = {
            'filename': filename,
            'file_type': file_type,
            'content': file_content,
            'file_size': file_size,
            'uploaded_by': session.user.id,
            'uploaded_at': datetime.now().isoformat()
        }
        
        # Log the Supabase client state
        logger.info("About to execute insert...")
        logger.info(f"Current auth state - has session: {bool(supabase_client.auth.get_session())}")
        logger.info(f"File content preview: {file_content[:100] if isinstance(file_content, str) else '<binary>'}")
        
        try:
            result = (
                supabase_client
                .table('knowledge_files')
                .insert(file_data)
                .execute()
            )
            
            if not hasattr(result, 'data') or not result.data:
                return jsonify({'error': 'Failed to save file to database'}), 500
                
            file_record = result.data[0]
            
            # Only upsert text-based files to Pinecone
            indexed = False
            if file_type in ['txt', 'md']:
                try:
                    await rag_service.upsert_knowledge_base_files([{
                        'content': file_content,
                        'title': filename,
                        'path': filename,
                        'metadata': {
                            'file_type': file_type,
                            'file_size': file_size,
                            'uploaded_by': user['email'],
                            'uploaded_at': file_data['uploaded_at'],
                            'id': str(file_record['id'])
                        }
                    }])
                    indexed = True
                except Exception as index_error:
                    logger.error(f"Failed to index file in Pinecone: {str(index_error)}")
                    # Don't fail the upload if indexing fails
            
            # Get user email for response
            user_email = user['email']
            
            return jsonify({
                'message': 'File uploaded successfully',
                'file': {
                    'id': file_record['id'],
                    'filename': filename,
                    'file_type': file_type,
                    'file_size': file_size,
                    'uploaded_by': user_email,
                    'uploaded_at': file_data['uploaded_at'],
                    'indexed': indexed
                },
                'success': True
            }), 201
            
        except Exception as db_error:
            logger.error(f"Database error: {str(db_error)}")
            return jsonify({'error': 'Failed to save file to database'}), 500

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

        # Set the session and get current user
        session = supabase_client.auth.set_session(token, refresh_token)
        
        # First get all files
        result = (
            supabase_client
            .table('knowledge_files')
            .select('id, filename, file_type, file_size, uploaded_by, uploaded_at')
            .execute()
        )
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify([]), 200
            
        # Collect unique user IDs
        user_ids = list(set(file['uploaded_by'] for file in result.data if file.get('uploaded_by')))
        
        # Create a mapping of user IDs to emails using RPC function
        user_emails = {}
        for user_id in user_ids:
            try:
                # Call the get_user_email RPC function
                email_result = (
                    supabase_client
                    .rpc('get_user_email', {'user_id': user_id})
                    .execute()
                )
                if hasattr(email_result, 'data') and email_result.data:
                    user_emails[user_id] = email_result.data
                else:
                    user_emails[user_id] = 'Unknown User'
            except Exception as e:
                logger.error(f"Failed to get email for user {user_id}: {str(e)}")
                user_emails[user_id] = 'Unknown User'
        
        # Transform the response with resolved emails
        files_data = [{
            'id': file['id'],
            'filename': file['filename'],
            'file_type': file['file_type'],
            'file_size': file['file_size'],
            'uploaded_by': user_emails.get(file['uploaded_by'], 'Unknown User'),
            'uploaded_at': file['uploaded_at']
        } for file in result.data]
        
        return jsonify(files_data), 200

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
        supabase_client.auth.set_session(token, refresh_token)
        
        result = (
            supabase_client
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

@knowledge_bp.route('/knowledge/files/<int:file_id>/content', methods=['GET'])
@requires_auth
def get_file_content(file_id):
    try:
        # Get the raw token without 'Bearer ' prefix
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        refresh_token = request.headers.get('X-Refresh-Token')
        
        if not token or not refresh_token:
            return jsonify({'error': 'No authorization tokens provided'}), 401

        # Set the session
        supabase_client.auth.set_session(token, refresh_token)
        
        result = (
            supabase_client
            .table('knowledge_files')
            .select('*')
            .eq('id', file_id)
            .execute()
        )
        
        if not hasattr(result, 'data') or not result.data:
            return jsonify({'error': 'File not found'}), 404

        file_data = result.data[0]
        content = file_data['content']
        
        # For markdown and text files, return the content directly
        if file_data['file_type'] in ['txt', 'md']:
            # Log content for debugging
            logger.info(f"Content type: {type(content)}")
            logger.info(f"Content preview: {content[:100] if content else 'None'}")
            
            # Ensure content is a string
            if isinstance(content, bytes):
                try:
                    content = content.decode('utf-8')
                except UnicodeDecodeError:
                    content = content.decode('latin-1')
            
            return jsonify({'content': content}), 200
        else:
            # For binary files, return base64 encoded content
            return jsonify({
                'content': content,
                'encoding': 'base64'
            }), 200

    except Exception as e:
        logger.error(f"Failed to get file content: {str(e)}")
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
        supabase_client.auth.set_session(token, refresh_token)
        
        result = (
            supabase_client
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