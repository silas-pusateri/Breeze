import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';

interface HeaderProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isAuthenticated, setIsAuthenticated }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const mainMenuItems: MenuItem[] = isAuthenticated
    ? [
        {
          label: 'Dashboard',
          icon: 'pi pi-home',
          command: () => navigate('/dashboard'),
        },
        {
          label: 'Create Ticket',
          icon: 'pi pi-plus',
          command: () => navigate('/create-ticket'),
        },
        {
          label: 'Knowledge Base',
          icon: 'pi pi-book',
          command: () => navigate('/knowledge-base'),
        }
      ]
    : [];

  const start = <div className="text-xl font-bold">Breeze</div>;
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
        className="surface-0 border-none px-4"
      />
    </div>
  );
};

export default Header; 