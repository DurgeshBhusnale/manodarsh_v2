import React from 'react';
import Sidebar from '../../components/Sidebar';

const DailyEmotionPage: React.FC = () => {
    return (
        <div className="flex h-screen bg-gradient-to-br from-orange-50 via-green-50 to-blue-50">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto relative">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 right-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-5 animate-pulse"></div>
                    <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-bounce"></div>
                    <div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse delay-1000"></div>
                </div>

                <div className="max-w-4xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl p-5 shadow-lg border border-white/20 mb-5">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-3">
                                <i className="fas fa-video text-blue-600 text-sm"></i>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-black">Daily Emotion Detection</h1>
                                <p className="text-gray-600 text-xs">CCTV-based emotion monitoring system</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Single Compact Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-5">
                        {/* Warning Section */}
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-l-4 border-yellow-400 mb-5">
                            <div className="flex items-start">
                                <i className="fas fa-exclamation-triangle text-yellow-600 mr-3 mt-0.5"></i>
                                <div className="flex-1">
                                    <h3 className="font-bold text-yellow-800 mb-2">Feature Temporarily Disabled</h3>
                                    <p className="text-yellow-700 text-sm mb-3">
                                        Daily CCTV emotion monitoring has been temporarily disabled to prevent camera access conflicts.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center">
                                            <i className="fas fa-check-circle text-green-600 mr-2"></i>
                                            <span><strong>Active:</strong> Survey emotion monitoring only</span>
                                        </div>
                                        <div className="flex items-center">
                                            <i className="fas fa-cogs text-blue-600 mr-2"></i>
                                            <span><strong>Reason:</strong> Optimizing camera access stability</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Available Features - Simple List */}
                        <div className="mb-4">
                            <h2 className="font-bold text-gray-800 mb-3 flex items-center">
                                <i className="fas fa-list-check text-blue-600 mr-2"></i>
                                Available Features
                            </h2>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-center">
                                    <i className="fas fa-smile text-green-600 mr-3"></i>
                                    <span className="flex-1">Survey emotion monitoring (active during user surveys)</span>
                                    <div className="flex items-center ml-2">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                        <span className="text-xs text-green-600 font-medium">ACTIVE</span>
                                    </div>
                                </li>
                                <li className="flex items-center">
                                    <i className="fas fa-user-check text-blue-600 mr-3"></i>
                                    <span className="flex-1">Face recognition training</span>
                                </li>
                                <li className="flex items-center">
                                    <i className="fas fa-camera text-purple-600 mr-3"></i>
                                    <span className="flex-1">Image collection for users</span>
                                </li>
                                <li className="flex items-center">
                                    <i className="fas fa-clipboard-list text-orange-600 mr-3"></i>
                                    <span className="flex-1">Questionnaire management</span>
                                </li>
                            </ul>
                        </div>

                        {/* Coming Soon - Compact Note */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center">
                                <i className="fas fa-rocket text-gray-600 mr-2 text-sm"></i>
                                <div>
                                    <span className="font-semibold text-gray-800 text-sm">Coming Soon: </span>
                                    <span className="text-gray-700 text-sm">Daily CCTV monitoring will be re-enabled after system optimization.</span>
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