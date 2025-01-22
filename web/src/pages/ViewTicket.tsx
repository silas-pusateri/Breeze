import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_email: string;
  assigned_to?: string;
}

const ViewTicket: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!token || !refreshToken) {
          setError('Authentication tokens not found');
          return;
        }

        const response = await fetch(`http://localhost:5001/tickets/${ticketId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Refresh-Token': refreshToken,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTicket(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch ticket');
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
        setError('Network error while fetching ticket');
      }
    };

    fetchTicket();
  }, [ticketId]);

  if (!ticket) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <ProgressSpinner />
      </div>
    );
  }

  const getStatusClass = (status: string) => {
    return `status-badge status-${status.toLowerCase()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="flex align-items-center justify-content-center min-h-screen p-4">
      <div className="w-full md:w-8 lg:w-6">
        <Card className="shadow-2">
          {error && (
            <Message severity="error" text={error} className="mb-3 w-full" />
          )}
          
          <div className="flex justify-content-between align-items-center mb-4">
            <h1 className="text-3xl font-bold m-0">{ticket.title}</h1>
            <span className={getStatusClass(ticket.status)}>{ticket.status}</span>
          </div>

          <div className="grid">
            <div className="col-12 md:col-6">
              <p className="text-500">Created by: {ticket.user_email}</p>
              <p className="text-500">Created at: {formatDate(ticket.created_at)}</p>
            </div>
            <div className="col-12 md:col-6">
              <p className="text-500">Assigned to: {ticket.assigned_to || 'Unassigned'}</p>
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="white-space-pre-line">{ticket.description}</p>
          </div>

          <div className="flex gap-2 mt-4">
            {userRole === 'agent' && (
              <Button
                label="Edit Ticket"
                icon="pi pi-pencil"
                onClick={() => navigate(`/edit-ticket/${ticket.id}`)}
              />
            )}
            <Button
              label="Back to Dashboard"
              icon="pi pi-arrow-left"
              severity="secondary"
              outlined
              onClick={() => navigate('/dashboard')}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ViewTicket; 