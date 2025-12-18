import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Loader2, FileText, CloudUpload, File, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MarkdownEditor } from '../MarkdownEditor';
import api, { assignmentApi, fileApi } from '../../services/api';
import { toast } from 'sonner';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId?: string;
  mode?: 'create' | 'edit';
  assignment?: {
    id: number;
    title: string;
    description?: string;
    due_date: string | null;
    max_points: number | null;
    canBeLate?: boolean;
  };
  onSuccess?: () => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  communityId,
  mode = 'create',
  assignment,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    canBeLate: true,
    max_points: '' as number | '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form data for edit mode
  useEffect(() => {
    if (isOpen && mode === 'edit' && assignment) {
      // Format date for datetime-local input (YYYY-MM-DDThh:mm)
      let formattedDate = '';
      if (assignment.due_date) {
        const date = new Date(assignment.due_date);
        // Adjust for local timezone offset
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        formattedDate = localDate.toISOString().slice(0, 16);
      }

      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        due_date: formattedDate,
        canBeLate: assignment.canBeLate !== undefined ? assignment.canBeLate : true,
        max_points: assignment.max_points ?? '',
      });
      setAttachmentFile(null);
      setAttachmentName('');
    } else if (isOpen && mode === 'create') {
      // Reset form for create mode
      setFormData({
        title: '',
        description: '',
        due_date: '',
        canBeLate: true,
        max_points: '',
      });
      setAttachmentFile(null);
      setAttachmentName('');
    }
  }, [isOpen, mode, assignment]);

  const validateFile = (file: File) => {
    // Validate file type (allow common document types)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf'
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, attachment: 'Only PDF, Word documents, and text files are allowed.' }));
      return false;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, attachment: 'File must be less than 10MB.' }));
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) return;

    setAttachmentFile(file);
    setAttachmentName(file.name);
    setErrors(prev => {
      const { attachment, ...rest } = prev;
      return rest;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setAttachmentFile(null);
    setAttachmentName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors(prev => {
      const { attachment, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const validationErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      validationErrors.title = 'Assignment title is required';
    }

    if (formData.max_points !== '' && (typeof formData.max_points !== 'number' || formData.max_points < 0)) {
      validationErrors.max_points = 'Points must be a non-negative number';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      let fileAttachments: Array<{
        public_id: string;
        secure_url: string;
        resource_type: string;
        format: string;
        original_filename: string;
      }> | undefined = undefined;

      let fileIds: string[] | undefined = undefined;

      // We'll create the assignment after a successful file upload when creating with attachment.
      let createdAssignmentId: number | null = null;

      // Handle file upload if attachment is provided
      if (attachmentFile) {
        setUploading(true);

        try {
          // Use a temporary context id for signing when creating (we'll create the assignment after upload)
          const contextIdForSign = mode === 'create' ? 'temp' : String(assignment?.id || 'temp');

          // 1. Get signature for ASSIGNMENT context with real context_id
          const signRes = await api.post('/uploads/sign', {
            context: 'ASSIGNMENT',
            context_id: contextIdForSign,
            is_private: false,
            resource_type: 'auto',
          });
          const { timestamp, signature, folder, cloudName, apiKey } = signRes.data;

          // 2. Upload to Cloudinary
          const uploadFormData = new FormData();
          uploadFormData.append('file', attachmentFile);
          uploadFormData.append('timestamp', timestamp.toString());
          uploadFormData.append('signature', signature);
          uploadFormData.append('api_key', apiKey);
          uploadFormData.append('folder', folder);

          const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || errorData.message || 'Upload to Cloudinary failed';
            throw new Error(`File upload failed: ${errorMessage}`);
          }

          const cloudinaryData = await uploadResponse.json();

          // If creating a new assignment, create it now that upload succeeded
          if (mode === 'create') {
            try {
              const created = await assignmentApi.create({
                title: formData.title.trim(),
                description: formData.description.trim() || undefined,
                cid: communityId!,
                due_date: formData.due_date || undefined,
                canBeLate: formData.canBeLate,
                max_points: typeof formData.max_points === 'number' ? formData.max_points : undefined,
              });
              createdAssignmentId = (created as any).id;
            } catch (createErr) {
              console.error('Failed to create assignment after upload:', createErr);
              toast.error('File uploaded but failed to create assignment. Please try again.');
              setUploading(false);
              setIsLoading(false);
              return;
            }
          }

          fileAttachments = [{
            public_id: cloudinaryData.public_id,
            secure_url: cloudinaryData.secure_url,
            resource_type: cloudinaryData.resource_type,
            format: cloudinaryData.format,
            original_filename: attachmentFile.name,
          }];

          // Create file record in backend and collect its id. Use the real assignment id as context_id.
          try {
            const contextIdToUse = mode === 'create' ? String(createdAssignmentId) : String(assignment?.id);
            const payload = {
              public_id: cloudinaryData.public_id,
              secure_url: cloudinaryData.secure_url,
              resource_type: cloudinaryData.resource_type,
              format: cloudinaryData.format,
              context: 'ASSIGNMENT',
              context_id: contextIdToUse,
              is_private: false,
              original_filename: attachmentFile.name,
            };

            console.debug('Creating file record with payload:', payload);
            const createRes = await api.post('/files', payload);

            const createdFileId = createRes.data?.data?.id;
            if (createdFileId) {
              fileIds = [createdFileId];
              console.info('Created file record for assignment:', createdFileId);
            } else {
              console.warn('File record created but no id returned', createRes.data);
            }
          } catch (fileCreateError: any) {
            console.error('Failed to create file record:', (fileCreateError as any)?.response?.data || fileCreateError);
            // If we created the assignment for this upload, roll it back to avoid a created assignment without its attachment
            if (mode === 'create' && createdAssignmentId) {
              try {
                await assignmentApi.delete(createdAssignmentId);
                console.info('Rolled back assignment due to file record failure:', createdAssignmentId);
                toast.error('Failed to save attachment record — assignment creation was rolled back.');
              } catch (rollbackErr) {
                console.warn('Failed to rollback assignment after file record failure:', rollbackErr);
                toast.error('Attachment save failed and rollback also failed. Please contact support.');
              }
            } else {
              const serverMessage = (fileCreateError as any)?.response?.data?.message || fileCreateError.message || 'Unknown server error';
              toast.error(`Uploaded file but failed to save attachment record: ${serverMessage}`);
            }
            fileIds = undefined;
            setUploading(false);
            setIsLoading(false);
            return;
          }
        } catch (uploadError) {
          // Log the upload error but don't fail the entire assignment creation
          console.error('File upload failed, continuing with assignment creation/update:', uploadError);

          const errorMsg = uploadError instanceof Error ? uploadError.message : 'File upload failed';
          if (errorMsg.includes('Customer is marked as untrusted') || errorMsg.includes('untrusted')) {
            toast.error('File upload failed due to Cloudinary account restrictions. Assignment will be created without attachments.');
          } else {
            toast.error(`File upload failed: ${errorMsg}. Assignment will be created without attachments.`);
          }

          // Reset attachment state since upload failed
          setAttachmentFile(null);
          setAttachmentName('');
          fileAttachments = undefined;
        } finally {
          setUploading(false);
        }
      }

      // If we created assignment earlier (create mode with attachment), attach files via update
      if (mode === 'create' && createdAssignmentId) {
        // If fileIds present, attach them
        if (fileIds && fileIds.length > 0) {
          try {
            await assignmentApi.update(createdAssignmentId, { file_ids: fileIds });
            toast.success('Assignment created and attachment saved successfully!');

            // Verify created files are visible via /files endpoint
            try {
              const filesRes = await fileApi.getByContext('ASSIGNMENT', String(createdAssignmentId));
              console.debug('Files for assignment after attach:', filesRes);
            } catch (verifyErr) {
              console.warn('Verification fetch failed:', verifyErr);
            }
          } catch (attachErr) {
            console.error('Failed to attach fileIds to assignment:', (attachErr as any)?.response?.data || attachErr);
            toast.error('Assignment created but failed to attach uploaded file.');
          }
        } else {
          toast.success('Assignment created successfully!');
        }
      } else if (mode === 'edit' && assignment) {
        await assignmentApi.update(assignment.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          due_date: formData.due_date || undefined,
          canBeLate: formData.canBeLate,
          max_points: typeof formData.max_points === 'number' ? formData.max_points : undefined,
          file_ids: fileIds,
        });
        toast.success('Assignment updated successfully!');
      } else if (!attachmentFile) {
        // No attachment case: proceed normally
        if (mode === 'edit' && assignment) {
          await assignmentApi.update(assignment.id, {
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            due_date: formData.due_date || undefined,
            canBeLate: formData.canBeLate,
            max_points: typeof formData.max_points === 'number' ? formData.max_points : undefined,
          });
          toast.success('Assignment updated successfully!');
        } else {
          await assignmentApi.create({
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            cid: communityId!,
            due_date: formData.due_date || undefined,
            canBeLate: formData.canBeLate,
            max_points: typeof formData.max_points === 'number' ? formData.max_points : undefined,
          });
          toast.success('Assignment created successfully!');
        }
      }
      onSuccess?.();
      onClose();

      // Reset form
      setFormData({
        title: '',
        description: '',
        due_date: '',
        canBeLate: true,
        max_points: '',
      });
      setAttachmentFile(null);
      setAttachmentName('');

    } catch (error: unknown) {
      console.error('Failed to create assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assignment';

      // Check if it's a Cloudinary account issue
      if (errorMessage.includes('Customer is marked as untrusted') ||
        errorMessage.includes('untrusted') ||
        errorMessage.includes('cloudinary')) {
        toast.error(`File upload failed due to Cloudinary account restrictions. Please contact Cloudinary support or try creating the assignment without attachments.`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setErrors({});
      setFormData({
        title: '',
        description: '',
        due_date: '',
        canBeLate: true,
        max_points: '',
      });
      setAttachmentFile(null);
      setAttachmentName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tech-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-tech-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {mode === 'edit' ? 'Edit Assignment' : 'Create Assignment'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === 'edit' ? 'Update assignment details' : 'Create a new assignment for your community'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div className="space-y-3">
            <Label htmlFor="title" className="text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-tech-blue-500/10 flex items-center justify-center">
                <FileText className="w-3 h-3 text-tech-blue-600" />
              </div>
              Assignment Title *
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Enter a clear, descriptive title for your assignment"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`h-11 ${errors.title ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-tech-blue-500'}`}
              disabled={isLoading}
              required
            />
            {errors.title && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                </span>
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center">
                <FileText className="w-3 h-3 text-green-600" />
              </div>
              Description
            </Label>
            <MarkdownEditor
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              placeholder="Provide detailed instructions, requirements, and any additional information students need to complete this assignment..."
              className="min-h-[200px]"
              style={{ minHeight: '200px' }}
            />
            <p className="text-xs text-muted-foreground">
              Use the toolbar above to format your text with bold, italic, headings, lists, and more
            </p>
          </div>

          {/* Points */}
          <div className="space-y-3">
            <Label htmlFor="points" className="text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-yellow-500/10 flex items-center justify-center">
                <File className="w-3 h-3 text-yellow-600" />
              </div>
              Points (Max)
            </Label>
            <Input
              id="points"
              type="number"
              placeholder="Total points for this assignment (optional)"
              value={formData.max_points === '' ? '' : String(formData.max_points)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') setFormData(prev => ({ ...prev, max_points: '' }));
                else {
                  const num = Number(v);
                  setFormData(prev => ({ ...prev, max_points: Number.isNaN(num) ? '' : Math.max(0, Math.floor(num)) }));
                }
              }}
              className={`h-11 ${errors.max_points ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-tech-blue-500'}`}
              disabled={isLoading}
            />
            {errors.max_points && (
              <p className="text-sm text-destructive">{errors.max_points}</p>
            )}
          </div>

          {/* File Attachment */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center">
                <CloudUpload className="w-3 h-3 text-purple-600" />
              </div>
              File Attachment (Optional)
            </Label>

            {/* File Upload Area */}
            {!attachmentFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${isDragOver
                  ? 'border-tech-blue-500 bg-tech-blue-500/5 scale-[1.02]'
                  : 'border-muted-foreground/25 hover:border-tech-blue-500/50 hover:bg-muted/30'
                  } ${isLoading || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleBrowseClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf"
                  onChange={handleFileChange}
                  disabled={isLoading || uploading}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-tech-blue-500/10' : 'bg-muted'
                    }`}>
                    <CloudUpload className={`w-8 h-8 transition-colors ${isDragOver ? 'text-tech-blue-600' : 'text-muted-foreground'
                      }`} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {isDragOver ? 'Drop your file here' : 'Drag & drop your file here'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or <button type="button" className="text-tech-blue-600 hover:text-tech-blue-700 font-medium underline">browse to choose a file</button>
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 bg-muted rounded-md">PDF</span>
                    <span className="px-2 py-1 bg-muted rounded-md">Word</span>
                    <span className="px-2 py-1 bg-muted rounded-md">Text</span>
                    <span className="px-2 py-1 bg-muted rounded-md">Max 10MB</span>
                  </div>
                </div>
              </div>
            ) : (
              /* File Preview */
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-tech-blue-500/10 flex items-center justify-center">
                    <File className="w-5 h-5 text-tech-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{attachmentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(attachmentFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={isLoading || uploading}
                  className="w-8 h-8 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive hover:text-destructive transition-colors disabled:opacity-50"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {errors.attachment && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                </span>
                {errors.attachment}
              </p>
            )}

            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              </span>
              File uploads may fail due to Cloudinary account restrictions. Assignment will still be created without attachments.
            </p>
          </div>

          {/* Due Date */}
          <div className="space-y-3">
            <Label htmlFor="due_date" className="text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-orange-500/10 flex items-center justify-center">
                <Calendar className="w-3 h-3 text-orange-600" />
              </div>
              Due Date (Optional)
            </Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="h-11 focus-visible:ring-tech-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-muted flex items-center justify-center">
                <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
              </span>
              Leave empty if there's no specific due date
            </p>
          </div>

          {/* Late Submission */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-red-500/10 flex items-center justify-center">
                <Calendar className="w-3 h-3 text-red-600" />
              </div>
              Submission Settings
            </Label>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
              <input
                id="canBeLate"
                type="checkbox"
                checked={formData.canBeLate}
                onChange={e => setFormData(prev => ({ ...prev, canBeLate: e.target.checked }))}
                className="w-4 h-4 text-tech-blue-600 bg-background border-border rounded focus:ring-tech-blue-500 focus:ring-2"
                disabled={isLoading}
              />
              <div className="flex-1">
                <Label htmlFor="canBeLate" className="text-sm font-medium text-foreground cursor-pointer">
                  Allow late submissions
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  If unchecked, students cannot submit after the due date
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-11 hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 bg-tech-blue-500 hover:bg-tech-blue-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  {uploading ? 'Uploading...' : mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {mode === 'edit' ? (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Update Assignment
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4 mr-2" />
                      Create Assignment
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentModal;