import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';

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
          'Authorization': token,
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

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ticket Dashboard
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateTicket}
          sx={{ mb: 3 }}
        >
          Create New Ticket
        </Button>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Created At</TableCell>
                {userRole === 'agent' && <TableCell>Assigned To</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.id}</TableCell>
                  <TableCell>{ticket.title}</TableCell>
                  <TableCell>{ticket.status}</TableCell>
                  <TableCell>{ticket.user_email}</TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </TableCell>
                  {userRole === 'agent' && (
                    <TableCell>{ticket.assigned_to || 'Unassigned'}</TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEditTicket(ticket.id)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Dashboard; 