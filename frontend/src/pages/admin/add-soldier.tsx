import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';

const AddSoldier: React.FC = () => {
    const [forceId, setForceId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCollectImages = async () => {
        // TODO: Implement with actual API
        console.log('Collecting images...');
        // await api.post('/api/image/capture');
    };

    const handleTrainModel = async () => {
        // TODO: Implement with actual API
        console.log('Training model...');
        // await api.post('/api/image/train');
    };

    const handleAddSoldier = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // TODO: Implement with actual API
            console.log('Adding soldier...', { forceId, password });
            // await api.post('/api/admin/add-soldier', { force_id: forceId, password });
        } catch (error) {
            console.error('Failed to add soldier:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100">
                <h1 className="text-2xl font-bold mb-6">Add New Soldier</h1>
                
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
                            />
                        </div>

                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={handleCollectImages}
                                className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
                            >
                                Collect Images
                            </button>

                            <button
                                type="button"
                                onClick={handleTrainModel}
                                className="w-full bg-yellow-600 text-white p-2 rounded hover:bg-yellow-700"
                            >
                                Train Model
                            </button>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                            >
                                {isLoading ? 'Adding...' : 'Add Soldier'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddSoldier;