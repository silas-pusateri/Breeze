import React, { type ReactNode, useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Chart } from 'primereact/chart';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  type DndContextProps
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './Analytics.css';

interface TicketParams {
  field: string;
  aggregation?: 'count' | 'sum' | 'average';
  timeRange?: 'day' | 'week' | 'month';
}

interface TicketData {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_email: string;
  assigned_to: string | null;
}

interface DashboardWidget {
  id: string;
  type: 'chart' | 'stats' | 'table';
  title: string;
  data: any;
  size: 'small' | 'medium' | 'large';
  ticketParams: TicketParams;
}

interface NewWidgetState {
  title?: string;
  type: 'chart' | 'stats' | 'table';
  size: 'small' | 'medium' | 'large';
  ticketParams: TicketParams;
}

const SortableWidget = ({ widget, onDelete }: { widget: DashboardWidget; onDelete: (id: string) => void }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: widget.id,
    disabled: false
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(widget.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`widget-wrapper widget-${widget.size}`}
    >
      <Dialog
        visible={showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(false)}
        header="Confirm Delete"
        modal
        footer={
          <div>
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => setShowDeleteConfirm(false)}
              className="p-button-text"
            />
            <Button
              label="Delete"
              icon="pi pi-trash"
              onClick={handleConfirmDelete}
              severity="danger"
              autoFocus
            />
          </div>
        }
      >
        <p>Are you sure you want to delete the widget "{widget.title}"?</p>
      </Dialog>

      <Card 
        title={widget.title}
        header={
          <div className="flex align-items-center justify-content-between w-full">
            <div className="flex align-items-center gap-2">
              <Button
                {...attributes}
                {...listeners}
                icon="pi pi-bars"
                text
                rounded
                className="cursor-move p-button-secondary"
                tooltip="Drag to reorder"
              />
              <h3 className="m-0">{widget.title}</h3>
            </div>
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              onClick={handleDeleteClick}
              tooltip="Delete Widget"
            />
          </div>
        }
      >
        {widget.type === 'chart' && (
          <Chart 
            type="bar" 
            data={widget.data} 
            options={{
              plugins: {
                title: {
                  display: true,
                  text: `${widget.ticketParams.field} by ${widget.ticketParams.aggregation}`
                }
              }
            }}
          />
        )}
        {widget.type === 'stats' && (
          <div className="stats-container">
            <h3>{widget.ticketParams.field}</h3>
            <p>Loading stats...</p>
          </div>
        )}
        {widget.type === 'table' && (
          <DataTable value={widget.data}>
            {widget.data && widget.data[0] && 
              Object.keys(widget.data[0]).map(key => (
                <Column key={key} field={key} header={key} />
              ))
            }
          </DataTable>
        )}
      </Card>
    </div>
  );
};

