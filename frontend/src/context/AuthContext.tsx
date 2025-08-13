import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
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

// Dynamic session timeout - will be set from backend response
let SESSION_TIMEOUT = 15 * 60 * 1000; // Default 15 minutes, will be updated from backend
const SESSION_KEY = 'user_session';
const TIMESTAMP_KEY = 'login_timestamp';
const SESSION_TIMEOUT_KEY = 'session_timeout';
const WINDOW_ID_KEY = 'window_id';
const REFRESH_MARKER_KEY = 'page_refresh_marker';

// Helper function to get current session timeout
const getCurrentSessionTimeout = (): number => {
    const storedTimeout = localStorage.getItem(SESSION_TIMEOUT_KEY);
    return storedTimeout ? parseInt(storedTimeout) * 1000 : SESSION_TIMEOUT; // Convert seconds to milliseconds
};

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
        // Check if this is a page refresh using multiple methods
        const refreshMarker = sessionStorage.getItem(REFRESH_MARKER_KEY);
        
        // Also check using Performance Navigation API
        const navigation = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const isPageRefreshByAPI = navigation?.type === 'reload';
        
        const isPageRefresh = refreshMarker === 'true' || isPageRefreshByAPI;
        
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
                // Page refresh: use the full session timeout, no special limit
                console.log('Detected page refresh - maintaining session');
                const currentSessionTimeout = getCurrentSessionTimeout();
                
                // Re-read timestamp in case it was updated by visibility change handler
                const currentTimestamp = localStorage.getItem(TIMESTAMP_KEY);
                const currentLoginTime = currentTimestamp ? parseInt(currentTimestamp) : loginTime;
                const currentTimeSinceActivity = now - currentLoginTime;
                
                if (currentTimeSinceActivity > currentSessionTimeout) {
                    console.log('Session expired during refresh - logging out');
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(TIMESTAMP_KEY);
                    localStorage.removeItem(SESSION_TIMEOUT_KEY);
                    localStorage.removeItem(WINDOW_ID_KEY);
                    return null;
                }
                // For refresh, update the timestamp to show current activity (user is back!)
                localStorage.setItem(TIMESTAMP_KEY, now.toString());
                
                // Keep existing window ID and update SESSION_TIMEOUT
                const storedTimeout = localStorage.getItem(SESSION_TIMEOUT_KEY);
                if (storedTimeout) {
                    SESSION_TIMEOUT = parseInt(storedTimeout) * 1000;
                }
                return JSON.parse(savedUser);
            } else {
                // New window/tab: check full session timeout (dynamic) OR missing window ID
                console.log('Detected new window/tab - checking session validity');
                const currentSessionTimeout = getCurrentSessionTimeout();
                if (timeSinceLastActivity > currentSessionTimeout || !storedWindowId) {
                    console.log('Session invalid for new window - logging out');
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(TIMESTAMP_KEY);
                    localStorage.removeItem(SESSION_TIMEOUT_KEY);
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

    // Auto-logout on session timeout (check every 2 minutes for reasonable detection)
    useEffect(() => {
        if (user) {
            const checkSession = () => {
                const loginTimestamp = localStorage.getItem(TIMESTAMP_KEY);
                if (loginTimestamp) {
                    const now = Date.now();
                    const loginTime = parseInt(loginTimestamp);
                    const currentSessionTimeout = getCurrentSessionTimeout();
                    
                    if (now - loginTime > currentSessionTimeout) {
                        logout();
                        // Redirect to login with session expired message
                        window.location.href = '/login?expired=timeout';
                    }
                }
            };

            // Check session every 2 minutes for reasonable response time
            const interval = setInterval(checkSession, 2 * 60 * 1000);
            
            return () => clearInterval(interval);
        }
    }, [user]);

    // Handle page visibility change and browser close detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                // User returned to the tab - check session and update timestamp
                const loginTimestamp = localStorage.getItem(TIMESTAMP_KEY);
                if (loginTimestamp) {
                    const now = Date.now();
                    const loginTime = parseInt(loginTimestamp);
                    const currentSessionTimeout = getCurrentSessionTimeout();
                    
                    if (now - loginTime > currentSessionTimeout) {
                        logout();
                        // Redirect to login with session expired message
                        window.location.href = '/login?expired=away';
                    } else {
                        // Session is still valid - update timestamp to show user is back and active
                        localStorage.setItem(TIMESTAMP_KEY, now.toString());
                    }
                }
            }
        };

        // Auto-logout on browser close/navigate away (but NOT on refresh)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (user) {
                // Set refresh marker - if page reloads, this will be detected
                sessionStorage.setItem(REFRESH_MARKER_KEY, 'true');
                
                // Set a longer timeout to clear the marker if it's actually a close
                // This gives enough time for page refresh to complete
                setTimeout(() => {
                    // Only clear if the refresh marker is still there (meaning page didn't reload)
                    const markerStillExists = sessionStorage.getItem(REFRESH_MARKER_KEY);
                    if (markerStillExists) {
                        sessionStorage.removeItem(REFRESH_MARKER_KEY);
                        // Clear session data for actual browser close
                        localStorage.removeItem(SESSION_KEY);
                        localStorage.removeItem(TIMESTAMP_KEY);
                        localStorage.removeItem(WINDOW_ID_KEY);
                    }
                }, 1000); // Increased from 100ms to 1000ms
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
        
        // Also listen for pageshow to handle browser back/forward cache
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && user) {
                // Page was loaded from cache (e.g., browser back/forward)
                // This is definitely not a logout scenario
                console.log('Page loaded from cache - maintaining session');
                const now = Date.now();
                localStorage.setItem(TIMESTAMP_KEY, now.toString());
            }
        };
        
        window.addEventListener('pageshow', handlePageShow);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('unload', handleUnload);
            window.removeEventListener('pageshow', handlePageShow);
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
        
        // Throttle to avoid excessive updates (but extend session IMMEDIATELY)
        let lastUpdate = 0;
        const throttledExtend = () => {
            if (document.visibilityState !== 'visible') return;
            
            const now = Date.now();
            // Only update if 30 seconds have passed since last update
            if (now - lastUpdate > 30000) {
                extendSession();
                lastUpdate = now;
            }
        };

        events.forEach(event => {
            document.addEventListener(event, throttledExtend, true);
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, throttledExtend, true);
            });
        };
    }, [user]);

    // Remove the beforeunload warning since we want immediate logout

    const login = (userData: User, sessionTimeout?: number) => {
        const now = Date.now();
        const windowId = Date.now().toString();
        setUser(userData);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        localStorage.setItem(TIMESTAMP_KEY, now.toString());
        localStorage.setItem(WINDOW_ID_KEY, windowId);
        
        // Store dynamic session timeout if provided
        if (sessionTimeout) {
            localStorage.setItem(SESSION_TIMEOUT_KEY, sessionTimeout.toString());
            SESSION_TIMEOUT = sessionTimeout * 1000; // Convert to milliseconds
        }
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
            localStorage.removeItem(SESSION_TIMEOUT_KEY);
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
