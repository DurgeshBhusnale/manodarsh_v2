import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import axios from 'axios';

const AddSoldier: React.FC = () => {
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
    <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8 bg-gray-100">
            <h1 className="text-2xl font-bold mb-6">Add New Soldier</h1>
            
            <div className="space-y-6">
                {/* Add Soldier Form */}
                <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
                    <form onSubmit={handleAddSoldier}>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">
                                Force ID
                            </label>
                            <input
                                type="text"
                                value={forceId}
                                onChange={(e) => setForceId(e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                                pattern="[0-9]{9}"
                                title="Force ID must be 9 digits"
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
                                required
                                disabled={isCollecting}
                            />
                        </div>

                        {message.text && (
                            <div className={`p-4 mb-4 rounded whitespace-pre-line ${
                                message.type === 'error' 
                                    ? 'bg-red-100 text-red-700' 
                                    : message.type === 'info'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                            }`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={handleCollectImages}
                                disabled={isCollecting}
                                className={`w-full ${
                                    isCollecting 
                                        ? 'bg-gray-400' 
                                        : 'bg-green-600 hover:bg-green-700'
                                } text-white p-2 rounded transition-colors`}
                            >
                                {isCollecting ? 'Collecting Images...' : 'Collect Images'}
                            </button>

                            <button
                                type="submit"
                                disabled={isLoading || isCollecting}
                                className={`w-full ${
                                    isLoading || isCollecting
                                        ? 'bg-gray-400' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                } text-white p-2 rounded transition-colors`}
                            >
                                {isLoading ? 'Adding...' : 'Add Soldier'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Train Model Button (Outside Form) */}
                <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
                    <h2 className="text-lg font-semibold mb-4">Model Training</h2>
                    <button
                        onClick={handleTrainModel}
                        disabled={isTraining}
                        className={`w-full ${
                            isTraining
                                ? 'bg-gray-400'
                                : 'bg-yellow-600 hover:bg-yellow-700'
                        } text-white p-2 rounded transition-colors`}
                    >
                        {isTraining ? 'Training Model...' : 'Train Model'}
                    </button>
                </div>
            </div>  {/* Missing closing bracket for space-y-6 div */}
        </div>
    </div>
);
};

export default AddSoldier;
