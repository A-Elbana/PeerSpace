import { useState, useRef } from 'react';
import { Upload, X, File as FileIcon, Image, Video } from 'lucide-react';
import { Button } from './ui/button';
import api from '../services/api';

interface FileUploadProps {
  context: 'POST' | 'SUBMISSION' | 'NOTE' | 'ASSIGNMENT' | 'COMMUNITY_BANNER' | 'USER_AVATAR';
  contextId: number | string;
  onFileUploaded?: (fileId: string, fileUrl: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  preview?: boolean;
  showUploadedInfo?: boolean;
}

interface UploadedFile {
  id: string;
  url: string;
  name: string;
  type: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  context,
  contextId,
  onFileUploaded,
  onError,
  accept = '*/*',
  maxSizeMB = 10,
  label = 'Upload File',
  preview = true,
  showUploadedInfo = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <FileIcon className="w-5 h-5" />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      onError?.(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Show preview for images
    if (preview && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: globalThis.File) => {
    setUploading(true);

    try {
      // Step 1: Get upload signature
      const signResponse = await api.post('/uploads/sign', {
        context,
        context_id: String(contextId),
        is_private: false,
        resource_type: 'auto',
      });

      const { timestamp, signature, folder, cloudName, apiKey } = signResponse.data;

      // Step 2: Upload to Cloudinary
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

      // Step 3: Save file record in backend
      const fileResponse = await api.post('/files', {
        public_id: cloudinaryData.public_id,
        secure_url: cloudinaryData.secure_url,
        resource_type: cloudinaryData.resource_type,
        format: cloudinaryData.format,
        context,
        context_id: String(contextId),
        is_private: false,
      });

      const fileRecord = fileResponse.data.data;

      setUploadedFile({
        id: fileRecord.id,
        url: fileRecord.secure_url,
        name: file.name,
        type: file.type,
      });

      onFileUploaded?.(fileRecord.id, fileRecord.secure_url);

      // clear the input so the same file can be chosen again
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      console.error('File upload error:', error);
      onError?.(error.response?.data?.message || 'Failed to upload file');
      setPreviewUrl('');
    } finally {
      // ensure input is cleared even on error so user can retry the same file
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={uploading}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Uploading...' : label}
      </Button>
    </div>
  );
};

export default FileUpload;
