import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { fetchWithAuth } from '../utils/api';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { AvatarGroup } from 'primereact/avatargroup';
import { Tooltip } from 'primereact/tooltip';
import './Dashboard.css';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_email: string;
  username: string;
  assignee: string[];
  responses: Array<{
    content: string;
    created_at: string;
    user_email: string;
    username: string;
  }>;
  related_uuids: string[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('tickets');
      setTickets(data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch tickets');
      // If authentication error, redirect to login
      if (error instanceof Error && error.message.includes('Authentication required')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = () => {
    navigate('/create-ticket');
  };

  const handleEditTicket = (ticketId: number) => {
    navigate(`/edit-ticket/${ticketId}`);
  };

  const handleRagSearch = (ticket: Ticket) => {
    // Define ticket fields to display and their labels
    const ticketFields: Array<{key: keyof Ticket; label: string}> = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'user_email', label: 'Created By' },
      { key: 'assignee', label: 'Assigned To' }
    ];

    // Build the formatted query string
    const formattedFields = ticketFields
      .map(field => {
        const value = ticket[field.key];
        // Only include the field if it has a value
        return value ? `**${field.label}:** ${value}\n` : null;
      })
      .filter(Boolean) // Remove null entries
      .join('\n');

    navigate('/rag-search', { state: { initialQuery: formattedFields } });
  };

  const assigneeBodyTemplate = (rowData: Ticket) => {
    if (!rowData.assignee || rowData.assignee.length === 0) {
      return <span className="text-500">Unassigned</span>;
    }

    return (
      <>
        <AvatarGroup className="justify-content-start">
          {rowData.assignee.slice(0, 3).map((email, index) => (
            <Avatar
              key={index}
              label={email.charAt(0).toUpperCase()}
              size="normal"
              shape="circle"
              className="custom-avatar"
            />
          ))}
          {rowData.assignee.length > 3 && (
            <Avatar 
              label={`+${rowData.assignee.length - 3}`}
              size="normal"
              shape="circle"
              className="custom-avatar-more"
            />
          )}
        </AvatarGroup>
        <Tooltip target=".custom-avatar, .custom-avatar-more">
          <div className="flex flex-column">
            {rowData.assignee.map((email, index) => (
              <span key={index}>{email}</span>
            ))}
          </div>
        </Tooltip>
      </>
    );
  };

  const statusBodyTemplate = (rowData: Ticket) => {
    const getSeverity = (status: string) => {
      switch (status.toLowerCase()) {
        case 'open':
          return 'info';
        case 'in_progress':
          return 'warning';
        case 'resolved':
          return 'success';
        case 'closed':
          return 'danger';
        default:
          return null;
      }
    };

    return (
      <Tag 
        value={rowData.status.replace('_', ' ')} 
        severity={getSeverity(rowData.status)}
      />
    );
  };

  const dateBodyTemplate = (rowData: Ticket) => {
    return new Date(rowData.created_at).toLocaleDateString();
  };

  const actionBodyTemplate = (rowData: Ticket) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-pencil"
          rounded
          text
          severity="info"
          onClick={() => handleEditTicket(rowData.id)}
          tooltip="Edit Ticket"
        />
        <Button
          icon="pi pi-search"
          rounded
          text
          severity="help"
          onClick={() => handleRagSearch(rowData)}
          tooltip="Search Knowledge Base"
        />
      </div>
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
          loading={loading}
        >
          <Column field="id" header="ID" sortable style={{ width: '5%' }} />
          <Column field="title" header="Title" sortable style={{ width: '25%' }} />
          <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ width: '10%' }} />
          <Column field="username" header="Created By" sortable style={{ width: '15%' }} />
          <Column field="created_at" header="Created At" body={dateBodyTemplate} sortable style={{ width: '15%' }} />
          {userRole === 'agent' && (
            <Column
              field="assignee"
              header="Assigned To"
              body={assigneeBodyTemplate}
              sortable
              style={{ width: '20%' }}
            />
          )}
          <Column body={actionBodyTemplate} header="Actions" style={{ width: '10%' }} />
        </DataTable>
      </div>
    </div>
  );
};

export default Dashboard; 