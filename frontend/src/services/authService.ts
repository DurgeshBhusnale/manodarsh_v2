import axios from 'axios';

interface LoginResponse {
    user: {
        force_id: string;
        role: 'soldier' | 'admin';
    };
    message: string;
}

interface SoldierVerificationResponse {
    verified: boolean;
    force_id: string;
    message: string;
}

class AuthService {
    private baseUrl = 'http://localhost:5000/api/auth';  // Using explicit backend URL

    async login(forceId: string, password: string): Promise<LoginResponse> {
        try {
            const response = await axios.post<LoginResponse>(`${this.baseUrl}/login`, {
                force_id: forceId,
                password: password
            });
            
            return response.data;
        } catch (error: any) {
            console.error('Login error:', error.response || error); // Better error logging
            if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            throw new Error('Login failed. Please try again.');
        }
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

    logout(): void {
        // Clear any stored tokens/session data here
        localStorage.removeItem('auth_token');
    }
}

export const authService = new AuthService();
