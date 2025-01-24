import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Dropdown } from 'primereact/dropdown';

interface RegisterProps {
  setIsAuthenticated: (value: boolean) => void;
}

interface RoleOption {
  label: string;
  value: string;
}

const roleOptions: RoleOption[] = [
  { label: 'Customer', value: 'customer' },
  { label: 'Service Agent', value: 'agent' }
];

const Register: React.FC<RegisterProps> = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'customer',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.access_token) {
          localStorage.setItem('token', `Bearer ${data.access_token}`);
          localStorage.setItem('refresh_token', data.refresh_token);
          localStorage.setItem('userRole', data.user.role);
          localStorage.setItem('userEmail', data.user.email);
          setIsAuthenticated(true);
          navigate('/dashboard');
        } else {
          setError(data.message);
        }
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="flex align-items-center justify-content-center min-h-screen">
      <div className="w-full md:w-5 lg:w-4">
        <Card title="Register" className="shadow-2">
          {error && (
            <Message severity="error" text={error} className="mb-3 w-full" />
          )}
          <form onSubmit={handleSubmit} className="flex flex-column gap-3">
            <div className="p-float-label">
              <InputText
                id="email"
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full"
                required
              />
              <label htmlFor="email">Email</label>
            </div>

            <div className="p-float-label">
              <InputText
                id="password"
                type="password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full"
                required
              />
              <label htmlFor="password">Password</label>
            </div>

            <div className="p-float-label">
              <Dropdown
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.value })}
                options={roleOptions}
                optionLabel="label"
                className="w-full"
              />
              <label htmlFor="role">Role</label>
            </div>

            <Button
              label="Register"
              type="submit"
              icon="pi pi-user-plus"
              className="mt-2"
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

            <div className="text-center">
              <Link to="/login" className="no-underline" style={{ color: 'var(--primary-800)' }}>
                Already have an account? Login
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register; 