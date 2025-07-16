import React from 'react';
import Modal from './Modal';

interface LoadingModalProps {
    isOpen: boolean;
    title: string;
    message: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
    isOpen,
    title,
    message
}) => {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => {}} // No close button for loading modal
            title={title}
            type="info"
            showCloseButton={false}
        >
            <div className="space-y-4 text-center">
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-gray-700">
                    {message}
                </p>
                <div className="text-sm text-gray-500">
                    Please wait while we process your request...
                </div>
            </div>
        </Modal>
    );
};

export default LoadingModal;