const Analytics: React.FC = () => {
  const [widgets, setWidgets] = React.useState<DashboardWidget[]>([]);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newWidget, setNewWidget] = React.useState<NewWidgetState>({
    type: 'chart',
    size: 'medium',
    ticketParams: {
      field: 'status',
      aggregation: 'count',
      timeRange: 'week'
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const checkAuthentication = () => {
    // Check for token with both possible keys
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const isAuth = !!token && !!refreshToken;
    console.log('Authentication check:', { 
      isAuth, 
      token: !!token, 
      refreshToken: !!refreshToken,
      storedRole: localStorage.getItem('role')
    });
    setIsAuthenticated(isAuth);
    
    // If we have a token but it's stored under the old key, migrate it
    if (localStorage.getItem('token') && !localStorage.getItem('access_token')) {
      localStorage.setItem('access_token', localStorage.getItem('token')!);
    }
    
    return isAuth;
  };

  const fetchUserRole = async () => {
    try {
      if (!checkAuthentication()) {
        console.log('Not authenticated, skipping role fetch');
        return;
      }

      // Check the stored user role first
      const role = localStorage.getItem('role');
      console.log('Stored user role:', role);
      if (role === 'agent') {
        console.log('Setting agent status from stored role');
        setIsAgent(true);
        return;
      }

      // Fallback to checking ticket access
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const userEmail = localStorage.getItem('email');

      if (!userEmail) {
        console.log('No user email found, cannot determine agent status');
        return;
      }

      console.log('Checking agent status via tickets. User email:', userEmail);

      const response = await fetch('http://localhost:5001/tickets', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'X-Refresh-Token': refreshToken || ''
        }
      });
      
      if (!response.ok) {
        console.log('Failed to fetch tickets for role check:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('Received tickets for role check:', data.length);
      const isAgent = Array.isArray(data) && data.some(ticket => ticket.user_email !== userEmail);
      console.log('Determined agent status:', isAgent);
      setIsAgent(isAgent);
      
      if (isAgent) {
        console.log('Storing agent role');
        localStorage.setItem('role', 'agent');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const loadSavedWidgets = async () => {
    try {
      if (!checkAuthentication()) {
        console.log('Not authenticated, skipping widget load');
        return;
      }

      console.log('Attempting to load saved widgets...');
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      const response = await fetch('http://localhost:5001/analytics/widgets', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'X-Refresh-Token': refreshToken || ''
        }
      });
      if (!response.ok) throw new Error('Failed to load widgets');
      const data = await response.json();
      console.log('Loaded widgets from server:', data);
      if (data && data.length > 0) {
        const loadedWidgets = data.map((item: any) => item.widget_data);
        console.log('Processed widgets to load:', loadedWidgets);
        setWidgets(loadedWidgets);
      } else {
        console.log('No widgets found in database');
      }
    } catch (error) {
      console.error('Error loading widgets:', error);
    }
  };

  const saveWidgets = async () => {
    if (!isAgent) {
      console.log('Not saving widgets - user is not an agent');
      return;
    }

    if (!checkAuthentication()) {
      console.log('Not authenticated, skipping widget save');
      return;
    }
    
    try {
      console.log('Attempting to save widgets:', widgets);
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      const widgetsToSave = widgets.map(widget => ({
        ...widget,
        data: null
      }));
      console.log('Processed widgets to save:', widgetsToSave);

      const response = await fetch('http://localhost:5001/analytics/widgets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'X-Refresh-Token': refreshToken || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(widgetsToSave)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save widgets: ${JSON.stringify(errorData)}`);
      }
      
      const savedData = await response.json();
      console.log('Successfully saved widgets:', savedData);
    } catch (error) {
      console.error('Error saving widgets:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      if (!checkAuthentication()) {
        console.log('Not authenticated, skipping ticket fetch');
        return;
      }

      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      const response = await fetch('http://localhost:5001/tickets', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'X-Refresh-Token': refreshToken || ''
        }
      });
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    const isAuth = checkAuthentication();
    console.log('Initial authentication check:', isAuth);
    if (isAuth) {
      const init = async () => {
        console.log('Starting initialization...');
        await fetchUserRole();
        await fetchTickets();
        console.log('Initialization complete. Agent status:', isAgent);
      };
      init();
    } else {
      setLoading(false);
    }
  }, []);

  // Load saved widgets when user is confirmed as agent
  useEffect(() => {
    console.log('Auth/Agent status changed:', { isAuthenticated, isAgent });
    if (isAuthenticated && isAgent) {
      loadSavedWidgets();
    }
  }, [isAgent, isAuthenticated]);

  // Save widgets when they change (debounced)
  useEffect(() => {
    if (isAuthenticated && isAgent && widgets.length > 0) {
      const timeoutId = setTimeout(() => {
        saveWidgets();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [widgets, isAgent, isAuthenticated]);

  // Update widget data whenever tickets change
  useEffect(() => {
    if (!loading && tickets.length > 0) {
      setWidgets(currentWidgets =>
        currentWidgets.map(widget => ({
          ...widget,
          data: processTicketData(widget)
        }))
      );
    }
  }, [tickets, loading]);

  const processTicketData = (widget: DashboardWidget) => {
    const { field, aggregation, timeRange } = widget.ticketParams;
    
    // Filter tickets by time range
    const now = new Date();
    const filteredTickets = tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      const diffDays = (now.getTime() - ticketDate.getTime()) / (1000 * 60 * 60 * 24);
      
      switch (timeRange) {
        case 'day':
          return diffDays <= 1;
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        default:
          return true;
      }
    });

    // Group tickets by field
    const groupedData = filteredTickets.reduce((acc, ticket) => {
      const value = ticket[field as keyof TicketData] || 'unknown';
      if (!acc[value]) acc[value] = [];
      acc[value].push(ticket);
      return acc;
    }, {} as Record<string, TicketData[]>);

    // Calculate aggregation
    const processedData = Object.entries(groupedData).map(([key, tickets]) => {
      let value: number;
      switch (aggregation) {
        case 'count':
          value = tickets.length;
          break;
        case 'sum':
          value = tickets.length; // For now, just count as sum doesn't make sense for most fields
          break;
        case 'average':
          value = tickets.length; // For now, just count as average doesn't make sense for most fields
          break;
        default:
          value = tickets.length;
      }
      return { key, value };
    });

    // Format data based on widget type
    switch (widget.type) {
      case 'chart':
        return {
          labels: processedData.map(d => d.key),
          datasets: [{
            label: `${field} by ${aggregation}`,
            data: processedData.map(d => d.value),
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ]
          }]
        };
      case 'stats':
        return processedData.reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {} as Record<string, number>);
      case 'table':
        return filteredTickets;
      default:
        return [];
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCreateWidget = () => {
    if (!newWidget.title) return;

    const widget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      title: newWidget.title,
      type: newWidget.type,
      size: newWidget.size,
      data: [],
      ticketParams: newWidget.ticketParams
    };

    setWidgets([...widgets, widget]);
    setShowCreateDialog(false);
    setNewWidget({
      type: 'chart',
      size: 'medium',
      ticketParams: {
        field: 'status',
        aggregation: 'count',
        timeRange: 'week'
      }
    });
  };

  const handleDeleteWidget = async (widgetId: string) => {
    console.log('Deleting widget:', widgetId);
    try {
      // Remove from state first for immediate UI feedback
      setWidgets(currentWidgets => currentWidgets.filter(w => w.id !== widgetId));
      
      // The widget will be automatically removed from the database
      // through our existing save effect that triggers on widget state changes
    } catch (error) {
      console.error('Error deleting widget:', error);
      // If there's an error, we could potentially show a toast notification here
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-column gap-4">
        <div className="flex align-items-center justify-content-between mb-4">
          <h1 className="text-4xl font-bold m-0">Analytics Dashboard</h1>
          {isAgent ? (
          <Button 
            label="Create Widget" 
            icon="pi pi-plus" 
              severity="success"
              size="large"
            onClick={() => setShowCreateDialog(true)}
          />
          ) : (
            <div className="text-500">Agent access required to create widgets</div>
          )}
        </div>

        {loading ? (
          <div className="text-center p-4">
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
            <p>Loading ticket data...</p>
          </div>
        ) : (
          <>
        <Dialog 
          header="Create Dashboard Widget" 
          visible={showCreateDialog} 
          onHide={() => setShowCreateDialog(false)}
          style={{ width: '450px' }}
        >
          <div className="p-fluid">
            <div className="field">
              <label htmlFor="title">Widget Title</label>
              <InputText
                id="title"
                value={newWidget.title || ''}
                onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="type">Widget Type</label>
              <Dropdown
                id="type"
                value={newWidget.type}
                options={[
                  { label: 'Chart', value: 'chart' },
                  { label: 'Statistics', value: 'stats' },
                  { label: 'Table', value: 'table' }
                ]}
                onChange={(e) => setNewWidget({ ...newWidget, type: e.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="size">Widget Size</label>
              <Dropdown
                id="size"
                value={newWidget.size}
                options={[
                  { label: 'Small', value: 'small' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Large', value: 'large' }
                ]}
                onChange={(e) => setNewWidget({ ...newWidget, size: e.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="field">Ticket Field</label>
              <Dropdown
                id="field"
                value={newWidget.ticketParams?.field}
                options={[
                  { label: 'Status', value: 'status' },
                  { label: 'Priority', value: 'priority' },
                  { label: 'Category', value: 'category' },
                  { label: 'Created Date', value: 'created_date' }
                ]}
                onChange={(e) => setNewWidget({ 
                  ...newWidget, 
                  ticketParams: { ...newWidget.ticketParams, field: e.value }
                })}
              />
            </div>
            <div className="field">
              <label htmlFor="aggregation">Aggregation</label>
              <Dropdown
                id="aggregation"
                value={newWidget.ticketParams?.aggregation}
                options={[
                  { label: 'Count', value: 'count' },
                  { label: 'Sum', value: 'sum' },
                  { label: 'Average', value: 'average' }
                ]}
                onChange={(e) => setNewWidget({ 
                  ...newWidget, 
                  ticketParams: { ...newWidget.ticketParams, aggregation: e.value }
                })}
              />
            </div>
            <div className="field">
              <label htmlFor="timeRange">Time Range</label>
              <Dropdown
                id="timeRange"
                value={newWidget.ticketParams?.timeRange}
                options={[
                  { label: 'Last Day', value: 'day' },
                  { label: 'Last Week', value: 'week' },
                  { label: 'Last Month', value: 'month' }
                ]}
                onChange={(e) => setNewWidget({ 
                  ...newWidget, 
                  ticketParams: { ...newWidget.ticketParams, timeRange: e.value }
                })}
              />
            </div>
            <Button label="Create" onClick={handleCreateWidget} />
          </div>
        </Dialog>

        <div className="dashboard-grid">
              {/* @ts-ignore */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              {widgets.map((widget) => (
                    <SortableWidget 
                      key={widget.id} 
                      widget={widget}
                      onDelete={handleDeleteWidget}
                    />
              ))}
            </SortableContext>
          </DndContext>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics; 