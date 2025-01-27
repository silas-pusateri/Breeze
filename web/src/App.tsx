import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';

// Import PrimeReact styles
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

// Import our color overrides
import "./styles/theme.css";

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CreateTicket from './pages/CreateTicket';
import EditTicket from './pages/EditTicket';
import KnowledgeBase from './pages/KnowledgeBase';
import Header from './components/Header';
import Search from './pages/Search';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <PrimeReactProvider>
      <Router>
        <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        <Routes>
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated} />} />
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/analytics"
            element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />}
          />
          <Route
            path="/create-ticket"
            element={isAuthenticated ? <CreateTicket /> : <Navigate to="/login" />}
          />
          <Route
            path="/edit-ticket/:ticketId"
            element={isAuthenticated ? <EditTicket /> : <Navigate to="/login" />}
          />
          <Route
            path="/knowledge-base"
            element={isAuthenticated ? <KnowledgeBase /> : <Navigate to="/login" />}
          />
          <Route
            path="/search"
            element={isAuthenticated ? <Search /> : <Navigate to="/login" />}
          />
        </Routes>
      </Router>
    </PrimeReactProvider>
  );
};

export default App; 