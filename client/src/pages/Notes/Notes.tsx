import React, { useState } from 'react';
import { Sidebar } from '../../components/dashboard';
import type { Folder, Note } from './types';
import { FolderCard } from './components/FolderCard';
import { NoteCard } from './components/NoteCard';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import {
    ChevronLeft,
    Search,
    LayoutGrid,
    List,
    FolderPlus,
    FilePlus,
    Home,
    FileText
} from 'lucide-react';


// Mock Data
const INITIAL_FOLDERS: Folder[] = [
    { id: '1', name: 'University Notes', createdAt: new Date(), updatedAt: new Date(), color: 'bg-blue-500/10 text-blue-500' },
    { id: '2', name: 'Project Ideas', createdAt: new Date(), updatedAt: new Date(), color: 'bg-purple-500/10 text-purple-500' },
    { id: '3', name: 'Personal', createdAt: new Date(), updatedAt: new Date(), color: 'bg-green-500/10 text-green-500' },
    { id: '4', name: 'Meeting Minutes', createdAt: new Date(), updatedAt: new Date(), color: 'bg-orange-500/10 text-orange-500' },
];

const INITIAL_NOTES: Note[] = [
    // University Notes
    { id: '1', folderId: '1', title: 'Database Systems Lecture 1', content: '# Introduction to Database Systems\n\n## Core Concepts\n\n- **Data**: Known facts that can be recorded and have implicit meaning.\n- **Database**: A collection of related data.\n- **DBMS**: A software package/ system to facilitate the creation and maintenance of a computerized database.\n\n### DBMS vs File System\n\n| Feature | DBMS | File System |\n| :--- | :--- | :--- |\n| Data Redundancy | Controlled | High |\n| Data Consistency | Maintained | Poor |\n| Security | High | Low |', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', folderId: '1', title: 'Prisma Project Requirements', content: '# Project: PeerSpace\n\n## Overview\nA community-based learning platform.\n\n## Tech Stack\n- React + TypeScript\n- Note.js + Express\n- Prisma ORM\n- PostgreSQL\n\n## Todo List\n- [x] Setup Basic Auth\n- [x] Sidebar Navigation\n- [x] Notes Feature\n- [ ] Real-time Chat', createdAt: new Date(), updatedAt: new Date() },

    // Project Ideas
    { id: '3', folderId: '2', title: 'App Idea: PeerSpace', content: '# PeerSpace Pitch\n\n> "Connecting students, one node at a time."\n\n## Value Proposition\nSolving the isolation in remote learning by providing a digital campus corridor.\n\n## Key Features\n1. Community-based feeds\n2. Resource sharing\n3. Integrated tools (Notes, Calendar)\n\n```typescript\n// Example User Interface\ninterface User {\n  id: string;\n  name: string;\n  role: "student" | "instructor";\n}\n```', createdAt: new Date(), updatedAt: new Date() },
    { id: '4', folderId: '2', title: 'AI Study Buddy', content: '# Feature Idea: AI Tutor\n\nIntegrate an LLM to answer questions about uploaded PDFs.\n\n**Steps:**\n1. User uploads PDF.\n2. Backend parses text.\n3. Vector embedding stored in Pinecone.\n4. RAG implementation for QA.', createdAt: new Date(), updatedAt: new Date() },

    // Personal
    { id: '5', folderId: '3', title: 'Grocery List', content: '# Weekly Groceries\n\n## Produce\n- Apples\n- Bananas\n- Spinach\n\n## Dairy\n- Milk\n- Cheese\n- Yogurt\n\n## Pantry\n- Rice\n- Pasta\n- Olive Oil', createdAt: new Date(), updatedAt: new Date() },
    { id: '6', folderId: '3', title: 'Morning Routine', content: '# Morning Success Routine\n\n1. Wake up at 6:00 AM\n2. Drink water\n3. 10 min meditation\n4. Review daily goals\n5. Deep work session (90 mins)', createdAt: new Date(), updatedAt: new Date() },

    // Meeting Minutes
    { id: '7', folderId: '4', title: 'Team Sync - Dec 12', content: '# Weekly Sync\n\n**Date:** December 12, 2025\n**Attendees:** Alex, Sarah, Mike\n\n## Agenda\n1. Review sprint progress.\n2. discuss blocker on Auth API.\n3. Plan for next release.\n\n## Action Items\n- **Alex**: Fix login bug.\n- **Sarah**: Finish dashboard designs.\n- **Mike**: Deploy to staging.', createdAt: new Date(), updatedAt: new Date() },

    // Root Notes (Quick Notes)
    { id: '8', title: 'Scratchpad', content: 'Just a quick thought...\n\nDon\'t forget to buy milk!', createdAt: new Date(), updatedAt: new Date() }
];

const Notes: React.FC = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // State for data
    const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);
    const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
    const [noteContent, setNoteContent] = useState('');

    // State for delete modal
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'folder' | 'note';
        itemId: string;
        itemName: string;
    }>({
        isOpen: false,
        type: 'folder',
        itemId: '',
        itemName: ''
    });

    const handleCreateFolder = () => {
        const name = prompt('Enter folder name:');
        if (name) {
            const newFolder: Folder = {
                id: Date.now().toString(),
                name,
                createdAt: new Date(),
                updatedAt: new Date(),
                color: 'bg-blue-500/10 text-blue-500' // Default color
            };
            setFolders([...folders, newFolder]);
        }
    };

    const handleCreateNote = () => {
        // Allow creating notes in root (no folder) or in a specific folder
        const title = prompt('Enter note title:');
        if (title) {
            const newNote: Note = {
                id: Date.now().toString(),
                folderId: currentFolder?.id, // undefined if in root
                title,
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            setNotes([...notes, newNote]);
            setCurrentNote(newNote);
            setNoteContent('');
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

    const confirmDelete = () => {
        if (deleteModal.type === 'folder') {
            setFolders(folders.filter(f => f.id !== deleteModal.itemId));
            // Also delete notes in this folder? Yes, usually.
            setNotes(notes.filter(n => n.folderId !== deleteModal.itemId));
            if (currentFolder?.id === deleteModal.itemId) {
                setCurrentFolder(null);
            }
        } else {
            setNotes(notes.filter(n => n.id !== deleteModal.itemId));
            if (currentNote?.id === deleteModal.itemId) {
                setCurrentNote(null);
                setNoteContent('');
            }
        }
        setDeleteModal({ ...deleteModal, isOpen: false });
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
            <Sidebar onLogout={() => window.location.href = '/logout'} />

            <main className="flex-1 ml-20 p-6 transition-all duration-300">
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
                                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                        {currentNote ? currentNote.title : currentFolder ? currentFolder.name : 'Notes'}
                                    </h1>
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
                            </div>

                            {!currentNote && (
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder={currentFolder ? "Search notes..." : "Search notebooks..."}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all w-64 shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-center bg-card border border-input rounded-lg p-1 shadow-sm">
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
                                    <div className="flex gap-2">
                                        {!currentFolder && (
                                            <button
                                                onClick={handleCreateFolder}
                                                className="flex items-center gap-2 px-4 py-2 bg-card border border-input hover:bg-muted text-foreground rounded-lg transition-colors font-medium shadow-sm"
                                            >
                                                <FolderPlus size={18} />
                                                <span className="hidden sm:inline">New Notebook</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCreateNote}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 font-medium"
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
                        {currentNote ? (
                            <div className="h-full flex flex-col max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
                                    <MarkdownEditor
                                        key={currentNote.id}
                                        value={noteContent || currentNote.content}
                                        onChange={handleSaveNote}
                                        placeholder="Start typing your note here..."
                                        className="h-full min-h-[500px]"
                                    />
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
                        title={`Delete ${deleteModal.type === 'folder' ? 'Notebook' : 'Note'}`}
                        description={`Are you sure you want to delete "${deleteModal.itemName}"? This action cannot be undone.`}
                        itemType={deleteModal.type}
                    />
                </div>
            </main>
        </div>
    );
};

export default Notes;
