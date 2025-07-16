import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import InfoModal from '../components/InfoModal';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isAuthenticated, user } = useAuth();
    const [forceId, setForceId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Modal states
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            navigate('/admin/dashboard');
        }
    }, [isAuthenticated, user, navigate]);

    // Handle session expiry messages
    useEffect(() => {
        const expired = searchParams.get('expired');
        if (expired === 'timeout') {
            setModalTitle('Session Expired');
            setModalMessage('Your session expired after 15 minutes of inactivity. Please login again.');
            setShowInfoModal(true);
        } else if (expired === 'away') {
            setModalTitle('Session Expired');
            setModalMessage('Your session expired while you were away. Please login again.');
            setShowInfoModal(true);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Validate force ID format
            if (!/^\d{9}$/.test(forceId)) {
                setError('Force ID must be exactly 9 digits');
                return;
            }

            const response = await apiService.login(forceId, password);
            
            if (response.user) {
                // Only admins can login - this should always be admin now
                if (response.user.role === 'admin') {
                    login(response.user);
                    navigate('/admin/dashboard');
                } else {
                    setError('Access denied. Only administrators can login to this system.');
                }
            }
        } catch (err: any) {
            // Handle the specific 403 error for soldier login attempts
            if (err.response?.status === 403) {
                setError('Access denied. Only administrators can login to this system.');
            } else {
                setError('Invalid credentials');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">
                    CRPF Admin Login
                </h1>
                
                <div className="bg-blue-100 text-blue-800 p-3 rounded mb-4 text-sm">
                    <strong>Note:</strong> This system is for administrators only. 
                    Soldiers can access questionnaires directly via the survey page.
                </div>
                
                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">
                            Force ID
                        </label>
                        <input
                            type="text"
                            value={forceId}
                            onChange={(e) => setForceId(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Enter 9-digit Force ID"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 
                            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>

            {/* Modal Components */}
            <InfoModal
                isOpen={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title={modalTitle}
                message={modalMessage}
            />
        </div>
    );
};

export default LoginPage;
