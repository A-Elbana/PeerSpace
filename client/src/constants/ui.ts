/**
 * UI Configuration constants
 */

import type { ToasterProps } from 'sonner';

export const TOASTER_CONFIG: ToasterProps = {
    position: "top-right",
    richColors: true,
    closeButton: true,
    toastOptions: {
        style: {
            background: '#1a1a2e',
            border: '1px solid #2a2a4a',
            color: '#ffffff',
            padding: '16px 20px',
            fontSize: '15px',
            minWidth: '320px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
        },
        classNames: {
            success: 'bg-green-600 border-green-700 text-white',
            error: 'bg-red-600 border-red-700 text-white',
            warning: 'bg-yellow-600 border-yellow-700 text-white',
            info: 'bg-blue-600 border-blue-700 text-white',
        },
    },
};

export const PAGE_TITLES = {
    LOGIN: 'PeerSpace - Login',
    DASHBOARD: 'PeerSpace - Dashboard',
    EXPLORE: 'PeerSpace - Explore',
    SETTINGS: 'PeerSpace - Settings',
    NOTES: 'PeerSpace - Notes',
    NOTIFICATIONS: 'PeerSpace - Notifications',
    ANNOUNCEMENTS: 'PeerSpace - Announcements',
    COMMUNITY: 'PeerSpace - Community',
    MANAGE_COMMUNITY: 'PeerSpace - Manage Community',
} as const;
