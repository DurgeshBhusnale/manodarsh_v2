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

    // ...existing code...

    // Redirect if already authenticated (admin)
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

    // Admin login submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Validate force ID format
            if (!/^\d{9}$/.test(forceId)) {
                setError('Force ID must be exactly 9 digits');
                setIsLoading(false);
                return;
            }

            const response = await apiService.login(forceId, password);
            if (response.user) {
                if (response.user.role === 'admin') {
                    // Pass the session timeout from backend response
                    login(response.user, response.session_timeout);
                    navigate('/admin/dashboard');
                } else {
                    setError('Access denied. Only administrators can login to this system.');
                }
            }
        } catch (err: any) {
            if (err.response?.status === 403) {
                setError('Access denied. Only administrators can login to this system.');
            } else {
                setError('Invalid credentials');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ...existing code...

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-green-50 to-blue-50 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute top-1/4 right-10 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-20 animate-bounce"></div>
                <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute bottom-10 right-1/3 w-16 h-16 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full opacity-20 animate-bounce"></div>
            </div>

            {/* Main Login Container */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
                    {/* Header Section */}
                    <div className="text-center mb-4">
                        <div className="mx-auto w-14 h-14 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                <i className="fas fa-shield-alt text-white text-lg"></i>
                            </div>
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 via-blue-600 to-green-600 bg-clip-text text-transparent mb-1">
                            Admin Login
                        </h1>
                        <p className="text-gray-600 text-xs">Central Reserve Police Force</p>
                    </div>

                    {/* Info Alert */}
                    <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start">
                        <i className="fas fa-info-circle text-blue-500 mr-2 text-sm mt-0.5"></i>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-0.5 text-xs">Administrator Access Only</h4>
                            <p className="text-gray-600 text-xs leading-tight">
                                This system is for administrators only.<br />
                                <span className="font-semibold text-gray-700">Users:</span> Please use the user login button below.
                            </p>
                        </div>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center">
                            <i className="fas fa-exclamation-triangle text-red-500 mr-2 text-sm"></i>
                            <span className="text-red-700 text-xs font-medium">{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                <i className="fas fa-id-badge mr-1 text-blue-500"></i>
                                Force ID
                            </label>
                            <input
                                type="text"
                                value={forceId}
                                onChange={(e) => setForceId(e.target.value)}
                                placeholder="Enter 9-digit Force ID"
                                required
                                className="w-full px-3 py-2.5 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                <i className="fas fa-lock mr-1 text-green-500"></i>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full px-3 py-2.5 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                    Logging in...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <i className="fas fa-shield-alt mr-2"></i>
                                    Login as Administrator
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Navigation Buttons */}
                    <div className="mt-4 space-y-2">
                        <button
                            onClick={() => navigate('/soldier/login')}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 text-sm"
                        >
                            <i className="fas fa-user-shield mr-2"></i>
                            For User Login, Click Here
                        </button>

                        <div className="text-center">
                            <a 
                                href="/" 
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors duration-200"
                            >
                                <i className="fas fa-arrow-left mr-1"></i>
                                Back to Home
                            </a>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                        <p className="text-xs text-gray-500">
                            Secure • Confidential • Professional Mental Health Support
                        </p>
                    </div>
                </div>
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
