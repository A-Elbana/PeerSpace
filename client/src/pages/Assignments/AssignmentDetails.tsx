import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, CheckCircle, Upload, AlertCircle, Loader2, ChevronRight, PenSquare, Trash2, Home, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import api, { assignmentApi, submissionApi, communityApi, fileApi } from '../../services/api';
import { Sidebar } from '../../components/dashboard';
import { AssignmentModal } from '../../components/assignments';
import { MarkdownPreview } from '../../components/MarkdownEditor';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface AssignmentDetailsData {
    id: number;
    title: string;
    description?: string;
    due_date: string | null;
    max_points: number | null;
    canBeLate?: boolean;
    cid: string;
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
        }
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
}

// Define UserData locally or import shared type
interface UserData {
    id: number;
    role: string;
    fname: string;
    lname: string;
}

const AssignmentDetails: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();

    const [assignment, setAssignment] = useState<AssignmentDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isDragOverFiles, setIsDragOverFiles] = useState(false);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);


    const [submitted, setSubmitted] = useState(false);
    const [missed, setMissed] = useState(false);

    // New state for Edit/Delete
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Helper to get user from local storage or context
    const [user, setUser] = useState<UserData | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await api.get('/auth/me');
                setUser(data);
            } catch (error) {
                console.error('Failed to fetch user');
            }
        };
        fetchUser();
    }, []);

    const fetchAssignmentDetails = async () => {
        if (!assignmentId) return;
        try {
            setIsLoading(true);
            setError(null);

            // Primary attempt: call assignment by id
            try {
                const response = await assignmentApi.getById(Number(assignmentId));
                setAssignment(response as AssignmentDetailsData);

                // If server returned no files (some controllers match context_id as number),
                // fetch files by context explicitly using string context_id to ensure attached
                // files created with string context_id are returned.
                try {
                    const filesRes = await fileApi.getByContext('ASSIGNMENT', String(assignmentId));
                    const fetchedFiles = filesRes.data || [];
                    if (fetchedFiles.length > 0) {
                        setAssignment(prev => prev ? { ...prev, files: fetchedFiles } : prev);
                    }
                } catch (fileFetchErr) {
                    // non-fatal: continue with whatever assignment data we have
                    console.warn('Failed to fetch assignment files by context:', fileFetchErr);
                }

                return;
            } catch (err: any) {
                const status = err?.response?.status;
                if (status !== 500) {
                    throw err;
                }
                console.warn('assignmentApi.getById failed with 500, attempting fallback search across communities');
            }

            // Fallback: fetch communities the user is a member of and search their assignments
            try {
                const commsRes = await communityApi.getAll({ memberOnly: true, limit: 100 });
                const communities = commsRes.data || [];

                for (const comm of communities) {
                    try {
                        const assignmentsRes = await assignmentApi.getByCommunity(comm.id, { limit: 100 });
                        const found = assignmentsRes.data.find(a => String(a.id) === String(assignmentId));
                        if (found) {
                            const mapped: AssignmentDetailsData = {
                                id: found.id,
                                title: found.title,
                                description: found.description,
                                due_date: found.due_date,
                                max_points: found.max_points,
                                canBeLate: (found as any).canBeLate,
                                cid: found.cid,
                                Community: { id: comm.id, name: comm.name },
                                Instructor: found.Instructor,
                                files: (found as any).AssignmentFileAttachment?.map((a: any) => a.File).filter(Boolean) || [],
                            };
                            setAssignment(mapped);
                            return;
                        }
                    } catch (inner) {
                        console.warn('Failed to fetch assignments for community', comm.id, inner);
                        continue;
                    }
                }

                setError('Assignment not found');
            } catch (commErr) {
                console.error('Fallback community search failed:', commErr);
                setError('Failed to load assignment details');
            }

        } catch (error) {
            console.error('Failed to fetch assignment:', error);
            setError('Failed to load assignment details');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignmentDetails();
        checkSubmissionStatus();
    }, [assignmentId]);

    const checkSubmissionStatus = async () => {
        if (!assignmentId || !user) return;

        try {
            // Check if student has already submitted this assignment
            const mySubmissions = await submissionApi.getMySubmissions({ limit: 100 });
            const hasSubmitted = mySubmissions.data.some(sub => sub.aid === Number(assignmentId));
            setSubmitted(hasSubmitted);

            // Check if missed (due date passed, not submitted, canBeLate is false)
            if (assignment && assignment.due_date && !hasSubmitted) {
                const due = new Date(assignment.due_date).getTime();
                const now = Date.now();
                if (due < now && assignment.canBeLate === false) {
                    setMissed(true);
                } else {
                    setMissed(false);
                }
            } else {
                setMissed(false);
            }
        } catch (error) {
            console.error('Failed to check submission status:', error);
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!assignmentId) return;

        setIsDeleting(true);
        try {
            await assignmentApi.delete(Number(assignmentId));
            toast.success("Assignment deleted");
            setShowDeleteModal(false);
            if (assignment?.cid) {
                navigate(`/community/${assignment.cid}`);
            } else {
                navigate('/dashboard');
            }
        } catch (e) {
            toast.error("Failed to delete assignment");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditSuccess = () => {
        fetchAssignmentDetails();
    };

    const handleSubmit = async () => {
        if (!assignmentId) return;

        // If no files selected, create submission directly
        if (uploadedFiles.length === 0) {
            setIsSubmitting(true);
            try {
                await submissionApi.create({ aid: Number(assignmentId) });
                setSubmitted(true);
                toast.success('Assignment submitted successfully!');
            } catch (error: any) {
                console.error('Submission failed:', error);
                toast.error((error as any).response?.data?.message || 'Failed to submit assignment');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // If files selected: create submission first, then upload files with context_id = submission id
        setIsUploadingFiles(true);
        setIsSubmitting(true);
        try {
            const createRes = await submissionApi.create({ aid: Number(assignmentId) });
            const submissionId = createRes.data.id;
            const createdFileIds: string[] = [];

            for (const file of uploadedFiles) {
                // request signature with real context_id
                const signRes = await api.post('/uploads/sign', {
                    context: 'SUBMISSION',
                    context_id: String(submissionId),
                    is_private: false,
                    resource_type: 'auto',
                });
                const { timestamp, signature, folder, cloudName, apiKey } = signRes.data;

                const uploadFormData = new FormData();
                uploadFormData.append('file', file);
                uploadFormData.append('timestamp', timestamp.toString());
                uploadFormData.append('signature', signature);
                uploadFormData.append('api_key', apiKey);
                uploadFormData.append('folder', folder);

                const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
                const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: uploadFormData });
                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || errorData.message || 'Upload to Cloudinary failed';
                    throw new Error(`File upload failed: ${errorMessage}`);
                }
                const cloudinaryData = await uploadResponse.json();

                // create file record with context_id = submissionId (string)
                try {
                    const createFileRes = await api.post('/files', {
                        public_id: cloudinaryData.public_id,
                        secure_url: cloudinaryData.secure_url,
                        resource_type: cloudinaryData.resource_type,
                        format: cloudinaryData.format,
                        context: 'SUBMISSION',
                        context_id: String(submissionId),
                        is_private: false,
                        original_filename: file.name,
                    });
                    const fid = createFileRes.data?.data?.id;
                    if (fid) createdFileIds.push(fid);
                } catch (fileCreateErr) {
                    console.error('Failed to create file record:', fileCreateErr);
                    // continue with other files
                }
            }

            // Attach created file IDs to submission
            if (createdFileIds.length > 0) {
                try {
                    await submissionApi.update(submissionId, { comment: undefined });
                    // update accepts fileIds via API; use generic PUT to ensure server receives fileIds
                    await api.put(`/submissions/${submissionId}`, { fileIds: createdFileIds });
                } catch (attachErr) {
                    console.error('Failed to attach files to submission:', attachErr);
                    // rollback: delete created files
                    for (const fid of createdFileIds) {
                        try { await api.delete(`/files/${fid}`); } catch (e) { console.warn('Rollback delete failed', fid, e); }
                    }
                    throw attachErr;
                }
            }

            setSubmitted(true);
            toast.success('Assignment submitted with attachments!');
            setUploadedFiles([]);
        } catch (err: any) {
            console.error('Failed to submit with files:', err);
            toast.error(err?.message || 'Failed to submit assignment with files');
        } finally {
            setIsUploadingFiles(false);
            setIsSubmitting(false);
        }
    };

    const validateFile = (file: File) => {
        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(file.type)) { toast.error('Invalid file type'); return false; }
        if (file.size > 10 * 1024 * 1024) { toast.error('File must be less than 10MB'); return false; }
        return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return; if (!validateFile(f)) return; setUploadedFiles(prev => [...prev, f]);
    };

    const handleDropFiles = (e: React.DragEvent) => { e.preventDefault(); setIsDragOverFiles(false); const files = Array.from(e.dataTransfer.files); const valid = files.filter(validateFile); if (valid.length) setUploadedFiles(prev => [...prev, ...valid]); };

    const removeUploadedFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !assignment) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-xl font-semibold text-foreground mb-2">Error</p>
                <p className="text-muted-foreground mb-6">{error || 'Assignment not found'}</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar onLogout={() => { }} />

            <main className="flex-1 ml-20 p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Breadcrumb Navigation */}
                    <div className="mb-6 flex items-center text-sm text-muted-foreground">
                        <Link to="/dashboard" className="flex items-center hover:text-foreground transition-colors">
                            <Home className="w-4 h-4 mr-1" />
                            Home
                        </Link>
                        <ChevronRight className="w-4 h-4 mx-2" />
                        <Link to={`/community/${assignment.cid}`} className="hover:text-foreground transition-colors">
                            {assignment.Community.name || 'Community'}
                        </Link>
                        <ChevronRight className="w-4 h-4 mx-2" />
                        <span className="text-foreground font-medium truncate max-w-[200px]">
                            {assignment.title}
                        </span>
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">{assignment.title}</h1>
                            <div className="flex items-center gap-4 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    <span className="text-sm">
                                        {assignment.Instructor.User.fname} {assignment.Instructor.User.lname}
                                    </span>
                                </div>
                                {assignment.due_date && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-sm">Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {assignment.max_points && (
                                    <div className="flex items-center gap-1">
                                        <FileText className="w-4 h-4" />
                                        <span className="text-sm">{assignment.max_points} points</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Instructor/Admin Actions */}
                        {(() => {
                            const userRole = user?.role?.toLowerCase();
                            const isAdmin = userRole === 'admin';
                            const isCreator = userRole === 'instructor' && user?.id === assignment.Instructor.User.id;
                            const canEditDelete = isAdmin || isCreator;

                            console.log('Edit/Delete Permission Check:', {
                                userRole,
                                userId: user?.id,
                                creatorId: assignment.Instructor.User.id,
                                isAdmin,
                                isCreator,
                                canEditDelete
                            });

                            return canEditDelete ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="w-12 h-12 rounded-full bg-tech-blue-500 hover:bg-tech-blue-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                                        title="Edit Assignment"
                                    >
                                        <PenSquare className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                                        title="Delete Assignment"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : null;
                        })()}
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Col: Description */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                <h2 className="text-lg font-semibold mb-4 text-foreground">Description</h2>
                                {assignment.description ? (
                                    <MarkdownPreview content={assignment.description} />
                                ) : (
                                    <span className="italic opacity-50">No instructions provided.</span>
                                )}
                            </div>

                            {/* Attached Files Section */}
                            {assignment.files && assignment.files.length > 0 && (
                                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                    <h2 className="text-lg font-semibold mb-4 text-foreground">Attached Files</h2>
                                    <div className="space-y-3">
                                        {assignment.files.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted/70 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-tech-blue-500/10 flex items-center justify-center">
                                                        {file.resource_type === 'raw' ? (
                                                            <FileText className="w-5 h-5 text-tech-blue-600" />
                                                        ) : (
                                                            <div className="w-5 h-5 bg-gray-400 rounded-sm"></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground text-sm">
                                                            {file.original_filename || `File.${file.format}`}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {file.format?.toUpperCase()} • {(file.secure_url.length / 1024).toFixed(1)} KB
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
                                                    >
                                                        View
                                                    </a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Col: Submission (Students Only) */}
                        {user?.role?.toLowerCase() === 'student' && (
                            <div className="space-y-6">
                                <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-6">
                                    <h2 className="text-lg font-semibold mb-4 text-foreground">Your Work</h2>

                                    {submitted ? (
                                        <div className="text-center py-8 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                            <h3 className="font-medium text-green-600 dark:text-green-400">Submitted!</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Submitted on {new Date().toLocaleDateString()}
                                            </p>
                                        </div>
                                    ) : missed ? (
                                        <div className="text-center py-8 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                            <h3 className="font-medium text-red-600 dark:text-red-400">Missed</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                You cannot submit this assignment because the due date has passed and late submissions are not allowed.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* File upload area */}
                                            <div
                                                onDragOver={(e) => { e.preventDefault(); setIsDragOverFiles(true); }}
                                                onDragLeave={(e) => { e.preventDefault(); setIsDragOverFiles(false); }}
                                                onDrop={handleDropFiles}
                                                className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 cursor-pointer ${isDragOverFiles ? 'border-tech-blue-500 bg-tech-blue-500/5' : 'border-muted-foreground/25 hover:border-tech-blue-500/50'} ${isUploadingFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" disabled={isUploadingFiles} />
                                                <div className="flex flex-col items-center gap-2">
                                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                                    <p className="text-sm font-medium text-foreground">Drag & drop your files here or click to browse</p>
                                                    <p className="text-xs text-muted-foreground">Supported: PDF, Word, Text, Images. Max 10MB</p>
                                                </div>
                                            </div>

                                            {uploadedFiles.length > 0 && (
                                                <div className="space-y-2">
                                                    {uploadedFiles.map((f, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                                                            <div className="flex items-center gap-3">
                                                                <FileText className="w-5 h-5 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-sm text-foreground">{f.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => removeUploadedFile(idx)} className="text-destructive">Remove</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <Button
                                                onClick={handleSubmit}
                                                disabled={isSubmitting || isUploadingFiles}
                                                className="w-full bg-tech-blue-500 hover:bg-tech-blue-600"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        {isUploadingFiles ? 'Uploading...' : 'Submitting...'}
                                                    </>
                                                ) : (
                                                    'Mark as Done'
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Edit Modal */}
            {assignment && (
                <AssignmentModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    communityId={assignment.cid}
                    mode="edit"
                    assignment={{
                        id: assignment.id,
                        title: assignment.title,
                        description: assignment.description,
                        due_date: assignment.due_date,
                        max_points: assignment.max_points,
                        canBeLate: assignment.canBeLate
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Assignment"
                message="Are you sure you want to delete this assignment? This action cannot be undone."
                confirmText="Delete"
                isDestructive
                isLoading={isDeleting}
            />
        </div>
    );
};

export default AssignmentDetails;
