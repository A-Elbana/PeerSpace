
export interface Folder {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    color?: string; // For folder icon color
    noteCount?: number;
}

export interface Note {
    id: string;
    folderId?: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export type ViewMode = 'grid' | 'list';
