import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';

interface Question {
    id: number;
    question_text: string;
    question_text_hindi: string;
}

interface Questionnaire {
    id: number;
    title: string;
    description: string;
    total_questions: number;
}

const AdminSurveyPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    
    // Redirect if not authenticated or not admin
    React.useEffect(() => {
        if (!isAuthenticated || user?.role !== 'admin') {
            navigate('/login');
        }
    }, [isAuthenticated, user, navigate]);

    const [step, setStep] = useState<'credentials' | 'survey'>('credentials');
    const [soldierForceId, setSoldierForceId] = useState('');
    const [soldierPassword, setSoldierPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Survey data
    const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [responses, setResponses] = useState<{ [key: number]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    const handleSoldierVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Validate soldier force ID format
            if (!/^\d{9}$/.test(soldierForceId)) {
                setError('Soldier Force ID must be exactly 9 digits');
                return;
            }

            // Verify soldier credentials
            await apiService.verifySoldier(soldierForceId, soldierPassword);
            
            // Redirect to soldier survey page with credentials
            navigate('/soldier/survey', {
                state: {
                    force_id: soldierForceId,
                    password: soldierPassword
                }
            });
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Invalid soldier credentials');
            } else if (err.response?.status === 404) {
                setError('No active questionnaire found');
            } else {
                setError('Error verifying soldier credentials');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSurveySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Validate all questions are answered
            const unansweredQuestions = questions.filter(q => !responses[q.id]?.trim());
            if (unansweredQuestions.length > 0) {
                setError('Please answer all questions before submitting');
                return;
            }

            // Prepare survey data
            const surveyData = {
                questionnaire_id: questionnaire!.id,
                force_id: soldierForceId,
                password: soldierPassword,
                responses: questions.map(q => ({
                    question_id: q.id,
                    answer_text: responses[q.id]
                }))
            };

            await apiService.submitSurvey(surveyData);
            
            setModalTitle('Survey Submitted Successfully');
            setModalMessage('The survey has been submitted successfully! The responses have been recorded.');
            setShowSuccessModal(true);
            
        } catch (err: any) {
            setError('Error submitting survey. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResponseChange = (questionId: number, value: string) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleBackToCredentials = () => {
        setStep('credentials');
        setResponses({});
        setError('');
    };

    if (!isAuthenticated || user?.role !== 'admin') {
        return null; // Will redirect via useEffect
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm z-10">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                        <h1 className="text-lg font-semibold text-gray-900">
                            Soldier Survey Management
                        </h1>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                    <div className="max-w-2xl mx-auto py-6 px-4">
                        {step === 'credentials' ? (
                            <div className="bg-white p-8 rounded-lg shadow-md">
                                <h2 className="text-2xl font-bold mb-6 text-center">
                                    Soldier Verification
                                </h2>
                                
                                <div className="bg-blue-100 text-blue-800 p-3 rounded mb-4 text-sm">
                                    <strong>Instructions:</strong> Enter the soldier's credentials to start their survey session.
                                </div>
                                
                                {error && (
                                    <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSoldierVerification}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 mb-2">
                                            Soldier Force ID
                                        </label>
                                        <input
                                            type="text"
                                            value={soldierForceId}
                                            onChange={(e) => setSoldierForceId(e.target.value)}
                                            className="w-full p-2 border rounded"
                                            placeholder="Enter 9-digit Soldier Force ID"
                                            required
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-gray-700 mb-2">
                                            Soldier Password
                                        </label>
                                        <input
                                            type="password"
                                            value={soldierPassword}
                                            onChange={(e) => setSoldierPassword(e.target.value)}
                                            className="w-full p-2 border rounded"
                                            placeholder="Enter soldier's password"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 
                                            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isLoading ? 'Verifying...' : 'Start Survey'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold">
                                        {questionnaire?.title}
                                    </h2>
                                    <button
                                        onClick={handleBackToCredentials}
                                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                    >
                                        Back to Verification
                                    </button>
                                </div>
                                
                                <div className="bg-green-100 text-green-800 p-3 rounded mb-4 text-sm">
                                    <strong>Soldier:</strong> {soldierForceId} | <strong>Survey:</strong> {questionnaire?.description}
                                </div>
                                
                                {error && (
                                    <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSurveySubmit}>
                                    {questions.map((question, index) => (
                                        <div key={question.id} className="mb-6">
                                            <label className="block text-gray-700 font-medium mb-2">
                                                {index + 1}. {question.question_text}
                                            </label>
                                            {question.question_text_hindi && (
                                                <p className="text-gray-600 text-sm mb-2">
                                                    ({question.question_text_hindi})
                                                </p>
                                            )}
                                            <textarea
                                                value={responses[question.id] || ''}
                                                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                                                className="w-full p-3 border rounded-lg"
                                                rows={3}
                                                placeholder="Enter your response here..."
                                                required
                                            />
                                        </div>
                                    ))}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 
                                            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? 'Submitting Survey...' : 'Submit Survey'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal Components */}
            <Modal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    // Reset form after modal is closed
                    setStep('credentials');
                    setSoldierForceId('');
                    setSoldierPassword('');
                    setResponses({});
                    setQuestionnaire(null);
                    setQuestions([]);
                }}
                title={modalTitle}
                type="success"
            >
                <p className="text-gray-600">{modalMessage}</p>
            </Modal>
        </div>
    );
};

export default AdminSurveyPage;
