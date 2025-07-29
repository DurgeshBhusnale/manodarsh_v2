import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { authService } from '../services/authService';

// Define types
export interface User {
    force_id: string;
    role: 'soldier' | 'admin';
}

export interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

// Session timeout in milliseconds (15 minutes for enhanced security)
const SESSION_TIMEOUT = 15 * 60 * 1000;
const SESSION_KEY = 'user_session';
const TIMESTAMP_KEY = 'login_timestamp';
const WINDOW_ID_KEY = 'window_id';
const REFRESH_MARKER_KEY = 'page_refresh_marker';

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
        // Check if this is a page refresh
        const refreshMarker = sessionStorage.getItem(REFRESH_MARKER_KEY);
        const isPageRefresh = refreshMarker === 'true';
        
        // Clear the refresh marker
        sessionStorage.removeItem(REFRESH_MARKER_KEY);
        
        // Generate unique window ID for this session
        const currentWindowId = Date.now().toString();
        
        // Check session validity on initial load
        const savedUser = localStorage.getItem(SESSION_KEY);
        const loginTimestamp = localStorage.getItem(TIMESTAMP_KEY);
        const storedWindowId = localStorage.getItem(WINDOW_ID_KEY);
        
        if (savedUser && loginTimestamp) {
            const now = Date.now();
            const loginTime = parseInt(loginTimestamp);
            const timeSinceLastActivity = now - loginTime;
            
            if (isPageRefresh) {
                // Page refresh: logout only if inactive for more than 5 minutes
                if (timeSinceLastActivity > 5 * 60 * 1000) { // 5 minutes
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(TIMESTAMP_KEY);
                    localStorage.removeItem(WINDOW_ID_KEY);
                    return null;
                }
                // For refresh, keep the existing window ID
                return JSON.parse(savedUser);
            } else {
                // New window/tab: check full session timeout (15 minutes) OR missing window ID
                if (timeSinceLastActivity > SESSION_TIMEOUT || !storedWindowId) {
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(TIMESTAMP_KEY);
                    localStorage.removeItem(WINDOW_ID_KEY);
                    return null;
                }
            }
            
            // Store current window ID to track this specific session
            localStorage.setItem(WINDOW_ID_KEY, currentWindowId);
            return JSON.parse(savedUser);
        }
        
        return null;
    });

    // Auto-logout on session timeout (check every 30 seconds for faster detection)
    useEffect(() => {
        if (user) {
            const checkSession = () => {
                const loginTimestamp = localStorage.getItem(TIMESTAMP_KEY);
                if (loginTimestamp) {
                    const now = Date.now();
                    const loginTime = parseInt(loginTimestamp);
                    
                    if (now - loginTime > SESSION_TIMEOUT) {
                        logout();
                        // Redirect to login with session expired message
                        window.location.href = '/login?expired=timeout';
                    }
                }
            };

            // Check session every 30 seconds for faster response
            const interval = setInterval(checkSession, 30000);
            
            return () => clearInterval(interval);
        }
    }, [user]);

    // Handle page visibility change and browser close detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && user) {
                // User switched away from tab or minimized browser - start 5-minute logout timer
                setTimeout(() => {
                    // If still hidden after 5 minutes, force logout for security
                    if (document.visibilityState === 'hidden') {
                        logout();
                    }
                }, 5 * 60 * 1000); // 5 minutes = 300,000 milliseconds
            } else if (document.visibilityState === 'visible' && user) {
                // Check session when user returns to the tab
                const loginTimestamp = localStorage.getItem(TIMESTAMP_KEY);
                if (loginTimestamp) {
                    const now = Date.now();
                    const loginTime = parseInt(loginTimestamp);
                    
                    if (now - loginTime > SESSION_TIMEOUT) {
                        logout();
                        // Redirect to login with session expired message
                        window.location.href = '/login?expired=away';
                    }
                }
            }
        };

        // Auto-logout on browser close/navigate away (but NOT on refresh)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (user) {
                // Set refresh marker - if page reloads, this will be detected
                sessionStorage.setItem(REFRESH_MARKER_KEY, 'true');
                
                // Set a timeout to clear the marker if it's actually a close
                setTimeout(() => {
                    sessionStorage.removeItem(REFRESH_MARKER_KEY);
                    // Clear session data for actual browser close
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(TIMESTAMP_KEY);
                    localStorage.removeItem(WINDOW_ID_KEY);
                }, 100);
            }
        };

        // Auto-logout when page is unloaded (browser close, navigate away - but handle refresh differently)
        const handleUnload = () => {
            if (user) {
                // Check if this might be a refresh by checking navigation timing
                const navigation = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                const isRefresh = navigation?.type === 'reload';
                
                if (!isRefresh) {
                    // Force clear session data only if not a refresh
                    localStorage.clear();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('unload', handleUnload);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('unload', handleUnload);
        };
    }, [user]);

    // Extend session on user activity (only when window is active)
    useEffect(() => {
        const extendSession = () => {
            // Only extend session if user is logged in AND window is currently visible
            if (user && document.visibilityState === 'visible') {
                const now = Date.now();
                localStorage.setItem(TIMESTAMP_KEY, now.toString());
            }
        };

        // Listen for user activity only when window is active
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        // Throttle to avoid excessive updates (check every 30 seconds)
        let throttleTimer: NodeJS.Timeout | null = null;
        const throttledExtend = () => {
            if (throttleTimer || document.visibilityState !== 'visible') return;
            throttleTimer = setTimeout(() => {
                extendSession();
                throttleTimer = null;
            }, 30000); // Update at most once per 30 seconds
        };

        events.forEach(event => {
            document.addEventListener(event, throttledExtend, true);
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, throttledExtend, true);
            });
            if (throttleTimer) {
                clearTimeout(throttleTimer);
            }
        };
    }, [user]);

    // Remove the beforeunload warning since we want immediate logout

    const login = (userData: User) => {
        const now = Date.now();
        const windowId = Date.now().toString();
        setUser(userData);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        localStorage.setItem(TIMESTAMP_KEY, now.toString());
        localStorage.setItem(WINDOW_ID_KEY, windowId);
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            // Clear all session data immediately
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(TIMESTAMP_KEY);
            localStorage.removeItem(WINDOW_ID_KEY);
            // Also clear any other potential sensitive data
            localStorage.clear();
            // Force redirect to login
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
