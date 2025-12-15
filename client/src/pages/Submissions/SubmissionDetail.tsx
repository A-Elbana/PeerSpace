import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Home,
  User,
  CloudUpload,
  File,
  X,
  Trash2,
  Edit3,
  Download,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Sidebar } from '../../components/dashboard';
import { MarkdownView } from '../../components/MarkdownView';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { removeTokens } from '../../utils/auth';
import api, { submissionApi, assignmentApi } from '../../services/api';

interface SubmissionDetail {
  id: number;
  aid: number;
  sid: number;
  subm_date: string;
  grade: number | null;
  feedback: string | null;
  comment: string | null;
  Assignment: {
    id: number;
    title: string;
    description?: string;
    due_date: string | null;
    max_points: number | null;
    canBeLate?: boolean;
    Community: {
      id: string;
      name: string;
    };
    Instructor: {
      uid: number;
      User: {
        id: number;
        fname: string;
        lname: string;
      };
    };
    files?: Array<{
      id: string;
      public_id: string;
      secure_url: string;
      resource_type: string;
      format: string;
      is_private: boolean;
      original_filename?: string;
      created_at: string;
    }>;
  };
  SubmissionFileAttachment?: Array<{
    File: {
      id: string;
      public_id: string;
      secure_url: string;
      resource_type: string;
      format: string;
      is_private: boolean;
      original_filename?: string;
      created_at?: string;
    };
  }>;
}

