import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setError('No refresh token found');
        return;
      }

      const response = await fetch('http://localhost:5001/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
        },
        body: JSON.stringify(formData),
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