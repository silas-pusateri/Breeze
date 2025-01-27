import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { InputText } from 'primereact/inputtext';
import { MenubarPassThroughOptions } from 'primereact/menubar';

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
          className: 'text-white'
        },
        {
          label: 'Dashboard',
          icon: 'pi pi-home',
          command: () => navigate('/dashboard'),
          className: 'text-white'
        },
        {
          label: 'Analytics',
          icon: 'pi pi-chart-bar',
          command: () => navigate('/analytics'),
          className: 'text-white'
        },
        {
          label: 'Knowledge Base',
          icon: 'pi pi-book',
          command: () => navigate('/knowledge-base'),
          className: 'text-white'
        }
      ]
    : [];

  const start = (
    <div className="flex items-center flex-grow-1">
      <div className="text-xl font-bold mr-4" style={{ color: 'white' }}>Breeze</div>
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
      style={{ color: 'white' }}
    />
  ) : (
    <div className="flex gap-2">
      <Button
        label="Login"
        icon="pi pi-sign-in"
        text
        onClick={() => navigate('/login')}
        style={{ color: 'white' }}
      />
      <Button
        label="Register"
        icon="pi pi-user-plus"
        onClick={() => navigate('/register')}
        style={{ 
          backgroundColor: 'var(--primary-800)',
          border: '1px solid var(--primary-800)',
          color: 'white'
        }}
        pt={{
          root: { 
            className: 'hover:bg-primary-900 hover:border-primary-900'
          }
        }}
      />
    </div>
  );

  const menubarStyle = {
    background: 'var(--primary-800)',
    height: '4rem',
    display: 'flex',
    alignItems: 'center'
  };

  const menubarPT: MenubarPassThroughOptions = {
    root: {
      className: 'overflow-visible border-none px-4 flex align-items-center'
    },
    menuitem: {
      className: 'mx-1'
    }
  };

  return (
    <div className="card">
      <Menubar
        model={mainMenuItems}
        start={start}
        end={end}
        style={menubarStyle}
        pt={menubarPT}
      />
    </div>
  );
};

export default Header; 