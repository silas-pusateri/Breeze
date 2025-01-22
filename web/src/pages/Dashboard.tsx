import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import './Dashboard.css';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_email: string;
  assigned_to?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch tickets');
    }
  };

  const handleCreateTicket = () => {
    navigate('/create-ticket');
  };

  const handleEditTicket = (ticketId: number) => {
    navigate(`/edit-ticket/${ticketId}`);
  };

  const actionBodyTemplate = (rowData: Ticket) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-eye"
          rounded
          text
          severity="info"
          onClick={() => navigate(`/view-ticket/${rowData.id}`)}
          tooltip="View Ticket"
        />
        {userRole === 'agent' && (
          <Button
            icon="pi pi-pencil"
            rounded
            text
            severity="info"
            onClick={() => handleEditTicket(rowData.id)}
            tooltip="Edit Ticket"
          />
        )}
      </div>
    );
  };

  const dateBodyTemplate = (rowData: Ticket) => {
    return new Date(rowData.created_at).toLocaleDateString();
  };

  const statusBodyTemplate = (rowData: Ticket) => {
    return (
      <span className={`status-badge status-${rowData.status.toLowerCase()}`}>
        {rowData.status}
      </span>
    );
  };

  return (
    <div className="p-4">
      <div className="flex flex-column gap-4">
        <div className="flex align-items-center justify-content-between">
          <h1 className="text-4xl font-bold m-0">Ticket Dashboard</h1>
          <Button
            label="Create New Ticket"
            icon="pi pi-plus"
            onClick={handleCreateTicket}
          />
        </div>

        {error && (
          <Message severity="error" text={error} className="w-full" />
        )}

        <DataTable
          value={tickets}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          tableStyle={{ minWidth: '50rem' }}
          className="p-datatable-striped"
        >
          <Column field="id" header="ID" sortable style={{ width: '5%' }} />
          <Column field="title" header="Title" sortable style={{ width: '25%' }} />
          <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ width: '10%' }} />
          <Column field="user_email" header="Created By" sortable style={{ width: '20%' }} />
          <Column field="created_at" header="Created At" body={dateBodyTemplate} sortable style={{ width: '15%' }} />
          {userRole === 'agent' && (
            <Column
              field="assigned_to"
              header="Assigned To"
              body={(rowData) => rowData.assigned_to || 'Unassigned'}
              sortable
              style={{ width: '15%' }}
            />
          )}
          <Column body={actionBodyTemplate} header="Actions" style={{ width: '10%' }} />
        </DataTable>
      </div>
    </div>
  );
};

export default Dashboard; 