const SubmissionDetail: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if assignment due date has passed
  const isDueDatePassed = submission?.Assignment.due_date
    ? new Date(submission.Assignment.due_date) < new Date()
    : false;

  useEffect(() => {
    const fetchSubmissionDetail = async () => {
      if (!submissionId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get submission details
        const mySubmissions = await submissionApi.getMySubmissions({ limit: 100 });
        const currentSubmission = mySubmissions.data.find(sub => sub.id === Number(submissionId));

        if (!currentSubmission) {
          setError('Submission not found');
          return;
        }

        // Get assignment details
        const assignmentDetails = await assignmentApi.getById(currentSubmission.aid);

        setSubmission({
          ...currentSubmission,
          Assignment: assignmentDetails,
        });

        // If entering edit mode, populate files
        if (isEditMode && (currentSubmission as any).SubmissionFileAttachment) {
          // Note: We can't convert File objects back from URLs, so we'll show existing files
          // and allow adding new ones
        }

      } catch (error) {
        console.error('Failed to fetch submission:', error);
        setError('Failed to load submission details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissionDetail();
  }, [submissionId]);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  // File handling functions for editing
  const validateFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, Word documents, text files, and images are allowed.');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be less than 10MB.');
      return false;
    }

    return true;
  };

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validateFile);

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateSubmission = async () => {
    if (!submission || uploadedFiles.length === 0) {
      toast.error('Please add at least one file.');
      return;
    }

    setIsUploading(true);

    try {
      // We'll upload files using the existing submission id as the `context_id` string
      const fileIds: string[] = [];

      for (const [idx, file] of uploadedFiles.entries()) {
        // Get signature for SUBMISSION context with real context_id
        const signRes = await api.post('/uploads/sign', {
          context: 'SUBMISSION',
          context_id: String(submission.id),
          is_private: false,
          resource_type: 'auto',
        });
        const { timestamp, signature, folder, cloudName, apiKey } = signRes.data;

        // Prepare upload form
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('timestamp', timestamp.toString());
        uploadFormData.append('signature', signature);
        uploadFormData.append('api_key', apiKey);
        uploadFormData.append('folder', folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

        // Upload via XMLHttpRequest to track progress
        const cloudinaryData: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(prev => ({ ...prev, [idx]: pct }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                setUploadProgress(prev => ({ ...prev, [idx]: 100 }));
                resolve(json);
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during file upload'));
          xhr.send(uploadFormData);
        });

        // Create file record in backend with context_id set to the submission id (string)
        try {
          const createRes = await api.post('/files', {
            public_id: cloudinaryData.public_id,
            secure_url: cloudinaryData.secure_url,
            resource_type: cloudinaryData.resource_type,
            format: cloudinaryData.format,
            context: 'SUBMISSION',
            context_id: String(submission.id),
            is_private: false,
            original_filename: file.name,
          });

          const createdFileId = createRes.data?.data?.id;
          if (createdFileId) fileIds.push(createdFileId);
        } catch (fileCreateError) {
          console.error('Failed to create file record for submission:', fileCreateError);
          // continue uploading other files; we won't abort entire update for a single file failure
        }
      }

      // Attach created file IDs to the submission via update endpoint
      if (fileIds.length > 0) {
        try {
          await api.put(`/submissions/${submission.id}`, { fileIds });
        } catch (attachErr) {
          console.error('Failed to attach files to submission:', attachErr);
          // Rollback: delete any created file records to avoid orphaned files
          for (const fid of fileIds) {
            try {
              await api.delete(`/files/${fid}`);
            } catch (delErr) {
              console.warn('Failed to delete orphan file during rollback:', fid, delErr);
            }
          }
          throw attachErr;
        }
      }

      toast.success('Submission updated successfully!');
      setIsEditMode(false);
      setUploadedFiles([]);

      // Refresh the page to show updated data
      window.location.reload();

    } catch (error: any) {
      console.error('Failed to update submission:', error);

      // Check if it's a Cloudinary issue
      if (error.message?.includes('Customer is marked as untrusted') ||
        error.message?.includes('untrusted') ||
        error.message?.includes('cloudinary')) {
        toast.error('File upload failed due to Cloudinary restrictions. Cannot update submission at this time.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to update submission');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!submission) return;

    setIsDeleting(true);
    try {
      await submissionApi.delete(submission.id);
      toast.success('Submission deleted successfully');
      navigate('/submissions');
    } catch (error: any) {
      console.error('Failed to delete submission:', error);
      toast.error(error.response?.data?.message || 'Failed to delete submission');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-foreground mb-2">Error</p>
        <p className="text-muted-foreground mb-6">{error || 'Submission not found'}</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 ml-20 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation */}
          <div className="mb-6 flex items-center text-sm text-muted-foreground">
            <Link to="/dashboard" className="flex items-center hover:text-foreground transition-colors">
              <Home className="w-4 h-4 mr-1" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link to="/submissions" className="hover:text-foreground transition-colors">
              My Submissions
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {submission.Assignment.title}
            </span>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-card to-card/80 border border-border rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-tech-blue-500/10 flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-tech-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{submission.Assignment.title}</h1>
                    <p className="text-sm text-muted-foreground">Submission Details</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
                    <User className="w-4 h-4" />
                    <span className="font-medium">
                      {submission.Assignment.Instructor.User.fname} {submission.Assignment.Instructor.User.lname}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Submitted {new Date(submission.subm_date).toLocaleDateString()}
                    </span>
                  </div>
                  {submission.grade !== null && (
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Grade: {submission.grade}</span>
                    </div>
                  )}
                  {submission.comment && (
                    <div className="flex items-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">Has comments</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  disabled={isDueDatePassed}
                  title={isDueDatePassed ? "Cannot edit submission after due date has passed" : "Edit submission"}
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md ${isDueDatePassed ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                    }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDueDatePassed}
                  title={isDueDatePassed ? "Cannot delete submission after due date has passed" : "Delete submission"}
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md border border-border ${isDueDatePassed ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                    }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              {/* Left Col: Assignment Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Assignment Description */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 text-foreground">Assignment Details</h2>
                  {submission.Assignment.description ? (
                    <MarkdownView content={submission.Assignment.description} />
                  ) : (
                    <span className="italic opacity-50">No instructions provided.</span>
                  )}
                </div>

                {/* Attached Assignment Files */}
                {submission.Assignment.files && submission.Assignment.files.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">Assignment Files</h2>
                    <div className="space-y-3">
                      {submission.Assignment.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-tech-blue-500/10 flex items-center justify-center">
                              <File className="w-5 h-5 text-tech-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {file.original_filename || `File.${file.format}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {file.format?.toUpperCase() || 'File'} • {file.resource_type}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={file.secure_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-tech-blue-600 hover:text-tech-blue-700"
                              download={file.original_filename || `file.${file.format}`}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Col: Submission Files */}
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-tech-blue-500/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-tech-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {isEditMode ? 'Edit Your Submission' : 'Your Submitted Files'}
                    </h2>
                  </div>

                  {!isEditMode ? (
                    /* View Mode - Show submitted files */
                    <div className="space-y-4">
                      {submission.SubmissionFileAttachment && submission.SubmissionFileAttachment.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-foreground">
                              Submitted Files ({submission.SubmissionFileAttachment.length})
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {submission.SubmissionFileAttachment.map((attachment) => {
                              const filename = attachment.File.original_filename || `File.${attachment.File.format}`;

                              return (
                                <div
                                  key={attachment.File.id}
                                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded-xl border border-border/50 hover:border-tech-blue-200/50 hover:shadow-sm transition-all duration-200"
                                >
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                      <File className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="text-sm font-medium text-foreground truncate"
                                        title={filename}
                                      >
                                        {filename}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                          {attachment.File.format?.toUpperCase() || 'FILE'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {attachment.File.resource_type}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      className="w-8 h-8 rounded-lg bg-tech-blue-500/10 hover:bg-tech-blue-500/20 flex items-center justify-center text-tech-blue-600 hover:text-tech-blue-700 transition-all duration-200 hover:scale-110"
                                      title="Download file"
                                    >
                                      <a
                                        href={attachment.File.secure_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={filename}
                                        className="flex items-center justify-center w-full h-full"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                            <File className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            No files submitted yet
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Edit Mode - Allow file management */
                    <div className="space-y-4">
                      {/* File Upload Area */}
                      <div className="space-y-3">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer group ${isDragOver
                            ? 'border-tech-blue-500 bg-tech-blue-500/5 scale-[1.02] shadow-lg'
                            : 'border-muted-foreground/25 hover:border-tech-blue-500/50 hover:bg-gradient-to-br hover:from-muted/20 hover:to-muted/40'
                            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={handleBrowseClick}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.webp"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            className="hidden"
                          />

                          <div className="flex flex-col items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${isDragOver
                              ? 'bg-tech-blue-500/20 scale-110 shadow-lg'
                              : 'bg-muted group-hover:bg-muted/80'
                              }`}>
                              <CloudUpload className={`w-7 h-7 transition-colors ${isDragOver ? 'text-tech-blue-600' : 'text-muted-foreground'
                                }`} />
                            </div>

                            <div className="space-y-2">
                              <p className="text-base font-semibold text-foreground">
                                {isDragOver ? '🎯 Drop your files here!' : 'Replace submission files'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Drag & drop files here, or{' '}
                                <span className="text-tech-blue-600 hover:text-tech-blue-700 font-medium underline cursor-pointer">
                                  browse to choose files
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-2">
                              <span className="px-3 py-1 bg-muted/80 text-xs font-medium rounded-full border">
                                PDF, Word, Images
                              </span>
                              <span className="px-3 py-1 bg-muted/80 text-xs font-medium rounded-full border">
                                Max 10MB each
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* New Files Preview */}
                        {uploadedFiles.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-tech-blue-500/10 flex items-center justify-center">
                                  <FileText className="w-3 h-3 text-tech-blue-600" />
                                </div>
                                <p className="text-sm font-medium text-foreground">
                                  Ready to upload ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={clearAllFiles}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                                title="Remove all files"
                              >
                                Clear all
                              </button>
                            </div>

                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {uploadedFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="group flex items-center justify-between p-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg border border-border/50 hover:border-tech-blue-200/50 hover:shadow-sm transition-all duration-200"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-tech-blue-500/10 flex items-center justify-center flex-shrink-0">
                                      <File className="w-4 h-4 text-tech-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="text-sm font-medium text-foreground truncate"
                                        title={file.name}
                                      >
                                        {file.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="w-8 h-8 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive hover:text-destructive transition-all duration-200 hover:scale-110 flex-shrink-0"
                                    title="Remove file"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={() => setIsEditMode(false)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium text-sm rounded-lg transition-all duration-200 hover:scale-[1.02] border border-border"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateSubmission}
                            disabled={isUploading || uploadedFiles.length === 0}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 disabled:bg-muted disabled:text-muted-foreground text-white font-medium text-sm rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md disabled:hover:scale-100 disabled:shadow-none"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <CloudUpload className="w-3 h-3" />
                                Update
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Submission"
        message="Are you sure you want to delete this submission? This action cannot be undone and your files will be permanently removed."
        confirmText="Delete Submission"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};

export default SubmissionDetail;