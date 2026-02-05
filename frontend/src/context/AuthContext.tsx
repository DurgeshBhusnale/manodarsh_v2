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

// Session key for in-tab auth restoration only
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
                const hasClientSession = sessionStorage.getItem(SESSION_KEY);
                if (!hasClientSession) {
                    setUser(null);
                    setIsValidating(false);
                    return;
                }

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
                    sessionStorage.removeItem(SESSION_KEY);
                }
            } catch (error) {
                console.error('Session validation error:', error);
                // On error, clear session
                setUser(null);
                sessionStorage.removeItem(SESSION_KEY);
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
        // Store client session to allow in-tab restore
        sessionStorage.setItem(SESSION_KEY, 'active');
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
            sessionStorage.removeItem(SESSION_KEY);
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
                sessionStorage.removeItem(SESSION_KEY);
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
