/**
 * Navigation utilities for consistent routing throughout the application
 */

export const navigateTo = (path: string, replace = false) => {
    if (replace) {
        window.location.replace(path);
    } else {
        window.location.href = path;
    }
};

export const redirectToLogin = () => {
    navigateTo('/login', true);
};

export const redirectToLogout = () => {
    navigateTo('/logout', true);
};

export const redirectToDashboard = () => {
    navigateTo('/dashboard', false);
};

export const redirectToExplore = () => {
    navigateTo('/explore', false);
};
