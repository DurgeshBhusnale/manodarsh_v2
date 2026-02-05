import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { authService } from '../services/authService';
import { heartbeatService } from '../services/heartbeatService';

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
    isValidating: boolean;
}

// Session key for single-session enforcement only (not for auth)
const SESSION_KEY = 'user_session';

// Create the context with proper type
export const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {},
    isAuthenticated: false,
    isValidating: true
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
    const [user, setUser] = useState<User | null>(null);
    const [isValidating, setIsValidating] = useState(true);

    // Validate session with backend on mount
    useEffect(() => {
        const validateSession = async () => {
            try {
                const status = await authService.checkSessionStatus();
                
                if (status.valid && status.user) {
                    // Backend session is valid - restore user
                    const userData = {
                        force_id: status.user.force_id,
                        role: status.user.role as 'soldier' | 'admin'
                    };
                    setUser(userData);
                    // Start heartbeat for restored session
                    heartbeatService.start();
                } else {
                    // Backend session invalid - clear everything
                    setUser(null);
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.clear();
                }
            } catch (error) {
                console.error('Session validation error:', error);
                // On error, clear session
                setUser(null);
                localStorage.removeItem(SESSION_KEY);
                localStorage.clear();
            } finally {
                setIsValidating(false);
            }
        };

        validateSession();
    }, []);

    const login = (userData: User, sessionTimeout?: number) => {
        setUser(userData);
        // Start heartbeat service when user logs in
        heartbeatService.start();
        // Note: We don't store auth in localStorage anymore
        // Only backend session is the source of truth
    };

    const logout = async () => {
        try {
            // Stop heartbeat before logout
            heartbeatService.stop();
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

    // Handle browser close/refresh - notify backend
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (user) {
                // Notify backend that browser is closing
                heartbeatService.notifyBrowserClosing();
                // Clear local storage
                localStorage.clear();
                sessionStorage.clear();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
            isValidating
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Default export
export default AuthProvider;
