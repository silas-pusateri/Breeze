import React, { type ReactNode } from 'react';
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

const SortableWidget = ({ widget }: { widget: DashboardWidget }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`widget-wrapper widget-${widget.size}`}
    >
      <Card title={widget.title}>
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
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

  return (
    <div className="p-4">
      <div className="flex flex-column gap-4">
        <div className="flex align-items-center justify-content-between">
          <h1 className="text-4xl font-bold m-0">Analytics Dashboard</h1>
          <Button 
            label="Create Widget" 
            icon="pi pi-plus" 
            onClick={() => setShowCreateDialog(true)}
            className="mb-3"
          />
        </div>

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
                <SortableWidget key={widget.id} widget={widget} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 