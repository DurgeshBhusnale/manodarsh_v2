import React from 'react';
import Modal from './Modal';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    icon?: string;
    buttonText?: string;
}

const InfoModal: React.FC<InfoModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    icon,
    buttonText = 'OK'
}) => {
    const getDefaultIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };

    const getButtonStyle = () => {
        switch (type) {
            case 'success':
                return 'bg-green-600 hover:bg-green-700';
            case 'error':
                return 'bg-red-600 hover:bg-red-700';
            case 'warning':
                return 'bg-yellow-600 hover:bg-yellow-700';
            default:
                return 'bg-blue-600 hover:bg-blue-700';
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            type={type}
            showCloseButton={false}
        >
            <div className="space-y-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">{icon || getDefaultIcon()}</div>
                    <p className="text-gray-700 text-lg">
                        {message}
                    </p>
                </div>
                
                <div className="flex justify-center pt-4">
                    <button
                        onClick={onClose}
                        className={`px-8 py-2 text-white rounded-lg transition-colors ${getButtonStyle()}`}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default InfoModal;
