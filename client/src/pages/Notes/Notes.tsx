import React, { useEffect, useState, useRef } from 'react';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import type { Folder, Note } from './types';
import { redirectToLogout } from '../../utils/navigation';
import { FolderCard } from './components/FolderCard';
import { NoteCard } from './components/NoteCard';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import api from '../../services/api';
import CreateItemModal from './components/CreateItemModal';
import CreateNoteModal from './components/CreateNoteModal';
import {
    ChevronLeft,
    Search,
    Check,
    Loader2,
    LayoutGrid,
    List,
    FolderPlus,
    FilePlus,
    Home,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';
import FileUpload from '../../components/FileUpload';
import { fileApi } from '../../services/api';
import AttachmentsList from './components/AttachmentsList';



const Notes: React.FC = () => {
    const { sidebarWidth } = useSidebar();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // State for data
    const [folders, setFolders] = useState<Folder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [notebooksPage, setNotebooksPage] = useState<number>(1);
    const [notebooksLoadingMore, setNotebooksLoadingMore] = useState<boolean>(false);
    const [notebooksHasMore, setNotebooksHasMore] = useState<boolean>(false);
    const [noteContent, setNoteContent] = useState('');
    const [noteFiles, setNoteFiles] = useState<Array<{ id: string; secure_url?: string; name?: string; resource_type?: string }>>([]);

    // State for delete modal
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'folder' | 'note' | 'attachment';
        itemId: string;
        itemName: string;
    }>({
        isOpen: false,
        type: 'folder',
        itemId: '',
        itemName: ''
    });

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createMode, setCreateMode] = useState<'folder' | 'note'>('folder');

    const handleCreateFolder = () => {
        setCreateMode('folder');
        setIsCreateOpen(true);
    };

    const handleCreateNote = () => {
        setCreateMode('note');
        if (currentFolder) {
            // open the compact create-note-in-folder modal
            setIsCreateNoteInFolderOpen(true);
        } else {
            setIsCreateOpen(true);
        }
    };

    const [isCreateNoteInFolderOpen, setIsCreateNoteInFolderOpen] = useState(false);
    const [isFolderNameSaving, setIsFolderNameSaving] = useState(false);
    const [folderDraftName, setFolderDraftName] = useState<string>('');
    const [noteDraftName, setNoteDraftName] = useState<string>('');
    const [isNoteNameSaving, setIsNoteNameSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Autosave state
    const [saveStatus, setSaveStatus] = useState<'idle' | 'editing' | 'saving' | 'saved' | 'error'>('idle');
    const debounceRef = useRef<number | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const currentNoteRef = useRef<Note | null>(null);
    const noteContentRef = useRef<string>('');

    // keep draft in sync when folder changes
    useEffect(() => {
        setFolderDraftName(currentFolder?.name ?? '');
    }, [currentFolder]);

    useEffect(() => {
        setNoteDraftName(currentNote?.title ?? '');
        // load files for current note when it changes
        let mounted = true;
        // sync refs when currentNote changes
        currentNoteRef.current = currentNote;
        noteContentRef.current = currentNote?.content ?? '';
        const loadFiles = async () => {
            if (!currentNote) {
                setNoteFiles([]);
                return;
            }
            try {
                const resp = await fileApi.getByContext('NOTE', String(currentNote.id));
                if (!mounted) return;
                const items = resp?.data || resp || [];
                setNoteFiles(Array.isArray(items) ? items.map((f: any) => {
                    let display = f.id;
                    try {
                        if (f.secure_url) {
                            const u = new URL(f.secure_url);
                            const seg = u.pathname.split('/').pop();
                            if (seg) display = decodeURIComponent(seg);
                        } else if (f.public_id) {
                            const seg = String(f.public_id).split('/').pop();
                            display = seg + (f.format ? `.${f.format}` : '');
                        }
                    } catch (e) {
                        // noop
                    }
                    return { id: f.id, secure_url: f.secure_url, name: display, resource_type: f.resource_type };
                }) : []);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Failed to load note files', err);
            }
        };

        loadFiles();
        return () => { mounted = false; };
    }, [currentNote]);

    // Update refs for noteContent when it changes
    useEffect(() => {
        noteContentRef.current = noteContent;
    }, [noteContent]);

    // Debounced autosave: saves noteContent to backend when user stops typing
    useEffect(() => {
        if (!currentNote) {
            setSaveStatus('idle');
            return;
        }

        // if content matches last saved content, mark saved
        if (noteContent === lastSavedContentRef.current) {
            setSaveStatus('saved');
            return;
        }

        setSaveStatus('editing');

        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        // debounce 1000ms
        debounceRef.current = window.setTimeout(() => {
            const saveNow = async () => {
                setSaveStatus('saving');
                try {
                    // call API to update note - server expects `body` field
                    const resp = await api.put(`/notes/${currentNote.id}`, { body: noteContent });
                    const updated = resp?.data?.note ?? resp?.data ?? resp;
                    // update local lists (server may return `body`)
                    const newContent = updated.content ?? updated.body ?? noteContent;
                    setNotes(prev => prev.map(n => n.id === currentNote.id ? ({ ...n, content: newContent, updatedAt: new Date(updated.updatedAt || updated.updated_at || Date.now()) }) : n));
                    setCurrentNote(n => n ? ({ ...n, content: newContent, updatedAt: new Date(updated.updatedAt || updated.updated_at || Date.now()) }) : n);
                    lastSavedContentRef.current = newContent;
                    setSaveStatus('saved');
                } catch (err) {
                    console.error('Autosave failed', err);
                    toast.error('Autosave failed');
                    setSaveStatus('error');
                }
            };
            void saveNow();
            debounceRef.current = null;
        }, 1000) as unknown as number;

        return () => {
            if (debounceRef.current) {
                window.clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
        };
    }, [noteContent, currentNote]);

    // Flush any pending save on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current && currentNoteRef.current && noteContentRef.current !== lastSavedContentRef.current) {
                window.clearTimeout(debounceRef.current);
                // fire-and-forget - send `body` field
                void api.put(`/notes/${currentNoteRef.current.id}`, { body: noteContentRef.current }).catch(() => { /* ignore */ });
            }
        };
    }, []);

    // Fetch folders and notes from backend on mount
    useEffect(() => {
        let mounted = true;

        const normalizeDate = (d: any) => (d ? new Date(d) : new Date());

        const extractList = (resp: any) => {
            // backend may return { data: [...] } or just [...]
            if (!resp) return [];
            if (Array.isArray(resp.data)) return resp.data;
            if (Array.isArray(resp.data?.data)) return resp.data.data;
            if (Array.isArray(resp)) return resp;
            return [];
        };

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [foldersRes, notesRes] = await Promise.all([
                    api.get('/notebooks', { params: { page: 1, limit: 20 } }),
                    api.get('/notes'),
                ]);

                if (!mounted) return;

                const fetchedFolders = extractList(foldersRes);
                const fetchedNotes = extractList(notesRes);

                // Map backend items to local types if needed
                setFolders(
                    fetchedFolders.map((f: any) => ({
                        id: String(f.id || f._id),
                        name: f.name || f.title || 'Untitled',
                        createdAt: normalizeDate(f.createdAt || f.created_at),
                        updatedAt: normalizeDate(f.updatedAt || f.updated_at),
                        color: f.color || 'bg-blue-500/10 text-blue-500',
                        noteCount: typeof f._count?.Note === 'number' ? f._count.Note : (f._count?.notes ?? f.noteCount ?? 0),
                    }))
                );

                // Update pagination for notebooks if meta exists
                const foldersMeta = foldersRes?.data?.meta;
                setNotebooksPage(foldersMeta?.page ?? 1);
                setNotebooksHasMore(foldersMeta ? (foldersMeta.page < foldersMeta.totalPages) : false);

                setNotes(
                    fetchedNotes.map((n: any) => ({
                        id: String(n.id || n._id),
                        folderId: n.folderId || n.folder_id || n.notebook_id || n.folder || undefined ? String(n.folderId || n.folder_id || n.notebook_id || n.folder) : undefined,
                        title: n.title || n.name || 'Untitled',
                        content: n.content ?? n.body ?? '',
                        createdAt: normalizeDate(n.createdAt || n.created_at),
                        updatedAt: normalizeDate(n.updatedAt || n.updated_at),
                    }))
                );
            } catch (err) {
                // If fetch fails, keep mock data (already set) and log the error
                // This keeps the UI usable even without backend
                // eslint-disable-next-line no-console
                console.error('Failed to fetch notes/folders:', err);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, []);

    const NOTEBOOKS_PER_PAGE = 5;

    const loadMoreNotebooks = async () => {
        if (notebooksLoadingMore || !notebooksHasMore) return;
        setNotebooksLoadingMore(true);
        try {
            const nextPage = notebooksPage + 1;
            const resp = await api.get('/notebooks', { params: { page: nextPage, limit: NOTEBOOKS_PER_PAGE } });
            const newFolders = (resp && (resp.data?.data || resp.data)) || [];
            if (Array.isArray(newFolders) && newFolders.length > 0) {
                setFolders((s) => [
                    ...s,
                    ...newFolders.map((f: any) => ({
                        id: String(f.id || f._id),
                        name: f.name || f.title || 'Untitled',
                        createdAt: f.createdAt ? new Date(f.createdAt) : new Date(f.created_at || Date.now()),
                        updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date(f.updated_at || Date.now()),
                        color: f.color || 'bg-blue-500/10 text-blue-500',
                    }))
                ]);
            }

            const meta = resp?.data?.meta;
            setNotebooksPage(meta?.page ?? nextPage);
            setNotebooksHasMore(meta ? (meta.page < meta.totalPages) : false);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to load more notebooks', err);
        } finally {
            setNotebooksLoadingMore(false);
        }
    };

    const handleDeleteFolder = (folder: Folder) => {
        setDeleteModal({
            isOpen: true,
            type: 'folder',
            itemId: folder.id,
            itemName: folder.name
        });
    };

    const handleDeleteNote = (note: Note) => {
        setDeleteModal({
            isOpen: true,
            type: 'note',
            itemId: note.id,
            itemName: note.title
        });
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            if (deleteModal.type === 'folder') {
                setFolders(folders.filter(f => f.id !== deleteModal.itemId));
                // Also delete notes in this folder? Yes, usually.
                setNotes(notes.filter(n => n.folderId !== deleteModal.itemId));
                if (currentFolder?.id === deleteModal.itemId) {
                    setCurrentFolder(null);
                }
            } else if (deleteModal.type === 'note') {
                setNotes(notes.filter(n => n.id !== deleteModal.itemId));
                if (currentNote?.id === deleteModal.itemId) {
                    setCurrentNote(null);
                    setNoteContent('');
                }
            } else if (deleteModal.type === 'attachment') {
                try {
                    await fileApi.delete(deleteModal.itemId);
                    toast.success('Attachment removed');
                    // refresh attachments for current note
                    if (currentNote) {
                        const resp = await fileApi.getByContext('NOTE', String(currentNote.id));
                        const items = resp?.data || resp || [];
                        setNoteFiles(Array.isArray(items) ? items.map((fi: any) => {
                            let display = fi.id;
                            try {
                                if (fi.secure_url) {
                                    const u = new URL(fi.secure_url);
                                    const seg = u.pathname.split('/').pop();
                                    if (seg) display = decodeURIComponent(seg);
                                } else if (fi.public_id) {
                                    const seg = String(fi.public_id).split('/').pop();
                                    display = seg + (fi.format ? `.${fi.format}` : '');
                                }
                            } catch (e) { }
                            return { id: fi.id, secure_url: fi.secure_url, name: display, resource_type: fi.resource_type };
                        }) : []);
                    }
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to delete attachment', err);
                    toast.error('Failed to delete attachment');
                }
            }
        } finally {
            setDeleteModal({ ...deleteModal, isOpen: false });
            setIsDeleting(false);
        }
    };

    const handleSaveNote = (content: string) => {
        setNoteContent(content);
        if (currentNote) {
            setNotes(notes.map(n =>
                n.id === currentNote.id
                    ? { ...n, content, updatedAt: new Date() }
                    : n
            ));
        }
    };

    const handleCreated = (item: any) => {
        // backend may return nested data
        const created = item?.data ?? item ?? item;

        if (createMode === 'folder') {
            const newFolder: Folder = {
                id: String(created.id || created._id || Date.now()),
                name: created.name || created.title || 'Untitled',
                createdAt: new Date(created.createdAt || created.created_at || Date.now()),
                updatedAt: new Date(created.updatedAt || created.updated_at || Date.now()),
                color: 'bg-blue-500/10 text-blue-500'
            };
            setFolders((s) => [...s, newFolder]);
        } else {
            const newNote: Note = {
                id: String(created.id || created._id || Date.now()),
                folderId: created.folderId || created.folder_id || created.notebook_id || created.folder ? String(created.folderId || created.folder_id || created.notebook_id || created.folder) : undefined,
                title: created.title || created.name || 'Untitled',
                content: created.content ?? created.body ?? '',
                createdAt: new Date(created.createdAt || created.created_at || Date.now()),
                updatedAt: new Date(created.updatedAt || created.updated_at || Date.now()),
            };
            setNotes((s) => [...s, newNote]);
            setCurrentNote(newNote);
            setNoteContent(newNote.content);
        }
    };

    const filteredFolders = folders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredNotes = notes.filter(n =>
        (currentFolder ? n.folderId === currentFolder.id : false) &&
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleBack = () => {
        if (currentNote) {
            setCurrentNote(null);
            setNoteContent('');
        } else if (currentFolder) {
            setCurrentFolder(null);
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar onLogout={redirectToLogout} />

            <main 
              className="flex-1 p-6 transition-all duration-300"
              style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <div className="max-w-7xl mx-auto h-[calc(100vh-3rem)] flex flex-col">

                    {/* Header Section */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {(currentFolder || currentNote) && (
                                    <button
                                        onClick={handleBack}
                                        className="p-2 mr-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                )}
                                <div>
                                    {currentNote ? (
                                        <div className="flex items-center gap-3">
                                            <input
                                                value={noteDraftName}
                                                onChange={(e) => setNoteDraftName(e.target.value)}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (!isNoteNameSaving && noteDraftName && noteDraftName.trim() && currentNote && noteDraftName.trim() !== currentNote.title) {
                                                            setIsNoteNameSaving(true);
                                                            try {
                                                                const resp = await api.put(`/notes/${currentNote.id}`, { title: noteDraftName.trim() });
                                                                const updated = resp?.data?.note ?? resp?.data ?? resp;
                                                                setNotes((s) => s.map(n => n.id === currentNote.id ? { ...n, title: updated.title || updated.name || noteDraftName.trim() } : n));
                                                                setCurrentNote((n) => n ? { ...n, title: updated.title || updated.name || noteDraftName.trim() } : n);
                                                                toast.success('Note renamed');
                                                            } catch (err) {
                                                                // eslint-disable-next-line no-console
                                                                console.error('Failed to rename note', err);
                                                                toast.error('Failed to rename note');
                                                            } finally {
                                                                setIsNoteNameSaving(false);
                                                            }
                                                        }
                                                    }
                                                }}
                                                className="text-2xl font-bold bg-transparent border-b border-input text-foreground px-1 py-0.5 focus:outline-none focus:ring-0"
                                            />
                                            <button
                                                onClick={async () => {
                                                    if (!currentNote) return;
                                                    if (!noteDraftName || !noteDraftName.trim() || noteDraftName.trim() === currentNote.title) return;
                                                    setIsNoteNameSaving(true);
                                                    try {
                                                        const resp = await api.put(`/notes/${currentNote.id}`, { title: noteDraftName.trim() });
                                                        const updated = resp?.data?.note ?? resp?.data ?? resp;
                                                        setNotes((s) => s.map(n => n.id === currentNote.id ? { ...n, title: updated.title || updated.name || noteDraftName.trim() } : n));
                                                        setCurrentNote((n) => n ? { ...n, title: updated.title || updated.name || noteDraftName.trim() } : n);
                                                        toast.success('Note renamed');
                                                    } catch (err) {
                                                        // eslint-disable-next-line no-console
                                                        console.error('Failed to rename note', err);
                                                        toast.error('Failed to rename note');
                                                    } finally {
                                                        setIsNoteNameSaving(false);
                                                    }
                                                }}
                                                disabled={!noteDraftName || noteDraftName.trim() === currentNote.title || isNoteNameSaving}
                                                className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {isNoteNameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                            {/* File upload for current note */}
                                            {currentNote && (
                                                <div className="ml-2 w-40">
                                                    <FileUpload
                                                        context="NOTE"
                                                        contextId={String(currentNote.id)}
                                                        label="Attach file"
                                                        preview={false}
                                                        onFileUploaded={async (fileId, url) => {
                                                            toast.success('File uploaded');
                                                            try {
                                                                const resp = await fileApi.getByContext('NOTE', String(currentNote.id));
                                                                const items = resp?.data || resp || [];
                                                                setNoteFiles(Array.isArray(items) ? items.map((f: any) => {
                                                                    // derive a compact display name: try secure_url filename, then public_id + format
                                                                    let display = f.id;
                                                                    try {
                                                                        if (f.secure_url) {
                                                                            const u = new URL(f.secure_url);
                                                                            const seg = u.pathname.split('/').pop();
                                                                            if (seg) display = decodeURIComponent(seg);
                                                                        } else if (f.public_id) {
                                                                            const seg = String(f.public_id).split('/').pop();
                                                                            display = seg + (f.format ? `.${f.format}` : '');
                                                                        }
                                                                    } catch (e) {
                                                                        // fallback to id
                                                                    }
                                                                    return { id: f.id, secure_url: f.secure_url, name: display, resource_type: f.resource_type };
                                                                }) : []);
                                                            } catch (err) {
                                                                // eslint-disable-next-line no-console
                                                                console.error('Failed to refresh note files', err);
                                                            }
                                                        }}
                                                        onError={(errMsg) => toast.error(errMsg)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <h1 className="text-3xl font-bold text-foreground mb-2">Notes</h1>
                                            <p className="text-muted-foreground">Create and organize your notes and notebooks</p>
                                        </div>
                                    )}
                                    {currentFolder && !currentNote && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="flex items-center">
                                                <input
                                                    value={folderDraftName || currentFolder.name}
                                                    onChange={(e) => setFolderDraftName(e.target.value)}
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            // trigger save
                                                            if (!isFolderNameSaving && folderDraftName && folderDraftName.trim() && folderDraftName.trim() !== currentFolder.name) {
                                                                setIsFolderNameSaving(true);
                                                                try {
                                                                    const resp = await api.put(`/notebooks/${currentFolder.id}`, { title: folderDraftName.trim() });
                                                                    const updated = resp?.data?.notebook ?? resp?.data ?? resp;
                                                                    // update local folder list and currentFolder
                                                                    setFolders((s) => s.map(f => f.id === currentFolder.id ? { ...f, name: updated.title || updated.name || folderDraftName.trim() } : f));
                                                                    setCurrentFolder((f) => f ? { ...f, name: updated.title || updated.name || folderDraftName.trim() } : f);
                                                                    toast.success('Notebook renamed');
                                                                } catch (err) {
                                                                    // eslint-disable-next-line no-console
                                                                    console.error('Failed to update notebook name', err);
                                                                    toast.error('Failed to rename notebook');
                                                                } finally {
                                                                    setIsFolderNameSaving(false);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    className="bg-transparent border-b border-input text-sm font-medium text-foreground px-1 py-0.5 focus:outline-none focus:ring-0"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!currentFolder) return;
                                                    if (!folderDraftName || !folderDraftName.trim() || folderDraftName.trim() === currentFolder.name) return;
                                                    setIsFolderNameSaving(true);
                                                    try {
                                                        const resp = await api.put(`/notebooks/${currentFolder.id}`, { title: folderDraftName.trim() });
                                                        const updated = resp?.data?.notebook ?? resp?.data ?? resp;
                                                        setFolders((s) => s.map(f => f.id === currentFolder.id ? { ...f, name: updated.title || updated.name || folderDraftName.trim() } : f));
                                                        setCurrentFolder((f) => f ? { ...f, name: updated.title || updated.name || folderDraftName.trim() } : f);
                                                        // clear draft
                                                        setFolderDraftName('');
                                                        toast.success('Notebook renamed');
                                                    } catch (err) {
                                                        // eslint-disable-next-line no-console
                                                        console.error('Failed to update notebook name', err);
                                                        toast.error('Failed to rename notebook');
                                                    } finally {
                                                        setIsFolderNameSaving(false);
                                                    }
                                                }}
                                                disabled={!folderDraftName || folderDraftName.trim() === currentFolder.name || isFolderNameSaving}
                                                className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {isFolderNameSaving ? <span className="animate-spin"><svg className="w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg></span> : <Check className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                                        <Home size={14} className="mr-1" />
                                        <span className="hover:underline cursor-pointer" onClick={() => { setCurrentFolder(null); setCurrentNote(null); }}>Home</span>
                                        {currentFolder && (
                                            <>
                                                <span className="mx-2">/</span>
                                                <span
                                                    className={`hover:underline cursor-pointer ${!currentNote ? 'text-foreground font-medium' : ''}`}
                                                    onClick={() => setCurrentNote(null)}
                                                >
                                                    {currentFolder.name}
                                                </span>
                                            </>
                                        )}
                                        {currentNote && (
                                            <>
                                                <span className="mx-2">/</span>
                                                <span className="text-foreground font-medium">{currentNote.title}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                            {/* Save status chip (page top) - show only when a note is open */}
                            {currentNote && (
                                <div className="flex justify-end mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${saveStatus === 'saving' ? 'bg-primary/20 text-primary' : saveStatus === 'saved' ? 'bg-turf-green-500/10 text-turf-green-600' : saveStatus === 'editing' ? 'bg-amber-200/20 text-amber-700' : saveStatus === 'error' ? 'bg-rose-200/20 text-rose-600' : 'bg-muted/30 text-muted-foreground'}`}>
                                        {saveStatus === 'saving' && 'Saving...'}
                                        {saveStatus === 'saved' && 'All saved'}
                                        {saveStatus === 'editing' && 'Editing...'}
                                        {saveStatus === 'error' && 'Save failed'}
                                        {saveStatus === 'idle' && 'Idle'}
                                    </span>
                                </div>
                            )}
                            </div>

                            {!currentNote && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full justify-end">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder={currentFolder ? "Search notes..." : "Search notebooks..."}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 pr-4 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all w-full sm:w-64 shadow-sm"
                                            />
                                        </div>

                                        <div className="flex items-center bg-card border border-input rounded-lg p-1 shadow-sm mt-2 sm:mt-0">
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                            >
                                                <LayoutGrid size={18} />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                            >
                                                <List size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
                                        {!currentFolder && (
                                            <button
                                                onClick={handleCreateFolder}
                                                className="flex items-center gap-2 px-4 py-2 bg-card border border-input hover:bg-muted text-foreground rounded-lg transition-colors font-medium shadow-sm w-full sm:w-auto justify-center"
                                            >
                                                <FolderPlus size={18} />
                                                <span className="hidden sm:inline">New Notebook</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCreateNote}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 font-medium w-full sm:w-auto justify-center"
                                        >
                                            <FilePlus size={18} />
                                            <span className="hidden sm:inline">New Note</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-muted/30 border border-border rounded-2xl p-6 overflow-y-auto shadow-inner relative custom-scrollbar">
                        {/* Save status chip moved to header */}
                        <style>{`
                            .custom-scrollbar::-webkit-scrollbar {
                                width: 8px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-track {
                                background: transparent;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                background-color: var(--primary);
                                border-radius: 4px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                background-color: var(--primary);
                                opacity: 0.9;
                            }
                        `}</style>
                        {isLoading ? (
                            <div className="space-y-8 w-full">
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 px-1 text-muted-foreground">Notebooks</h2>
                                    <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`}>
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="group relative flex flex-col items-center justify-center p-6 bg-card/60 border border-border rounded-xl cursor-pointer transition-all duration-200 animate-pulse h-[180px]"
                                            >
                                                <div className="w-16 h-16 mb-4 rounded-2xl bg-muted/40" />
                                                <div className="w-3/4 h-4 rounded-md bg-muted/40 mb-2" />
                                                <div className="w-1/2 h-3 rounded-md bg-muted/40" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold mb-4 px-1 text-muted-foreground">Quick Notes</h2>
                                    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`}>
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="group relative flex flex-col p-5 bg-card/60 border border-border rounded-xl cursor-pointer transition-all duration-200 animate-pulse h-[180px]"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="p-2 rounded-lg bg-muted/40 w-8 h-8" />
                                                    <div className="w-6 h-6 rounded-md bg-muted/40" />
                                                </div>

                                                <div className="w-3/4 h-4 rounded-md bg-muted/40 mb-2" />

                                                <div className="flex-1 space-y-2">
                                                    <div className="w-full h-3 rounded-md bg-muted/40" />
                                                    <div className="w-5/6 h-3 rounded-md bg-muted/40" />
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-3 text-xs">
                                                    <div className="w-10 h-3 rounded-md bg-muted/40" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : currentNote ? (
                            <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200 w-full">

                                <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm p-4 flex flex-col md:flex-row gap-6">
                                    <div className="w-full md:w-[720px] flex-shrink-0">
                                        <MarkdownEditor
                                            key={currentNote.id}
                                            value={noteContent || currentNote.content}
                                            onChange={handleSaveNote}
                                            placeholder="Start typing your note here..."
                                            className="h-[640px] max-h-[80vh] w-full overflow-y-auto"
                                        />
                                    </div>

                                    <aside className="w-80 flex-shrink-0">
                                        <AttachmentsList
                                            files={noteFiles}
                                            onDelete={(id: string, name?: string) => {
                                                setDeleteModal({ isOpen: true, type: 'attachment', itemId: id, itemName: name || id });
                                            }}
                                            isDeleting={isDeleting}
                                            deletingId={deleteModal.itemId}
                                        />
                                    </aside>
                                </div>
                            </div>
                        ) : currentFolder ? (
                            <>
                                {filteredNotes.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                        <div className="w-20 h-20 mb-4 bg-muted rounded-full flex items-center justify-center">
                                            <FileText size={40} className="opacity-50" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-1">No notes yet</h3>
                                        <p className="text-sm">Create your first note in this notebook.</p>
                                        <button
                                            onClick={handleCreateNote}
                                            className="mt-4 text-primary hover:underline font-medium"
                                        >
                                            Create a note
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                                        {filteredNotes.map(note => (
                                            <NoteCard
                                                key={note.id}
                                                note={note}
                                                onClick={() => {
                                                    setNoteContent(note.content);
                                                    setCurrentNote(note);
                                                }}
                                                onDelete={handleDeleteNote}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-8">
                                {/* Folders Section */}
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 px-1 text-muted-foreground">Notebooks</h2>
                                    {filteredFolders.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-xl">
                                            <FolderPlus size={32} className="text-muted-foreground/50 mb-2" />
                                            <p className="text-sm text-muted-foreground">No notebooks found</p>
                                        </div>
                                    ) : (
                                        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                                            {filteredFolders.map(folder => (
                                                <FolderCard
                                                    key={folder.id}
                                                    folder={folder}
                                                    onClick={setCurrentFolder}
                                                    onDelete={handleDeleteFolder}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Root Notes Section */}
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 px-1 text-muted-foreground">Quick Notes</h2>
                                    {notes.filter(n => !n.folderId && n.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-xl">
                                            <FileText size={32} className="text-muted-foreground/50 mb-2" />
                                            <p className="text-sm text-muted-foreground">No quick notes found</p>
                                        </div>
                                    ) : (
                                        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                                            {notes
                                                .filter(n => !n.folderId && n.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map(note => (
                                                    <NoteCard
                                                        key={note.id}
                                                        note={note}
                                                        onClick={() => {
                                                            setNoteContent(note.content);
                                                            setCurrentNote(note);
                                                        }}
                                                        onDelete={handleDeleteNote}
                                                    />
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DeleteConfirmationModal
                        isOpen={deleteModal.isOpen}
                        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                        onConfirm={confirmDelete}
                        isLoading={isDeleting}
                        title={`Delete ${deleteModal.type === 'folder' ? 'Notebook' : deleteModal.type === 'note' ? 'Note' : 'Attachment'}`}
                        description={`Are you sure you want to delete "${deleteModal.itemName}"? This action cannot be undone.`}
                        itemType={deleteModal.type}
                    />
                    <CreateItemModal
                        isOpen={isCreateOpen}
                        mode={createMode}
                        folders={folders.map(f => ({ id: f.id, name: f.name }))}
                        onClose={() => setIsCreateOpen(false)}
                        onCreated={handleCreated}
                        onLoadMoreFolders={loadMoreNotebooks}
                        foldersHasMore={notebooksHasMore}
                        foldersLoadingMore={notebooksLoadingMore}
                    />
                    <CreateNoteModal
                        isOpen={isCreateNoteInFolderOpen}
                        folder={currentFolder ?? ({ id: '', name: '' } as Folder)}
                        onClose={() => setIsCreateNoteInFolderOpen(false)}
                        onCreated={handleCreated}
                    />
                </div>
            </main>
        </div>
    );
};

export default Notes;
