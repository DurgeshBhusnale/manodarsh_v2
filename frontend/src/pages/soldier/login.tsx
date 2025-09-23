import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

const SoldierLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [soldierId, setSoldierId] = useState('');
    const [soldierPassword, setSoldierPassword] = useState('');
    const [soldierError, setSoldierError] = useState('');
    const [soldierLoading, setSoldierLoading] = useState(false);

    const handleSoldierLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSoldierError('');
        setSoldierLoading(true);
        
        try {
            // Validate format first
            if (!/^\d{9}$/.test(soldierId)) {
                setSoldierError('Force ID must be exactly 9 digits');
                setSoldierLoading(false);
                return;
            }
            if (!soldierPassword) {
                setSoldierError('Please enter your password');
                setSoldierLoading(false);
                return;
            }

            // AUTHENTICATION AT LOGIN: Verify soldier credentials immediately
            console.log('Authenticating soldier credentials...');
            const authResponse = await apiService.verifySoldier(soldierId, soldierPassword);
            
            if (authResponse.verified) {
                console.log('Soldier authentication successful:', authResponse);
                
                // Navigate to survey with authenticated credentials
                navigate('/soldier/survey', {
                    state: { 
                        force_id: soldierId, 
                        password: soldierPassword,
                        authenticated: true,
                        auth_timestamp: Date.now()
                    }
                });
            } else {
                setSoldierError('Invalid soldier credentials. Please check your Force ID and password.');
            }
            
        } catch (err: any) {
            console.error('Authentication error:', err);
            if (err.response?.data?.error) {
                setSoldierError(err.response.data.error);
            } else {
                setSoldierError('Authentication failed. Please check your credentials and try again.');
            }
        } finally {
            setSoldierLoading(false);
        }
    };

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
                            CRPF User Portal
                        </h1>
                        <p className="text-gray-600 text-xs">Enter your Force ID and password to access the mental health survey</p>
                    </div>

                    {/* Error Alert */}
                    {soldierError && (
                        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center">
                            <i className="fas fa-exclamation-triangle text-red-500 mr-2 text-sm"></i>
                            <span className="text-red-700 text-xs font-medium">{soldierError}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSoldierLogin} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                <i className="fas fa-id-badge mr-1 text-blue-500"></i>
                                Force ID
                            </label>
                            <input
                                type="text"
                                value={soldierId}
                                onChange={(e) => setSoldierId(e.target.value)}
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
                                value={soldierPassword}
                                onChange={(e) => setSoldierPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full px-3 py-2.5 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={soldierLoading}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                        >
                            {soldierLoading ? (
                                <span className="flex items-center justify-center">
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                    Verifying...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <i className="fas fa-clipboard-list mr-2"></i>
                                    Start Mental Health Survey
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Navigation Buttons */}
                    <div className="mt-6 space-y-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 text-sm"
                        >
                            <i className="fas fa-user-shield mr-2"></i>
                            Admin Login Portal
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
        </div>
    );
};

export default SoldierLoginPage;
