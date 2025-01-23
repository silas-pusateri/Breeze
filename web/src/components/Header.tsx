import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { InputText } from 'primereact/inputtext';

interface HeaderProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isAuthenticated, setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const mainMenuItems: MenuItem[] = isAuthenticated
    ? [
        {
          label: 'Create Ticket',
          icon: 'pi pi-plus',
          command: () => navigate('/create-ticket'),
        },
        {
          label: 'Dashboard',
          icon: 'pi pi-home',
          command: () => navigate('/dashboard'),
        },
        {
          label: 'Analytics',
          icon: 'pi pi-chart-bar',
          command: () => navigate('/analytics'),
        },
        {
          label: 'Knowledge Base',
          icon: 'pi pi-book',
          command: () => navigate('/knowledge-base'),
        }
      ]
    : [];

  const start = (
    <div className="flex items-center flex-grow-1">
      <div className="text-xl font-bold mr-4">Breeze</div>
      {isAuthenticated && (
        <div className="flex justify-content-center w-full">
          <span className="p-input-icon-left" style={{ width: '30rem' }}>
            <i className="pi pi-search" />
            <InputText
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search tickets and files..."
              className="w-full"
            />
          </span>
        </div>
      )}
    </div>
  );

  const end = isAuthenticated ? (
    <Button
      label="Logout"
      icon="pi pi-power-off"
      severity="secondary"
      text
      onClick={handleLogout}
    />
  ) : (
    <div className="flex gap-2">
      <Button
        label="Login"
        icon="pi pi-sign-in"
        severity="info"
        text
        onClick={() => navigate('/login')}
      />
      <Button
        label="Register"
        icon="pi pi-user-plus"
        severity="info"
        onClick={() => navigate('/register')}
      />
    </div>
  );

  return (
    <div className="card">
      <Menubar
        model={mainMenuItems}
        start={start}
        end={end}
        className="surface-0 border-none px-4 flex align-items-center"
      />
    </div>
  );
};

export default Header; 