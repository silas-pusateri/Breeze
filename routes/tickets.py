from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

tickets_bp = Blueprint('tickets', __name__)

# Temporary ticket storage (replace with Supabase later)
tickets = []

@tickets_bp.route('/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    ticket = {
        'id': len(tickets) + 1,
        'username': current_user['username'],
        'title': data.get('title'),
        'description': data.get('description'),
        'created_at': datetime.now().isoformat(),
        'status': 'open',
        'assigned_to': None
    }
    
    tickets.append(ticket)
    return jsonify(ticket), 201

@tickets_bp.route('/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    current_user = get_jwt_identity()
    
    if current_user['role'] == 'agent':
        # Agents can see all tickets
        return jsonify(tickets), 200
    else:
        # Customers can only see their own tickets
        user_tickets = [t for t in tickets if t['username'] == current_user['username']]
        return jsonify(user_tickets), 200

@tickets_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket(ticket_id):
    current_user = get_jwt_identity()
    
    ticket = next((t for t in tickets if t['id'] == ticket_id), None)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
        
    if current_user['role'] != 'agent' and ticket['username'] != current_user['username']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    return jsonify(ticket), 200 