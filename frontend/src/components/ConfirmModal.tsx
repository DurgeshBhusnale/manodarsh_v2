import React from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'error' | 'info';
    icon?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    icon
}) => {
    const getDefaultIcon = () => {
        switch (type) {
            case 'error':
                return '🚨';
            case 'warning':
                return '⚠️';
            default:
                return '❓';
        }
    };

    const getConfirmButtonStyle = () => {
        switch (type) {
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
                
                <div className="flex space-x-3 justify-center pt-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 text-white rounded-lg transition-colors ${getConfirmButtonStyle()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
