import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { FileUpload } from 'primereact/fileupload';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import ReactMarkdown from 'react-markdown';

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
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token');
  const toast = useRef<Toast>(null);
  const fileUploadRef = useRef<FileUpload>(null);

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
      if (fileUploadRef.current) {
        fileUploadRef.current.clear();
      }
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

  const handleViewFile = async (file: KnowledgeFile) => {
    if (!file.file_type.toLowerCase().includes('markdown') && !file.filename.toLowerCase().endsWith('.md')) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Only markdown files can be viewed',
        life: 3000
      });
      return;
    }

    try {
      if (!token || !refreshToken) {
        throw new Error('No authentication tokens found');
      }

      const response = await fetch(`http://localhost:5001/knowledge/files/${file.id}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch file content');
      }

      const data = await response.json();
      console.log('Received content:', data.content.substring(0, 100)); // Debug log
      
      // Handle both text and base64-encoded content
      let content = data.content;
      if (data.encoding === 'base64') {
        try {
          // For base64 encoded content, decode it
          const decoded = atob(data.content);
          content = decoded;
        } catch (error) {
          console.error('Failed to decode base64 content:', error);
          throw new Error('Failed to decode file content');
        }
      }
      
      // If content looks like it might be hex-encoded, try to decode it
      if (/^[0-9a-fA-F]+$/.test(content)) {
        try {
          const bytes = new Uint8Array(content.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
          content = new TextDecoder('utf-8').decode(bytes);
        } catch (error) {
          console.error('Failed to decode hex content:', error);
          // Keep original content if hex decoding fails
        }
      }
      
      setMarkdownContent(content);
      setSelectedFile(file);
      setViewDialogVisible(true);
    } catch (error) {
      console.error('Failed to fetch file content:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'Failed to fetch file content',
        life: 3000
      });
    }
  };

  const actionBodyTemplate = (rowData: KnowledgeFile) => {
    return (
      <div className="flex gap-2">
        {(rowData.file_type.toLowerCase().includes('markdown') || rowData.filename.toLowerCase().endsWith('.md')) && (
          <Button
            icon="pi pi-eye"
            rounded
            text
            severity="info"
            onClick={() => handleViewFile(rowData)}
            tooltip="View File"
          />
        )}
        <Button
          icon="pi pi-trash"
          rounded
          text
          severity="danger"
          onClick={() => confirmDelete(rowData.id)}
          tooltip="Delete File"
        />
      </div>
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
      
      <Dialog 
        header={selectedFile?.filename}
        visible={viewDialogVisible} 
        style={{ width: '70vw' }} 
        onHide={() => setViewDialogVisible(false)}
        maximizable
      >
        <div className="markdown-content p-4" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        </div>
      </Dialog>

      <div className="flex flex-column gap-4">
        <div className="flex align-items-center justify-content-between">
          <h1 className="text-4xl font-bold m-0">Knowledge Base</h1>
          <FileUpload
            ref={fileUploadRef}
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