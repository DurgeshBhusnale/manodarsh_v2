import axios from 'axios';
import { getPhaseFeatures } from '../config/phaseConfig';

interface LoginResponse {
    user: {
        force_id: string;
        role: 'soldier' | 'admin';
    };
    message: string;
    session_timeout?: number;
    phase?: string;
}

interface SessionStatusResponse {
    valid: boolean;
    user?: {
        force_id: string;
        role: string;
    };
    expires_at?: string;
    message?: string;
    phase?: string;
}

interface SoldierVerificationResponse {
    verified: boolean;
    force_id: string;
    message: string;
}

class AuthService {
    private baseUrl = 'http://localhost:5000/api/auth';
    private sessionCheckInterval: NodeJS.Timeout | null = null;
    private phaseFeatures = getPhaseFeatures();

    constructor() {
        // Configure axios to include credentials for session cookies
        axios.defaults.withCredentials = true;
        console.log('🔐 AuthService initialized - Phase 1: Manual logout only');
    }

    async login(forceId: string, password: string): Promise<LoginResponse> {
        try {
            const response = await axios.post<LoginResponse>(`${this.baseUrl}/login`, {
                force_id: forceId,
                password: password
            });
            
            // PHASE 1: Do NOT start session monitoring
            if (this.phaseFeatures.SESSION_MONITORING) {
                console.log('Starting session monitoring (Phase 2)');
                this.startSessionMonitoring();
            } else {
                console.log('✅ Login successful - Session monitoring disabled (Phase 1)');
            }
            
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
            console.log('✅ Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.stopSessionMonitoring();
            this.clearLocalSession();
        }
    }

    async checkSessionStatus(): Promise<SessionStatusResponse> {
        try {
            const response = await axios.get<SessionStatusResponse>(`${this.baseUrl}/session-status`);
            return response.data;
        } catch (error: any) {
            return {
                valid: false,
                message: 'Session check failed'
            };
        }
    }

    // PHASE 1: Session monitoring disabled
    private startSessionMonitoring(): void {
        if (!this.phaseFeatures.SESSION_MONITORING) {
            console.log('⚠️ Session monitoring disabled in Phase 1');
            return;
        }
        
        // PHASE 2: Check session status every 30 seconds
        console.log('Starting session monitoring (Phase 2)');
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
            console.log('Session monitoring stopped');
        }
    }

    // PHASE 1: This should NOT be called automatically
    private handleSessionExpired(): void {
        console.warn('⚠️ Session expired handler called (should not happen in Phase 1)');
        this.stopSessionMonitoring();
        this.clearLocalSession();
        
        // PHASE 1: Do NOT auto-redirect
        if (!this.phaseFeatures.MANUAL_LOGOUT_ONLY) {
            // PHASE 2: Auto-redirect
            window.location.href = '/login';
            
            if (window.alert) {
                window.alert('Your session has expired. Please log in again.');
            }
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
