import { API_URL } from '../config';

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_URL}/${cleanEndpoint}`;
};

export const fetchWithAuth = async (endpoint: string, options: RequestOptions = {}) => {
  const { requireAuth = true, ...fetchOptions } = options;
  
  if (requireAuth) {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!token || !refreshToken) {
      throw new Error('Authentication required but no tokens found');
    }
    
    fetchOptions.headers = {
      ...fetchOptions.headers,
      'Authorization': `Bearer ${token}`,
      'X-Refresh-Token': refreshToken,
      'Content-Type': 'application/json',
    };
  }
  
  const response = await fetch(getApiUrl(endpoint), fetchOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}; 