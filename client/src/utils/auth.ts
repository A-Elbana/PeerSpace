export const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
};

export const getAccessToken = (): string | null => {
    return localStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken');
};

export const removeTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
};

export const isAuthenticated = (): boolean => {
    return !!getAccessToken();
};

export const logout = () => {
    removeTokens();
    // Optional: You might want to clear other app state or redirect here
};
