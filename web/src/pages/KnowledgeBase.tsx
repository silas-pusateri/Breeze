import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
} from '@mui/material';
import * as Icons from '@mui/icons-material';

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

      await fetchFiles(); // Refresh the file list
    } catch (error) {
      console.error('Failed to upload file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    }
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

      await fetchFiles(); // Refresh the file list
    } catch (error) {
      console.error('Failed to delete file:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Knowledge Base
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <input
            accept="*/*"
            style={{ display: 'none' }}
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={<Icons.CloudUpload />}
            >
              Upload File
            </Button>
          </label>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Filename</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>{file.filename}</TableCell>
                  <TableCell>{file.file_type}</TableCell>
                  <TableCell>{formatFileSize(file.file_size)}</TableCell>
                  <TableCell>{file.uploaded_by}</TableCell>
                  <TableCell>
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleDelete(file.id)}
                      color="error"
                      size="small"
                    >
                      <Icons.Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default KnowledgeBase; 