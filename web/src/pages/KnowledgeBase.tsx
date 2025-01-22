import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { FileUpload } from 'primereact/fileupload';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

interface KnowledgeFile {
  id: number;
  filename: string;
  file_type: string;
  uploaded_at: string;
  uploaded_by: string;
  file_size: number;
}

const KnowledgeBase: React.FC = () => {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token');
  const toast = useRef<Toast>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      if (!token || !refreshToken) {
        setError('No authentication tokens found');
        return;
      }

      const response = await fetch('http://localhost:5001/knowledge/files', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch files');
    }
  };

  const handleFileUpload = async (event: { files: File[] }) => {
    const file = event.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      if (!token || !refreshToken) {
        throw new Error('No authentication tokens found');
      }

      const response = await fetch('http://localhost:5001/knowledge/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      await fetchFiles();
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'File uploaded successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Failed to upload file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'Failed to upload file',
        life: 3000
      });
    }
  };

  const confirmDelete = (fileId: number) => {
    confirmDialog({
      message: 'Are you sure you want to delete this file?',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => handleDelete(fileId),
      acceptIcon: "pi pi-trash",
      acceptClassName: "p-button-danger",
      rejectIcon: "pi pi-times"
    });
  };

  const handleDelete = async (fileId: number) => {
    try {
      if (!token || !refreshToken) {
        throw new Error('No authentication tokens found');
      }

      const response = await fetch(`http://localhost:5001/knowledge/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }

      await fetchFiles();
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'File deleted successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete file');
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'Failed to delete file',
        life: 3000
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const actionBodyTemplate = (rowData: KnowledgeFile) => {
    return (
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        onClick={() => confirmDelete(rowData.id)}
        tooltip="Delete File"
      />
    );
  };

  const dateBodyTemplate = (rowData: KnowledgeFile) => {
    return new Date(rowData.uploaded_at).toLocaleDateString();
  };

  const fileSizeBodyTemplate = (rowData: KnowledgeFile) => {
    return formatFileSize(rowData.file_size);
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex flex-column gap-4">
        <div className="flex align-items-center justify-content-between">
          <h1 className="text-4xl font-bold m-0">Knowledge Base</h1>
          <FileUpload
            mode="basic"
            accept="*/*"
            maxFileSize={10000000}
            customUpload
            uploadHandler={handleFileUpload}
            auto
            chooseLabel="Upload File"
            className="p-button-primary"
          />
        </div>

        {error && (
          <Message severity="error" text={error} className="w-full" />
        )}

        <DataTable
          value={files}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          tableStyle={{ minWidth: '50rem' }}
          className="p-datatable-striped"
        >
          <Column field="filename" header="Filename" sortable />
          <Column field="file_type" header="Type" sortable />
          <Column field="file_size" header="Size" body={fileSizeBodyTemplate} sortable />
          <Column field="uploaded_by" header="Uploaded By" sortable />
          <Column field="uploaded_at" header="Upload Date" body={dateBodyTemplate} sortable />
          <Column body={actionBodyTemplate} header="Actions" style={{ width: '10%' }} />
        </DataTable>
      </div>
    </div>
  );
};

export default KnowledgeBase; 