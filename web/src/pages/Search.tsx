import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';

interface SearchResult {
  tickets: {
    id: number;
    title: string;
    status: string;
    user_email: string;
    created_at: string;
    description: string;
  }[];
  files: {
    id: number;
    filename: string;
    created_at: string;
    content?: string;
    user_email?: string;
  }[];
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult>({ tickets: [], files: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = searchParams.get('q') || '';

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults({ tickets: [], files: [] });
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to search.');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch search results');
        }

        setResults({
          tickets: Array.isArray(data.tickets) ? data.tickets : [],
          files: Array.isArray(data.files) ? data.files : []
        });
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setResults({ tickets: [], files: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  // Debug logging for render
  console.log('Current results state:', results);
  console.log('Tickets length:', results.tickets?.length);
  console.log('Files length:', results.files?.length);

  const statusBodyTemplate = (rowData: any) => {
    const severityMap: Record<string, "info" | "success" | "warning" | "danger"> = {
      open: 'info',
      in_progress: 'warning',
      resolved: 'success',
      closed: 'danger'
    };

    const severity = severityMap[rowData.status] || 'info';
    return <Tag value={rowData.status.replace('_', ' ')} severity={severity} />;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const handleTicketClick = (rowData: any) => {
    navigate(`/edit-ticket/${rowData.id}`);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Search Results for "{query}"</h1>
      
      {error && (
        <div className="mb-4">
          <Message severity="error" text={error} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-6">
          <ProgressSpinner />
        </div>
      ) : (
        <TabView>
          <TabPanel header={`Tickets (${results.tickets?.length || 0})`}>
            <Card>
              <DataTable
                value={results.tickets}
                paginator
                rows={10}
                emptyMessage="No tickets found"
                sortField="created_at"
                sortOrder={-1}
                onRowClick={(e) => handleTicketClick(e.data)}
                selectionMode="single"
                className="cursor-pointer"
                showGridlines
                stripedRows
              >
                <Column field="id" header="ID" sortable style={{ width: '8%' }} />
                <Column field="title" header="Title" sortable style={{ width: '25%' }} />
                <Column field="description" header="Description" sortable style={{ width: '35%' }} />
                <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ width: '12%' }} />
                <Column field="user_email" header="Created By" sortable style={{ width: '20%' }} />
                <Column
                  field="created_at"
                  header="Created At"
                  sortable
                  style={{ width: '15%' }}
                  body={(rowData) => formatDate(rowData.created_at)}
                />
              </DataTable>
            </Card>
          </TabPanel>

          <TabPanel header={`Files (${results.files?.length || 0})`}>
            <Card>
              <DataTable
                value={results.files}
                paginator
                rows={10}
                emptyMessage="No files found"
                sortField="created_at"
                sortOrder={-1}
                showGridlines
                stripedRows
              >
                <Column field="filename" header="Filename" sortable style={{ width: '40%' }} />
                <Column field="user_email" header="Created By" sortable style={{ width: '30%' }} />
                <Column
                  field="created_at"
                  header="Created At"
                  sortable
                  style={{ width: '30%' }}
                  body={(rowData) => formatDate(rowData.created_at)}
                />
              </DataTable>
            </Card>
          </TabPanel>
        </TabView>
      )}
    </div>
  );
};

export default Search; 