import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define types
export interface User {
    force_id: string;
    role: 'soldier' | 'admin';
}

export interface AuthContextType {
    user: User | null;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

// Create the context with proper type
export const AuthContext = createContext<AuthContextType>({
    user: null,
    isSidebarOpen: false,
    toggleSidebar: () => {},
    login: () => {},
    logout: () => {},
    isAuthenticated: false
});

// Export the hook
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        // Check if user data exists in localStorage on initial load
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setIsSidebarOpen(false);
        localStorage.removeItem('user');
        // Additional cleanup if needed
    };

    return (
        <AuthContext.Provider value={{
            user,
            isSidebarOpen,
            toggleSidebar,
            login,
            logout,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Default export
export default AuthProvider;
