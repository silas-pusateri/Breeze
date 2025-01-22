import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

interface LoginProps {
  setIsAuthenticated: (value: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the tokens and user info
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userEmail', data.user.email);
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="flex align-items-center justify-content-center min-h-screen">
      <div className="w-full md:w-5 lg:w-4">
        <Card title="Login" className="shadow-2">
          {error && (
            <Message severity="error" text={error} className="mb-3 w-full" />
          )}
          <form onSubmit={handleSubmit} className="flex flex-column gap-2">
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
            <div className="p-float-label mt-4">
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
            <Button
              label="Login"
              type="submit"
              className="mt-4"
            />
            <div className="text-center mt-3">
              <Link to="/register" className="no-underline text-blue-500 hover:text-blue-700">
                Don't have an account? Register
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login; 