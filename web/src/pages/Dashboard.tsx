import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
} from '@mui/material';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  username: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Get user role and username from localStorage
    const storedRole = localStorage.getItem('userRole');
    const storedUsername = localStorage.getItem('username');
    if (storedRole) {
      setUserRole(storedRole);
    }
    if (storedUsername) {
      setUsername(storedUsername);
    }

    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token being sent:', token);
        
        const response = await fetch('http://localhost:5001/tickets', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTickets(data);
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch tickets:', errorData);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
      }
    };

    fetchTickets();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const canEditTicket = (ticket: Ticket) => {
    return userRole === 'agent' || ticket.username === username;
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Ticket Dashboard</Typography>
          <Box>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/create-ticket"
              sx={{ mr: 2 }}
            >
              Create Ticket
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Chip
            label={userRole === 'agent' ? 'Viewing all tickets (Service Agent)' : 'Viewing your tickets'}
            color={userRole === 'agent' ? 'primary' : 'default'}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      </Box>

      <Paper elevation={3}>
        <List>
          {tickets.length === 0 ? (
            <ListItem>
              <ListItemText primary="No tickets found" />
            </ListItem>
          ) : (
            tickets.map((ticket, index) => (
              <React.Fragment key={ticket.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={ticket.title}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          Status: {ticket.status}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Created by: {ticket.username}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Created at: {new Date(ticket.created_at).toLocaleString()}
                        </Typography>
                        <br />
                        {ticket.description}
                      </>
                    }
                  />
                  {canEditTicket(ticket) && (
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/edit-ticket/${ticket.id}`)}
                      >
                        Edit
                      </Button>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default Dashboard; 