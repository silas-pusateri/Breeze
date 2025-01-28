import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Timeline } from 'primereact/timeline';
import { MultiSelect } from 'primereact/multiselect';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';
import { fetchWithAuth } from '../utils/api';

interface Agent {
  id: string;  // Supabase UID
  email: string;
  name: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  username: string;
  user_email: string;
  assignee: string[];  // Array of agent UIDs
  responses: Array<{
    content: string;
    created_at: string;
    user_email: string;
    username: string;
  }>;
  related_uuids: string[];
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
    assignee: [] as string[],
    newResponse: ''
  });
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setUserRole(storedRole);
    }

    // Fetch available agents if user is an agent
    const fetchAgents = async () => {
      if (storedRole === 'agent') {
        try {
          const response = await fetchWithAuth('users/agents');
          if (response) {
            setAvailableAgents(response);
          }
        } catch (error) {
          console.error('Error fetching agents:', error);
          setError('Failed to fetch available agents');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAgents();

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
            assignee: data.assignee || [],
            newResponse: ''
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

      const updateData: any = {};
      
      // Add description if changed
      if (formData.description !== ticket?.description) {
        updateData.description = formData.description;
      }

      // Add status if changed and user is agent
      if (userRole === 'agent' && formData.status !== ticket?.status) {
        updateData.status = formData.status;
      }

      // Add assignee if changed and user is agent
      if (userRole === 'agent' && JSON.stringify(formData.assignee) !== JSON.stringify(ticket?.assignee)) {
        updateData.assignee = formData.assignee;
      }

      // Add new response if provided
      if (formData.newResponse.trim()) {
        updateData.responses = [{
          content: formData.newResponse.trim(),
          created_at: new Date().toISOString(),
          user_email: localStorage.getItem('userEmail') || '',
          username: localStorage.getItem('userName') || ''
        }];
      }

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

  const customTimelineMarker = (item: Ticket['responses'][0]) => {
    return (
      <Avatar
        label={item.username.charAt(0).toUpperCase()}
        size="normal"
        shape="circle"
        style={{ backgroundColor: '#2196F3', color: '#ffffff' }}
      />
    );
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
              <>
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

                <div className="p-float-label">
                  <MultiSelect
                    id="assignee"
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.value })}
                    options={availableAgents}
                    optionLabel="email"
                    optionValue="id"
                    className="w-full"
                    display="chip"
                    placeholder={loading ? 'Loading agents...' : 'Select agents to assign'}
                    disabled={loading}
                  />
                  <label htmlFor="assignee">Assign To</label>
                </div>
              </>
            )}

            <Divider align="center" type="solid">
              <span className="text-500">Responses</span>
            </Divider>

            {ticket.responses.length > 0 && (
              <Timeline
                value={ticket.responses}
                content={(item) => (
                  <div className="flex flex-column">
                    <small className="text-500">{new Date(item.created_at).toLocaleString()}</small>
                    <div className="text-900 mt-1">{item.content}</div>
                    <small className="text-600 mt-1">- {item.username}</small>
                  </div>
                )}
                marker={customTimelineMarker}
                className="w-full"
              />
            )}

            <div className="p-float-label mt-3">
              <InputTextarea
                id="newResponse"
                value={formData.newResponse}
                onChange={(e) =>
                  setFormData({ ...formData, newResponse: e.target.value })
                }
                rows={3}
                className="w-full"
                autoResize
              />
              <label htmlFor="newResponse">Add Response</label>
            </div>

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