import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  username: string;
}

interface StatusOption {
  label: string;
  value: string;
}

const statusOptions: StatusOption[] = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' }
];

const EditTicket: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [userRole, setUserRole] = useState<string>('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    status: '',
  });

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setUserRole(storedRole);
    }

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
          setFormData({
            description: data.description,
            status: data.status,
          });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!token || !refreshToken) {
        setError('Authentication tokens not found');
        return;
      }

      const updateData = userRole === 'agent'
        ? formData
        : { description: formData.description };

      const response = await fetch(`http://localhost:5001/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update ticket');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      setError('Network error while updating ticket');
    }
  };

  if (!ticket) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="flex align-items-center justify-content-center min-h-screen">
      <div className="w-full md:w-8 lg:w-6">
        <Card title="Edit Ticket" className="shadow-2">
          {error && (
            <Message severity="error" text={error} className="mb-3 w-full" />
          )}
          <form onSubmit={handleSubmit} className="flex flex-column gap-3">
            <div className="mb-3">
              <h2 className="text-xl font-bold m-0">{ticket.title}</h2>
              <p className="text-500 mt-2">Created by: {ticket.username}</p>
            </div>

            <div className="p-float-label">
              <InputTextarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full"
                required
                autoResize
              />
              <label htmlFor="description">Description</label>
            </div>

            {userRole === 'agent' && (
              <div className="p-float-label">
                <Dropdown
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.value })}
                  options={statusOptions}
                  optionLabel="label"
                  className="w-full"
                />
                <label htmlFor="status">Status</label>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <Button
                label="Update Ticket"
                icon="pi pi-check"
                type="submit"
              />
              <Button
                label="Cancel"
                icon="pi pi-times"
                severity="secondary"
                outlined
                type="button"
                onClick={() => navigate('/dashboard')}
              />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditTicket; 