import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import InfoModal from '../../components/InfoModal';
import LoadingModal from '../../components/LoadingModal';
import ErrorModal from '../../components/ErrorModal';
import axios from 'axios';

const AddSoldier: React.FC = () => {
    const [forceId, setForceId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    
    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');

    const handleCollectImages = async () => {
        if (!forceId) {
            setModalTitle('Force ID Required');
            setModalMessage('Please enter a Force ID first');
            setShowErrorModal(true);
            return;
        }

        // Validate force ID format
        if (!/^\d{9}$/.test(forceId)) {
            setModalTitle('Invalid Force ID');
            setModalMessage('Force ID must be 9 digits');
            setShowErrorModal(true);
            return;
        }

        setIsCollecting(true);
        setModalTitle('Image Collection Started');
        setModalMessage(`Starting image collection...

Instructions:
1. A window will open with your camera feed
2. Follow the pose instructions shown on the window
3. Press 'S' key when ready to capture images for each pose
4. Press 'Q' key to quit the process

Please keep the window focused for key controls to work.`);
        setShowInfoModal(true);

        try {
            const response = await axios.post('http://localhost:5000/api/image/collect', {
                force_id: forceId
            });

            if (response.data.folder_path) {
                setModalTitle('Images Collected Successfully');
                setModalMessage('Images collected successfully! You can now proceed with adding the soldier.');
                setShowSuccessModal(true);
            } else {
                setModalTitle('Collection Cancelled');
                setModalMessage('Image collection was cancelled. Please try again.');
                setShowErrorModal(true);
            }
        } catch (error: any) {
            setModalTitle('Collection Error');
            setModalMessage(error.response?.data?.error || 'Failed to collect images. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsCollecting(false);
        }
    };

    const handleTrainModel = async () => {
        setIsTraining(true);
        try {
            const response = await axios.post('http://localhost:5000/api/image/train');
            setModalTitle('Training Complete');
            setModalMessage('Model training completed successfully!');
            setShowSuccessModal(true);
        } catch (error: any) {
            setModalTitle('Training Error');
            setModalMessage(error.response?.data?.error || 'Failed to train model. Please try again.');
            setShowErrorModal(true);
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

            setModalTitle('Soldier Added');
            setModalMessage('Soldier added successfully!');
            setShowSuccessModal(true);

            // Clear form
            setForceId('');
            setPassword('');
        } catch (error: any) {
            setModalTitle('Registration Error');
            setModalMessage(error.response?.data?.error || 'Failed to add soldier. Please try again.');
            setShowErrorModal(true);
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

        {/* Modal Components */}
        <Modal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            title={modalTitle}
            type="success"
        >
            <p className="text-gray-600">{modalMessage}</p>
        </Modal>

        <ErrorModal
            isOpen={showErrorModal}
            onClose={() => setShowErrorModal(false)}
            title={modalTitle}
            message={modalMessage}
            onRetry={() => setShowErrorModal(false)}
        />

        <InfoModal
            isOpen={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title={modalTitle}
            message={modalMessage}
        />

        <LoadingModal
            isOpen={showLoadingModal}
            title={modalTitle}
            message={modalMessage}
        />
    </div>
);
};

export default AddSoldier;
