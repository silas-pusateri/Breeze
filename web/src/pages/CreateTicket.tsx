import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { fetchWithAuth } from '../utils/api';

interface FormData {
  title: string;
  description: string;
  assignee: string[];  // This will store UIDs instead of emails
}

interface Agent {
  id: string;  // Supabase UID
  email: string;
  name: string;
}

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    assignee: []
  });
  const [error, setError] = useState<string | null>(null);
  const userRole = localStorage.getItem('userRole');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      if (userRole === 'agent') {
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
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setError('No refresh token found');
        return;
      }

      // Only include assignee if user is an agent
      const submitData = {
        ...formData,
        assignee: userRole === 'agent' ? formData.assignee : []
      };

      const response = await fetch('http://localhost:5001/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError(error instanceof Error ? error.message : 'Failed to create ticket');
    }
  };

  return (
    <div className="flex align-items-center justify-content-center min-h-screen">
      <div className="w-full md:w-8 lg:w-6">
        <Card title="Create Ticket" className="shadow-2">
          {error && (
            <Message severity="error" text={error} className="mb-3 w-full" />
          )}
          <form onSubmit={handleSubmit} className="flex flex-column gap-3">
            <div className="p-float-label">
              <InputText
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full"
                required
              />
              <label htmlFor="title">Title</label>
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
            )}

            <div className="flex gap-2 mt-3">
              <Button
                label="Create Ticket"
                icon="pi pi-plus"
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

export default CreateTicket; 