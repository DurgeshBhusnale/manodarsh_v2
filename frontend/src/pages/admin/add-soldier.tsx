import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import InfoModal from '../../components/InfoModal';
import LoadingModal from '../../components/LoadingModal';
import ErrorModal from '../../components/ErrorModal';
import { apiService } from '../../services/api';

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
            const response = await apiService.collectImages(forceId);
            if (response.data.folder_path) {
                setModalTitle('Images Collected Successfully');
                setModalMessage('Images collected successfully! You can now proceed with adding the user.');
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
            const response = await apiService.trainModel(forceId);
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
            const response = await apiService.addSoldier({
                force_id: forceId,
                password: password
            });

            setModalTitle('User Added');
            setModalMessage('User added successfully!');
            setShowSuccessModal(true);

            // Clear form
            setForceId('');
            setPassword('');
        } catch (error: any) {
            setModalTitle('Registration Error');
            setModalMessage(error.response?.data?.error || 'Failed to add user. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

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
                                <i className="fas fa-user-plus text-blue-600 text-sm"></i>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-black">Add New User</h1>
                                <p className="text-gray-600 text-xs">Register a new user in the CRPF system</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Add User Form */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/20">
                            <div className="flex items-center mb-5">
                                <i className="fas fa-id-card text-lg text-blue-600 mr-2"></i>
                                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">User Registration</h2>
                            </div>
                            
                            <form onSubmit={handleAddSoldier} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                        <i className="fas fa-fingerprint mr-2 text-orange-500"></i>
                                        Force ID
                                    </label>
                                    <input
                                        type="text"
                                        value={forceId}
                                        onChange={(e) => setForceId(e.target.value)}
                                        required
                                        pattern="[0-9]{9}"
                                        title="Force ID must be 9 digits"
                                        disabled={isCollecting}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="Enter 9-digit Force ID"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                        <i className="fas fa-lock mr-2 text-green-500"></i>
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isCollecting}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="Enter secure password"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={handleCollectImages}
                                        disabled={isCollecting}
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                                    >
                                        <i className={`fas ${isCollecting ? 'fa-spinner fa-spin' : 'fa-camera'} mr-2`}></i>
                                        {isCollecting ? 'Collecting Images...' : 'Collect Images'}
                                    </button>
                                    
                                    <button
                                        type="submit"
                                        disabled={isLoading || isCollecting}
                                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                                    >
                                        <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-user-plus'} mr-2`}></i>
                                        {isLoading ? 'Adding User...' : 'Add User'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Model Training Section */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/20">
                            <div className="flex items-center mb-5">
                                <i className="fas fa-brain text-lg text-purple-600 mr-2"></i>
                                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">Model Training</h2>
                            </div>
                            
                            <div className="mb-4">
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Train the facial recognition model once you added the users. 
                                    This process helps the system recognize users during monitoring.
                                </p>
                            </div>

                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 mb-4 border border-yellow-200">
                                <div className="flex items-start">
                                    <i className="fas fa-info-circle text-yellow-600 mr-3 mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-yellow-800 mb-1">Training Instructions</h4>
                                        <ul className="text-sm text-yellow-700 space-y-1">
                                            <li>• Ensure all user images are collected</li>
                                            <li>• Training may take several minutes</li>
                                            <li>• Do not close the application during training</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleTrainModel}
                                disabled={isTraining}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-4 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                            >
                                <i className={`fas ${isTraining ? 'fa-spinner fa-spin' : 'fa-cogs'} mr-2`}></i>
                                {isTraining ? 'Training Model...' : 'Train Model'}
                            </button>
                        </div>
                    </div>
                </div>
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
