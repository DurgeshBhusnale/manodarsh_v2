import React, { createContext, useState, useContext, ReactNode } from 'react';
import { authService } from '../services/authService';

// Define types
export interface User {
    force_id: string;
    role: 'soldier' | 'admin';
}

export interface AuthContextType {
    user: User | null;
    login: (user: User, sessionTimeout?: number) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

// PHASE 1: Session timeout disabled - manual logout only
const SESSION_KEY = 'user_session';

// Create the context with proper type
export const AuthContext = createContext<AuthContextType>({
    user: null,
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
        // PHASE 1: Simple session restore - no timeout checking
        const savedUser = localStorage.getItem(SESSION_KEY);
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // PHASE 1: No session timeout checking - manual logout only

    const login = (userData: User, sessionTimeout?: number) => {
        // PHASE 1: Simple login - no session timeout tracking
        setUser(userData);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem(SESSION_KEY);
            localStorage.clear();
            window.location.replace('/login');
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
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
