import axios from 'axios';

interface LoginResponse {
    user: {
        force_id: string;
        role: 'soldier' | 'admin';
    };
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

    logout(): void {
        // Clear any stored tokens/session data here
        localStorage.removeItem('auth_token');
    }
}

export const authService = new AuthService();
