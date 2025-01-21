from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime

tickets_bp = Blueprint('tickets', __name__)

# Temporary ticket storage (replace with Supabase later)
tickets = []

@tickets_bp.route('/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    try:
        # Get username from identity and role from claims
        username = get_jwt_identity()
        claims = get_jwt()
        print("POST - Username:", username)  # Debug log
        print("POST - Claims:", claims)  # Debug log
        
        data = request.get_json()
        print("POST - Request Data:", data)  # Debug log
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        title = data.get('title')
        description = data.get('description')
        
        if not title or not description:
            return jsonify({'error': 'Title and description are required'}), 422
            
        ticket = {
            'id': len(tickets) + 1,
            'username': username,
            'title': title,
            'description': description,
            'created_at': datetime.now().isoformat(),
            'status': 'open',
            'assigned_to': None
        }
        
        tickets.append(ticket)
        return jsonify(ticket), 201
    except Exception as e:
        print("Error in create_ticket:", str(e))  # Debug log
        return jsonify({'error': 'Failed to create ticket: ' + str(e)}), 500

@tickets_bp.route('/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    try:
        # Get username from identity and role from claims
        username = get_jwt_identity()
        claims = get_jwt()
        print("GET - Username:", username)  # Debug log
        print("GET - Claims:", claims)  # Debug log
        
        if claims.get('role') == 'agent':
            # Agents can see all tickets
            return jsonify(tickets), 200
        else:
            # Customers can only see their own tickets
            user_tickets = [t for t in tickets if t['username'] == username]
            return jsonify(user_tickets), 200
    except Exception as e:
        print("Error in get_tickets:", str(e))  # Debug log
        return jsonify({'error': 'Failed to get tickets: ' + str(e)}), 500

@tickets_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket(ticket_id):
    try:
        # Get username from identity and role from claims
        username = get_jwt_identity()
        claims = get_jwt()
        print("GET Single - Username:", username)  # Debug log
        print("GET Single - Claims:", claims)  # Debug log
        
        ticket = next((t for t in tickets if t['id'] == ticket_id), None)
        if not ticket:
            return jsonify({'error': 'Ticket not found'}), 404
            
        if claims.get('role') != 'agent' and ticket['username'] != username:
            return jsonify({'error': 'Unauthorized'}), 403
            
        return jsonify(ticket), 200
    except Exception as e:
        print("Error in get_ticket:", str(e))  # Debug log
        return jsonify({'error': 'Failed to get ticket: ' + str(e)}), 500 