import { useState } from 'react';
import { Upload, FileText, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface FileRecord {
  id: string;
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string | null;
  context: string;
  context_id: number;
  is_private: boolean;
  created_at: string;
}

interface TestResult {
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
}

const FileAttachmentTest = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({
    upload: { status: 'idle', message: '' },
    retrieve: { status: 'idle', message: '' },
    delete: { status: 'idle', message: '' },
  });

  const updateTestResult = (test: string, status: TestResult['status'], message: string) => {
    setTestResults((prev) => ({
      ...prev,
      [test]: { status, message },
    }));
  };

  const testUpload = async () => {
    setLoading(true);
    updateTestResult('upload', 'running', 'Uploading test file...');

    try {
      // Step 1: Get upload signature
      const signResponse = await api.post('/uploads/sign', {
        context: 'NOTE',
        context_id: 999999, // Test context ID
        is_private: false,
        resource_type: 'auto',
      });

      const { timestamp, signature, folder, cloudName, apiKey } = signResponse.data;

      // Step 2: Create a test file (small text file)
      const testFile = new Blob(['This is a test file for file attachment system'], {
        type: 'text/plain',
      });
      const file = new File([testFile], 'test-file.txt', { type: 'text/plain' });

      // Step 3: Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('api_key', apiKey);
      formData.append('folder', folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload to Cloudinary failed');
      }

      const cloudinaryData = await uploadResponse.json();

      // Step 4: Save file record in backend
      const fileResponse = await api.post('/files', {
        public_id: cloudinaryData.public_id,
        secure_url: cloudinaryData.secure_url,
        resource_type: cloudinaryData.resource_type,
        format: cloudinaryData.format,
        context: 'NOTE',
        context_id: 999999,
        is_private: false,
      });

      const fileRecord = fileResponse.data.data;
      setUploadedFiles((prev) => [...prev, fileRecord]);
      updateTestResult(
        'upload',
        'success',
        `File uploaded successfully! ID: ${fileRecord.id}`
      );
    } catch (error: any) {
      console.error('Upload test error:', error);
      updateTestResult(
        'upload',
        'error',
        error.response?.data?.message || error.message || 'Upload failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const testRetrieve = async () => {
    if (uploadedFiles.length === 0) {
      updateTestResult('retrieve', 'error', 'No files to retrieve. Upload a file first.');
      return;
    }

    setLoading(true);
    updateTestResult('retrieve', 'running', 'Retrieving files...');

    try {
      // Test retrieving by context
      const response = await api.get('/files', {
        params: {
          context: 'NOTE',
          context_id: 999999,
        },
      });

      const files = response.data.data;
      updateTestResult(
        'retrieve',
        'success',
        `Retrieved ${files.length} file(s) successfully!`
      );
    } catch (error: any) {
      console.error('Retrieve test error:', error);
      updateTestResult(
        'retrieve',
        'error',
        error.response?.data?.message || error.message || 'Retrieve failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const testDelete = async (fileId: string) => {
    setLoading(true);
    updateTestResult('delete', 'running', 'Deleting file...');

    try {
      await api.delete(`/files/${fileId}`);
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
      updateTestResult('delete', 'success', `File ${fileId} deleted successfully!`);
    } catch (error: any) {
      console.error('Delete test error:', error);
      updateTestResult(
        'delete',
        'error',
        error.response?.data?.message || error.message || 'Delete failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    await testUpload();
    setTimeout(() => testRetrieve(), 1000);
  };

  const resetTests = () => {
    setTestResults({
      upload: { status: 'idle', message: '' },
      retrieve: { status: 'idle', message: '' },
      delete: { status: 'idle', message: '' },
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return 'border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              File Attachment System Test
            </h1>
            <p className="text-muted-foreground mt-1">
              Test the file upload, retrieve, and delete functionality
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Test Controls */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Upload className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Test Controls</h2>
              <p className="text-sm text-muted-foreground">
                Run individual tests or all at once
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={testUpload}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              1. Test Upload
            </Button>
            <Button
              onClick={testRetrieve}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              2. Test Retrieve
            </Button>
            <Button
              onClick={runAllTests}
              disabled={loading}
              className="w-full md:col-span-2"
              variant="secondary"
            >
              Run All Tests
            </Button>
            <Button
              onClick={resetTests}
              disabled={loading}
              className="w-full md:col-span-2"
              variant="outline"
            >
              Reset Results
            </Button>
          </div>
        </Card>

        {/* Test Results */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Test Results</h2>

          {Object.entries(testResults).map(([test, result]) => (
            <Card
              key={test}
              className={`p-4 border-2 transition-colors ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-foreground capitalize">{test} Test</h3>
                  {result.message && (
                    <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Uploaded Files ({uploadedFiles.length})
            </h2>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      ID: {file.id}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {file.secure_url}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: {file.resource_type} | Format: {file.format || 'N/A'}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => testDelete(file.id)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold text-foreground mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Click "Test Upload" to upload a test file to Cloudinary and save to database</li>
            <li>Click "Test Retrieve" to fetch files from the database</li>
            <li>Click the trash icon on uploaded files to test delete functionality</li>
            <li>Or click "Run All Tests" to run upload and retrieve automatically</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default FileAttachmentTest;
