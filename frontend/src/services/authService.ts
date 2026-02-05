import axios from 'axios';

interface LoginResponse {
    user: {
        force_id: string;
        role: 'soldier' | 'admin';
    };
    message: string;
    session_timeout?: number;
}

interface SessionStatusResponse {
    valid: boolean;
    user?: {
        force_id: string;
        role: string;
    };
    expires_at?: string;
    message?: string;
}

interface SoldierVerificationResponse {
    verified: boolean;
    force_id: string;
    message: string;
}

class AuthService {
    private baseUrl = 'http://localhost:5000/api/auth';
    private sessionCheckInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Configure axios to include credentials for session cookies
        axios.defaults.withCredentials = true;
    }

    async login(forceId: string, password: string): Promise<LoginResponse> {
        try {
            const response = await axios.post<LoginResponse>(`${this.baseUrl}/login`, {
                force_id: forceId,
                password: password
            });
            
            // Start session monitoring after successful login
            this.startSessionMonitoring();
            
            return response.data;
        } catch (error: any) {
            console.error('Login error:', error.response || error);
            if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            throw new Error('Login failed. Please try again.');
        }
    }

    async logout(): Promise<void> {
        try {
            await axios.post(`${this.baseUrl}/logout`);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.stopSessionMonitoring();
            this.clearLocalSession();
        }
    }

    async logoutAllSessions(): Promise<void> {
        try {
            await axios.post(`${this.baseUrl}/logout-all-sessions`);
        } catch (error) {
            console.error('Logout all sessions error:', error);
        } finally {
            this.stopSessionMonitoring();
            this.clearLocalSession();
            localStorage.clear(); // Clear everything including single-session key
        }
    }

    async checkSessionStatus(): Promise<SessionStatusResponse> {
        try {
            const response = await axios.get<SessionStatusResponse>(`${this.baseUrl}/session-status`);
            return response.data;
        } catch (error: any) {
            // Handle 401 responses (invalid/expired session)
            if (error.response?.status === 401) {
                return {
                    valid: false,
                    message: error.response?.data?.message || 'No active session'
                };
            }
            // Other errors
            return {
                valid: false,
                message: 'Session check failed'
            };
        }
    }

    private startSessionMonitoring(): void {
        // Check session status every 30 seconds
        this.sessionCheckInterval = setInterval(async () => {
            const status = await this.checkSessionStatus();
            if (!status.valid) {
                this.handleSessionExpired();
            }
        }, 30000);
    }

    private stopSessionMonitoring(): void {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    private handleSessionExpired(): void {
        this.stopSessionMonitoring();
        this.clearLocalSession();
        
        // Redirect to login page
        window.location.href = '/login';
        
        // Show notification if available
        if (window.alert) {
            window.alert('Your session has expired. Please log in again.');
        }
    }

    private clearLocalSession(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('login_timestamp');
    }

    async verifySoldier(forceId: string, password: string): Promise<SoldierVerificationResponse> {
        try {
            const response = await axios.post<SoldierVerificationResponse>(`${this.baseUrl}/verify-soldier`, {
                force_id: forceId,
                password: password
            });
            
            return response.data;
        } catch (error: any) {
            console.error('Soldier verification error:', error.response || error);
            if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            throw new Error('Soldier verification failed. Please try again.');
        }
    }
}

export const authService = new AuthService();
