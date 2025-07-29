import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Bars3Icon } from '@heroicons/react/24/outline';
import axios from 'axios';

const AddSoldier: React.FC = () => {
    const { isSidebarOpen, toggleSidebar } = useAuth();
    const [forceId, setForceId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | '' }>({
        text: '',
        type: '',
    });

    const handleCollectImages = async () => {
        if (!forceId) {
            setMessage({
                text: 'Please enter a Force ID first',
                type: 'error',
            });
            return;
        }

        // Validate force ID format
        if (!/^\d{9}$/.test(forceId)) {
            setMessage({
                text: 'Force ID must be 9 digits',
                type: 'error',
            });
            return;
        }

        setIsCollecting(true);
        setMessage({
            text: `Starting image collection...

Instructions:
1. A window will open with your camera feed
2. Follow the pose instructions shown on the window
3. Press 'S' key when ready to capture images for each pose
4. Press 'Q' key to quit the process

Please keep the window focused for key controls to work.`,
            type: 'info',
        });

        try {
            const response = await axios.post('http://localhost:5000/api/image/collect', {
                force_id: forceId
            });

            if (response.data.folder_path) {
                setMessage({
                    text: 'Images collected successfully! You can now proceed with adding the soldier.',
                    type: 'success',
                });
            } else {
                setMessage({
                    text: 'Image collection was cancelled. Please try again.',
                    type: 'error',
                });
            }
        } catch (error: any) {
            setMessage({
                text: error.response?.data?.error || 'Failed to collect images. Please try again.',
                type: 'error',
            });
        } finally {
            setIsCollecting(false);
        }
    };

    const handleTrainModel = async () => {
        setIsTraining(true);
        try {
            const response = await axios.post('http://localhost:5000/api/image/train');
            setMessage({
                text: 'Model training completed successfully!',
                type: 'success',
            });
        } catch (error: any) {
            setMessage({
                text: error.response?.data?.error || 'Failed to train model. Please try again.',
                type: 'error',
            });
        } finally {
            setIsTraining(false);
        }
    };

    const handleAddSoldier = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post('http://localhost:5000/api/auth/register', {
                force_id: forceId,
                password: password,
                user_type: 'soldier'
            });

            setMessage({
                text: 'Soldier added successfully!',
                type: 'success'
            });

            // Clear form
            setForceId('');
            setPassword('');
        } catch (error: any) {
            setMessage({
                text: error.response?.data?.error || 'Failed to add soldier. Please try again.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
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
                    <h1 className="text-lg font-semibold text-gray-900">Add Personnel</h1>
                    <div className="w-10"></div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="hidden md:block mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Personnel</h1>
                        <p className="text-gray-600">Register new soldier and collect biometric data</p>
                    </div>
            
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Add Soldier Form */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personnel Registration</h2>
                            <form onSubmit={handleAddSoldier}>
                                <div className="mb-6">
                                    <label className="block text-gray-700 mb-2 font-medium">
                                        Force ID
                                    </label>
                                    <input
                                        type="text"
                                        value={forceId}
                                        onChange={(e) => setForceId(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        required
                                        pattern="[0-9]{9}"
                                        title="Force ID must be 9 digits"
                                        placeholder="Enter 9-digit Force ID"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-gray-700 mb-2 font-medium">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        required
                                        disabled={isCollecting}
                                        placeholder="Create secure password"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={handleCollectImages}
                                        disabled={isCollecting}
                                        className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                            isCollecting 
                                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                                        }`}
                                    >
                                        {isCollecting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Collecting Images...
                                            </>
                                        ) : (
                                            'Collect Biometric Data'
                                        )}
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isLoading || isCollecting}
                                        className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                            isLoading || isCollecting
                                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                                        }`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Registering...
                                            </>
                                        ) : (
                                            'Register Personnel'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Model Training Section */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Model Training</h2>
                                <p className="text-gray-600 mb-6">Train the recognition model with new personnel data</p>
                                <button
                                    onClick={handleTrainModel}
                                    disabled={isTraining}
                                    className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                        isTraining
                                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                            : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    {isTraining ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Training Model...
                                        </>
                                    ) : (
                                        'Train Recognition Model'
                                    )}
                                </button>
                            </div>

                            {/* Status Messages */}
                            {message.text && (
                                <div className={`p-4 rounded-xl whitespace-pre-line border ${
                                    message.type === 'error' 
                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                        : message.type === 'info'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                    {message.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

export default AddSoldier;
