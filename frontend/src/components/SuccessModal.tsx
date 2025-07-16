import React from 'react';
import Modal from './Modal';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    questionnaireName: string;
    questionCount: number;
    isActive: boolean;
    onContinue: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    title,
    questionnaireName,
    questionCount,
    isActive,
    onContinue
}) => {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            type="success"
            showCloseButton={false}
        >
            <div className="space-y-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-lg font-medium text-gray-800 mb-2">
                        Questionnaire "{questionnaireName}" has been created successfully!
                    </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Questionnaire Details:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                        <li className="flex justify-between">
                            <span>Total Questions:</span>
                            <span className="font-medium">{questionCount}</span>
                        </li>
                        <li className="flex justify-between">
                            <span>Status:</span>
                            <span className={`font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </li>
                        <li className="flex justify-between">
                            <span>Translation:</span>
                            <span className="font-medium text-blue-600">English & Hindi</span>
                        </li>
                    </ul>
                </div>

                <div className="text-center space-y-3">
                    <p className="text-sm text-gray-600">
                        Your questionnaire is ready for use! You can manage it from the admin dashboard.
                    </p>
                    
                    <div className="flex space-x-3 justify-center">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Stay Here
                        </button>
                        <button
                            onClick={onContinue}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                            <span>Go to Dashboard</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SuccessModal;
