import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Dialog } from 'primereact/dialog';
import ReactMarkdown from 'react-markdown';
import { fetchWithAuth } from '../utils/api';

const RagSearch: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialQuery = location.state?.initialQuery || '';
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<{ title: string; content: string } | null>(null);

    const defaultResponseQuery = "Respond to this ticket citing the relevant policies from the knowledge base, answering politely and to the best of your ability. If the information is not conclusively found within the knowledge base, just say \"I'm sorry, I can't seem to reference the policy in question\", and include the necessary contact information for the department relevant to the ticket. Make sure to include a link to the referenced file if citing specific information from the knowledge base.";

    const handleCreateResponse = () => {
        setQuery(defaultResponseQuery);
    };

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

            // Combine ticket information with agent's query if ticket info exists
            const combinedQuery = initialQuery 
                ? `Ticket Information:\n${initialQuery}\n\nAdditional Context:\n${query}`
                : query;

            const data = await fetchWithAuth('rag/query', {
                method: 'POST',
                body: JSON.stringify({ query: combinedQuery })
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

    const handleViewFile = async (filename: string) => {
        try {
            // First, search for the file ID using the filename
            const searchResponse = await fetchWithAuth('knowledge/files');
            const files = searchResponse.files || [];
            const file = files.find((f: { filename: string }) => f.filename === filename);
            
            if (!file) {
                throw new Error('File not found');
            }

            // Fetch the file content
            const contentResponse = await fetchWithAuth(`knowledge/files/${file.id}/content`);
            setSelectedFile({
                title: filename,
                content: contentResponse.content
            });
        } catch (error) {
            console.error('Error fetching file:', error);
            setError('Failed to fetch file content. Please try again.');
        }
    };

    const renderResponseWithFileLinks = (text: string) => {
        // Regular expression to match filenames in quotes or with .md/.txt extensions
        const filePattern = /"([^"]+\.(md|txt))"|\b[\w-]+\.(md|txt)\b/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = filePattern.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            // Get the filename (either from quotes or direct match)
            const filename = match[1] || match[0];

            // Add the button
            parts.push(
                <Button
                    key={match.index}
                    label={filename}
                    link
                    className="p-0 text-primary underline vertical-align-baseline"
                    onClick={() => handleViewFile(filename)}
                />
            );

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return <div className="white-space-pre-line">{parts}</div>;
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

                {initialQuery && (
                    <div className="flex flex-column gap-2">
                        <div className="flex align-items-center justify-content-between">
                            <label className="font-bold">Ticket Information</label>
                            <Button
                                label="Create Response"
                                icon="pi pi-reply"
                                severity="secondary"
                                onClick={handleCreateResponse}
                                className="p-button-sm"
                            />
                        </div>
                        <div className="w-full font-medium text-900 bg-gray-100 p-3 border-round" style={{ minHeight: '200px' }}>
                            <ReactMarkdown>{initialQuery}</ReactMarkdown>
                        </div>
                    </div>
                )}

                <div className="flex flex-column gap-2">
                    <label className="font-bold">Query</label>
                    <InputTextarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={3}
                        placeholder="Enter additional context or questions about this ticket..."
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
                            {renderResponseWithFileLinks(response)}
                        </div>
                    </Card>
                )}

                <Dialog
                    header={selectedFile?.title}
                    visible={!!selectedFile}
                    style={{ width: '70vw' }}
                    onHide={() => setSelectedFile(null)}
                    maximizable
                >
                    {selectedFile && (
                        <div className="markdown-content">
                            <ReactMarkdown>{selectedFile.content}</ReactMarkdown>
                        </div>
                    )}
                </Dialog>
            </div>
        </div>
    );
};

export default RagSearch; 