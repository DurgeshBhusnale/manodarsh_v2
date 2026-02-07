import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { authService } from '../services/authService';
import { getPhaseFeatures } from '../config/phaseConfig';

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

// PHASE 1: Manual logout only + Single tab + Session clears on browser close
const SESSION_KEY = 'user_session';
const SESSION_ID_KEY = 'session_id';
const phaseFeatures = getPhaseFeatures();

// Use sessionStorage for browser close detection, localStorage for single tab
const storage = phaseFeatures.USE_SESSION_STORAGE ? sessionStorage : localStorage;

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
        console.log('🔐 AuthProvider initializing with Phase 1 settings');
        
        // PHASE 1: Restore session from sessionStorage (clears on browser close)
        const savedUser = storage.getItem(SESSION_KEY);
        const savedSessionId = storage.getItem(SESSION_ID_KEY);
        
        if (savedUser && savedSessionId) {
            // Check if this is the same session (single tab enforcement)
            if (phaseFeatures.MULTI_TAB_DETECTION) {
                const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
                if (currentSessionId && currentSessionId !== savedSessionId) {
                    console.warn('⚠️ Another tab has logged in, clearing this session');
                    storage.removeItem(SESSION_KEY);
                    storage.removeItem(SESSION_ID_KEY);
                    return null;
                }
            }
            return JSON.parse(savedUser);
        }
        return null;
    });

    // PHASE 1: Monitor for multi-tab conflicts
    useEffect(() => {
        if (!phaseFeatures.MULTI_TAB_DETECTION || !user) return;

        const handleStorageChange = (e: StorageEvent) => {
            // If session ID changed in localStorage, another tab logged in
            if (e.key === SESSION_ID_KEY && e.newValue !== storage.getItem(SESSION_ID_KEY)) {
                console.warn('⚠️ Session conflict detected - logging out this tab');
                setUser(null);
                storage.removeItem(SESSION_KEY);
                storage.removeItem(SESSION_ID_KEY);
                alert('You have been logged out because another session was started.');
                window.location.replace('/login');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [user]);

    const login = (userData: User, sessionTimeout?: number) => {
        console.log('✅ User login (Phase 1 - Manual logout, single tab, session storage)');
        
        // Generate unique session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store in sessionStorage (clears on browser close)
        setUser(userData);
        storage.setItem(SESSION_KEY, JSON.stringify(userData));
        storage.setItem(SESSION_ID_KEY, sessionId);
        
        // Store session ID in localStorage for multi-tab detection
        if (phaseFeatures.MULTI_TAB_DETECTION) {
            localStorage.setItem(SESSION_ID_KEY, sessionId);
        }
        
        // PHASE 2: Would start session monitoring here
        if (phaseFeatures.SESSION_MONITORING) {
            console.log('Starting session monitoring (Phase 2)');
        }
    };

    const logout = async () => {
        console.log('🚪 User logout (Manual)');
        
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear all session data
            setUser(null);
            storage.removeItem(SESSION_KEY);
            storage.removeItem(SESSION_ID_KEY);
            localStorage.removeItem(SESSION_ID_KEY);
            storage.clear();
            
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
