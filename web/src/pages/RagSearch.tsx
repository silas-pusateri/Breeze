import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { fetchWithAuth } from '../utils/api';

const RagSearch: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (!token || !refreshToken) {
                setError('Please log in to use the search feature');
                navigate('/login');
                return;
            }

            const data = await fetchWithAuth('rag/query', {
                method: 'POST',
                body: JSON.stringify({ query })
            });
            
            if (data.success) {
                setResponse(data.response);
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error fetching RAG response:', error);
            if (error instanceof Error && error.message.includes('Authentication required')) {
                setError('Please log in to use the search feature');
                navigate('/login');
            } else {
                setError('Failed to get response. Please try again.');
            }
            setResponse('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card m-4">
            <div className="flex flex-column gap-4">
                <div>
                    <h1 className="text-4xl mb-2">Knowledge Base RAG Search</h1>
                    <p className="text-lg text-600">
                        Ask questions about your knowledge base using natural language.
                    </p>
                </div>

                <div className="flex flex-column gap-2">
                    <InputTextarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={3}
                        placeholder="Enter your query"
                        className="w-full"
                        autoResize
                    />
                    <div>
                        <Button
                            label={loading ? 'Searching...' : 'Search'}
                            icon="pi pi-search"
                            loading={loading}
                            disabled={loading || !query.trim()}
                            onClick={handleSubmit}
                        />
                    </div>
                </div>

                {error && (
                    <Message 
                        severity="error" 
                        text={error}
                        className="w-full"
                    />
                )}

                {response && (
                    <Card className="surface-ground">
                        <div className="flex flex-column gap-2">
                            <h2 className="text-xl m-0">Response:</h2>
                            <div className="white-space-pre-line">
                                {response}
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default RagSearch; 