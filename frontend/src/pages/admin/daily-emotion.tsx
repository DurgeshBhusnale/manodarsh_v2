import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';

const DailyEmotionPage: React.FC = () => {
    const { isSidebarOpen, toggleSidebar } = useAuth();
    const [selectedDate, setSelectedDate] = useState('');
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleStartMonitoring = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            await apiService.startDailyMonitoring(selectedDate);
            setIsMonitoring(true);
            setError('');
        } catch (error: any) {
            console.error('Failed to start monitoring:', error);
            setError(error.response?.data?.error || 'Failed to start monitoring');
            setIsMonitoring(false);
        } finally {
            setLoading(false);
        }
    };

    const handleEndMonitoring = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            await apiService.endDailyMonitoring(selectedDate);
            setIsMonitoring(false);
        } catch (error) {
            console.error('Failed to end monitoring:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={isSidebarOpen} onClose={() => toggleSidebar()} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile header */}
                <div className="md:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
                            aria-label="Open navigation menu"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">Emotion Monitor</h1>
                        <div className="w-10"></div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="hidden md:block mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Emotion Monitoring</h1>
                            <p className="text-gray-600">Real-time emotion detection and analysis system</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Control Panel */}
                            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Monitoring Control</h2>
                                
                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                        <div className="flex items-center">
                                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {error}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <label className="block text-gray-700 mb-2 font-medium">
                                        Select Monitoring Date
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => {
                                            setSelectedDate(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleStartMonitoring}
                                        disabled={!selectedDate || isMonitoring || loading}
                                        className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                                            !selectedDate || isMonitoring
                                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                                        }`}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                                                </svg>
                                                Start Monitoring
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleEndMonitoring}
                                        disabled={!selectedDate || !isMonitoring || loading}
                                        className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                                            !selectedDate || !isMonitoring
                                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                                        }`}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                                </svg>
                                                End Monitoring
                                            </>
                                        )}
                                    </button>
                                </div>

                                {isMonitoring && (
                                    <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                                            <span className="font-medium">Monitoring Active</span>
                                        </div>
                                        <p className="text-sm mt-1 ml-6">Date: {selectedDate}</p>
                                    </div>
                                )}
                            </div>

                            {/* Status Panel */}
                            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6">System Status</h2>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Camera System</span>
                                        <span className="flex items-center text-green-600">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                            Online
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Recognition Model</span>
                                        <span className="flex items-center text-green-600">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                            Ready
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Database Connection</span>
                                        <span className="flex items-center text-green-600">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                            Connected
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Last Detection</span>
                                        <span className="text-gray-600">2 minutes ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyEmotionPage;