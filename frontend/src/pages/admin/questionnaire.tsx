import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import LoadingModal from '../../components/LoadingModal';
import { apiService} from '../../services/api';

interface Questionnaire {
    id: number;
    title: string;
    description: string;
    status: string;
    total_questions: number;
    created_at: string;
}

interface QuestionnaireDetails extends Questionnaire {
    questions: Array<{
        id: number;
        question_text: string;
        question_text_hindi: string;
        created_at: string;
    }>;
}

const QuestionnairePage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    // Each question is { english: string, hindi: string }
    const [questions, setQuestions] = useState<{ english: string; hindi: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questionText, setQuestionText] = useState('');
    const [questionTextHindi, setQuestionTextHindi] = useState('');
    const [translating, setTranslating] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [allQuestionsEntered, setAllQuestionsEntered] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
    const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(false);
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<QuestionnaireDetails | null>(null);
    const [showQuestionnaireDetails, setShowQuestionnaireDetails] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Fetch questionnaires on component mount
    useEffect(() => {
        fetchQuestionnaires();
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showQuestionnaireDetails) {
                handleBackToList();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showQuestionnaireDetails]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showQuestionnaireDetails) {
                handleBackToList();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showQuestionnaireDetails]);

    const fetchQuestionnaires = async () => {
        setLoadingQuestionnaires(true);
        try {
            console.log('Fetching questionnaires...');
            const response = await apiService.getQuestionnaires();
            console.log('API Response:', response);
            console.log('Questionnaires data:', response.data);
            setQuestionnaires(response.data.questionnaires);
            console.log('Set questionnaires:', response.data.questionnaires);
        } catch (error) {
            console.error('Failed to fetch questionnaires:', error);
            // Show error message to user
            setErrorMessage('Failed to load questionnaires. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoadingQuestionnaires(false);
        }
    };

    const handleQuestionnaireClick = async (questionnaireId: number) => {
        setLoadingDetails(true);
        try {
            const response = await apiService.getQuestionnaireDetails(questionnaireId);
            setSelectedQuestionnaire(response.data.questionnaire);
            setShowQuestionnaireDetails(true);
        } catch (error) {
            console.error('Failed to fetch questionnaire details:', error);
            setErrorMessage('Failed to load questionnaire details. Please try again.');
            setShowErrorModal(true);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleBackToList = () => {
        setShowQuestionnaireDetails(false);
        setSelectedQuestionnaire(null);
    };

    // Sort questionnaires to show active ones first
    const sortedQuestionnaires = [...questionnaires].sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (a.status !== 'Active' && b.status === 'Active') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const handleCreateQuestionnaire = async (e: React.FormEvent) => {
        e.preventDefault();
        if (numberOfQuestions <= 0) {
            setErrorMessage('Please enter the number of questions');
            setShowErrorModal(true);
            return;
        }
        try {
            // Initialize questions array with empty objects
            setQuestions(Array(numberOfQuestions).fill({ english: '', hindi: '' }));
            setStep(2);
        } catch (error) {
            console.error('Failed to initialize questionnaire:', error);
        }
    };

    // Translate and add question
    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!questionText.trim()) return;

        setTranslating(true);
        try {
            // Translate to Hindi
            const res = await apiService.translateQuestion(questionText);
            const hindi = res.data.hindi_text;
            setQuestionTextHindi(hindi);

            // Save both English and Hindi in questions array
            const updatedQuestions = [...questions];
            updatedQuestions[currentQuestionIndex] = { english: questionText, hindi };
            setQuestions(updatedQuestions);

            if (!isEditMode && currentQuestionIndex < numberOfQuestions - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setQuestionText(questions[currentQuestionIndex + 1]?.english || '');
                setQuestionTextHindi(questions[currentQuestionIndex + 1]?.hindi || '');
            } else {
                setIsEditMode(false);
            }

            // Check if all questions are entered
            if (currentQuestionIndex === numberOfQuestions - 1) {
                setAllQuestionsEntered(true);
            }
        } catch (error) {
            console.error('Failed to add question:', error);
        } finally {
            setTranslating(false);
        }
    };

    const handleSaveQuestionnaire = async () => {
        setLoading(true);
        try {
            console.log('Creating questionnaire with data:', {
                title,
                description,
                isActive,
                numberOfQuestions
            });
            
            // First create the questionnaire
            const questionnaireResponse = await apiService.createQuestionnaire({
                title,
                description,
                isActive,
                numberOfQuestions
            });

            console.log('Questionnaire creation response:', questionnaireResponse);
            console.log('Response data:', questionnaireResponse.data);

            const questionnaireId = questionnaireResponse.data.id;
            console.log('Extracted questionnaire ID:', questionnaireId);

            if (!questionnaireId) {
                throw new Error('No questionnaire ID returned from server');
            }

            // Then add all questions
            console.log('Adding questions:', questions);
            for (const q of questions) {
                const questionResponse = await apiService.addQuestion({
                    questionnaire_id: questionnaireId,
                    question_text: q.english,
                    question_text_hindi: q.hindi
                });
                console.log('Question added:', questionResponse);
            }

            // Show custom success modal instead of alert
            setShowSuccessModal(true);
            // Refresh questionnaires list
            fetchQuestionnaires();
        } catch (error: any) {
            console.error('Failed to save questionnaire:', error);
            console.error('Error details:', error.response?.data);
            setErrorMessage('Failed to save questionnaire. Please check your connection and try again.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            setQuestionText(questions[currentQuestionIndex - 1]?.english || '');
            setQuestionTextHindi(questions[currentQuestionIndex - 1]?.hindi || '');
            setIsEditMode(true);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < numberOfQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setQuestionText(questions[currentQuestionIndex + 1]?.english || '');
            setQuestionTextHindi(questions[currentQuestionIndex + 1]?.hindi || '');
            setIsEditMode(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setTitle('');
        setDescription('');
        setQuestions([]);
        setNumberOfQuestions(0);
        setCurrentQuestionIndex(0);
        setQuestionText('');
        setQuestionTextHindi('');
        setIsEditMode(false);
        setAllQuestionsEntered(false);
        setShowSuccessModal(false);
        setShowErrorModal(false);
        setErrorMessage('');
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
    };

    const handleModalContinue = () => {
        setShowSuccessModal(false);
        handleReset();
        fetchQuestionnaires(); // Refresh the questionnaires list
        // Stay on the questionnaire page to show the updated list
    };

    const handleErrorModalClose = () => {
        setShowErrorModal(false);
        setErrorMessage('');
    };

    const handleRetryQuestionnaire = () => {
        setShowErrorModal(false);
        setErrorMessage('');
        handleSaveQuestionnaire();
    };

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
                <div className="p-8 pb-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold mb-6">
                        Questionnaire Management
                    </h1>
                </div>
                <div className="flex-1 px-8 pb-8 overflow-y-auto">

                {step === 1 ? (
                    <>
                        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
                            <h2 className="text-xl mb-4">Create New Questionnaire</h2>
                        <form onSubmit={handleCreateQuestionnaire}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">
                                    Number of Questions
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={numberOfQuestions}
                                    onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="flex items-center text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="mr-2"
                                    />
                                    Make Questionnaire Active
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                            >
                                Continue to Add Questions
                            </button>
                        </form>
                    </div>
                    
                    {/* Questionnaires List */}
                    <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Existing Questionnaires</h2>
                            <p className="text-sm text-gray-600">
                                💡 Click on any questionnaire to view details
                            </p>
                        </div>
                        
                        <p className="text-gray-500 text-sm mb-4">💡 Click on any questionnaire row to view detailed information</p>
                        
                        {loadingQuestionnaires ? (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : questionnaires.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No questionnaires found</p>
                        ) : (
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <table className="w-full border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-4 py-2 text-left">Title</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Questions</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedQuestionnaires.map((questionnaire) => (
                                            <tr 
                                                key={questionnaire.id} 
                                                className={`cursor-pointer transition-colors duration-200 ${
                                                    questionnaire.status === 'Active' 
                                                        ? 'bg-green-50 hover:bg-green-100 border-green-200' 
                                                        : 'hover:bg-gray-50'
                                                }`}
                                                onClick={() => handleQuestionnaireClick(questionnaire.id)}
                                            >
                                                <td className="border border-gray-300 px-4 py-2 font-medium">
                                                    <div className="flex items-center">
                                                        {questionnaire.status === 'Active' && (
                                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                        )}
                                                        {questionnaire.title}
                                                    </div>
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    <div className="max-w-xs truncate" title={questionnaire.description}>
                                                        {questionnaire.description}
                                                    </div>
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        questionnaire.status === 'Active' 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {questionnaire.status}
                                                    </span>
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">
                                                    {questionnaire.total_questions}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                                                    {new Date(questionnaire.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    </>
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-2">Add Questions</h2>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-gray-600">
                                    Question {currentQuestionIndex + 1} of {numberOfQuestions}
                                </p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handlePreviousQuestion}
                                        disabled={currentQuestionIndex === 0}
                                        className={`px-4 py-2 rounded ${
                                            currentQuestionIndex === 0
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={handleNextQuestion}
                                        disabled={currentQuestionIndex === numberOfQuestions - 1 || !questions[currentQuestionIndex]}
                                        className={`px-4 py-2 rounded ${
                                            currentQuestionIndex === numberOfQuestions - 1 || !questions[currentQuestionIndex]
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${((currentQuestionIndex + 1) / numberOfQuestions) * 100}%` }}
                                />
                            </div>
                        </div>
                        
                        {questions.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Questions Added:</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <tbody>
                                            {questions.map((q, index) => (
                                                <tr 
                                                    key={index}
                                                    className={`border-b last:border-b-0 ${
                                                        index === currentQuestionIndex
                                                            ? 'bg-blue-50'
                                                            : 'bg-white hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <td className="py-2 px-3 text-sm">
                                                        <span className="font-medium text-gray-600">Q{index + 1}:</span>
                                                    </td>
                                                    <td className="py-2 px-3 text-sm text-gray-600">
                                                        {q && q.english ? (
                                                            <div className="line-clamp-1">{q.english}</div>
                                                        ) : (
                                                            <span className="text-gray-400">(Not added yet)</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 w-16 text-right">
                                                        {q && (
                                                            <button
                                                                onClick={() => {
                                                                    setCurrentQuestionIndex(index);
                                                                    setQuestionText(q.english);
                                                                    setQuestionTextHindi(q.hindi);
                                                                    setIsEditMode(true);
                                                                }}
                                                                className="text-xs text-blue-600 hover:text-blue-800"
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!allQuestionsEntered ? (
                            <form onSubmit={handleAddQuestion}>
                                <div className="mb-4">
                                    <label className="block text-gray-700 mb-2">
                                        Question Text (English)
                                    </label>
                                    <textarea
                                        value={questionText}
                                        onChange={(e) => setQuestionText(e.target.value)}
                                        className="w-full p-3 border rounded-lg"
                                        rows={4}
                                        placeholder="Enter your question here..."
                                        required
                                    />
                                </div>
                                {questionTextHindi && (
                                    <div className="mb-4">
                                        <label className="block text-gray-700 mb-2">Hindi Translation</label>
                                        <div className="p-3 border rounded-lg bg-gray-50 text-gray-800 min-h-[48px]">{questionTextHindi}</div>
                                    </div>
                                )}
                                <div className="flex space-x-4">
                                    <button
                                        type="submit"
                                        disabled={loading || translating}
                                        className="flex-1 bg-green-600 text-white p-3 rounded-lg hover:bg-green-700"
                                    >
                                        {loading || translating ? 'Translating...' : isEditMode ? 'Update Question' : `Add Question ${currentQuestionIndex + 1}`}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-green-700 font-medium mb-4">All questions have been entered. Review them and click 'Create Questionnaire' when ready.</p>
                                <div className="flex space-x-4 justify-center">
                                    <button
                                        onClick={() => setAllQuestionsEntered(false)}
                                        className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                                    >
                                        Edit Questions
                                    </button>
                                    <button
                                        onClick={handleSaveQuestionnaire}
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                                    >
                                        {loading ? 'Creating...' : 'Create Questionnaire'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                </div>
            
            {/* Questionnaire Details Modal */}
            {showQuestionnaireDetails && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        // Close modal when clicking on backdrop
                        if (e.target === e.currentTarget) {
                            handleBackToList();
                        }
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
                         onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Questionnaire Details
                            </h2>
                            <div className="flex items-center gap-3">
                                {selectedQuestionnaire && (
                                    selectedQuestionnaire.status === 'Active' ? (
                                        <button
                                            className="px-4 py-2 bg-green-600 text-white rounded font-semibold cursor-not-allowed opacity-70"
                                            disabled
                                        >
                                            Active
                                        </button>
                                    ) : (
                                        <button
                                            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                                            onClick={async () => {
                                                await apiService.activateQuestionnaire(selectedQuestionnaire.id.toString());
                                                // Wait for backend to update before refreshing
                                                setTimeout(async () => {
                                                    const response = await apiService.getQuestionnaireDetails(selectedQuestionnaire.id);
                                                    setSelectedQuestionnaire(response.data.questionnaire);
                                                    fetchQuestionnaires();
                                                }, 500);
                                            }}
                                        >
                                            Activate
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={handleBackToList}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    title="Close (Press Esc)"
                                >
                                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingDetails ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600 text-lg">Loading questionnaire details...</p>
                                </div>
                            ) : selectedQuestionnaire ? (
                                <div>
                                    {/* Questionnaire Info */}
                                    <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                                            <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            {selectedQuestionnaire.title}
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                <p className="text-sm font-semibold text-gray-600 mb-2">Description</p>
                                                <p className="text-gray-800 leading-relaxed">{selectedQuestionnaire.description}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                <p className="text-sm font-semibold text-gray-600 mb-2">Created Date</p>
                                                <p className="text-gray-800">
                                                    {new Date(selectedQuestionnaire.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
                                            <span className="text-sm font-semibold text-gray-600">Total Questions: </span>
                                            <span className="text-lg font-bold text-blue-600">{selectedQuestionnaire.total_questions}</span>
                                        </div>
                                    </div>

                                    {/* Questions List */}
                                    <div>
                                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                                            <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Questions & Translations
                                        </h3>
                                        {selectedQuestionnaire.questions && selectedQuestionnaire.questions.length > 0 ? (
                                            <div className="space-y-4">
                                                {selectedQuestionnaire.questions.map((question, index) => (
                                                    <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                                                                Question {index + 1}
                                                            </span>
                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                ID: {question.id}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                                                <p className="text-sm font-semibold text-blue-700 mb-2 flex items-center">
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                                    </svg>
                                                                    English
                                                                </p>
                                                                <p className="text-gray-800 leading-relaxed">{question.question_text}</p>
                                                            </div>
                                                            <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                                                                <p className="text-sm font-semibold text-orange-700 mb-2 flex items-center">
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                                    </svg>
                                                                    Hindi (हिंदी)
                                                                </p>
                                                                <p className="text-gray-800 leading-relaxed font-medium" dir="auto">{question.question_text_hindi}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-gray-500 text-lg">No questions found for this questionnaire.</p>
                                                <p className="text-gray-400 text-sm mt-2">Questions may not have been added yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 p-6 bg-gray-50">
                            <button
                                onClick={handleBackToList}
                                className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                                Close & Return to List
                            </button>
                        </div>
                    </div>
                </div>
            )}
                </div>
            
            {/* Loading Modal */}
            <LoadingModal
                isOpen={loading}
                title="Creating Questionnaire"
                message="Saving your questionnaire and translating questions..."
            />
            
            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleModalClose}
                title="Questionnaire Created Successfully!"
                questionnaireName={title}
                questionCount={questions.length}
                isActive={isActive}
                onContinue={handleModalContinue}
            />
            
            {/* Error Modal */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={handleErrorModalClose}
                title="Error Creating Questionnaire"
                message={errorMessage}
                onRetry={handleRetryQuestionnaire}
            />
        </div>
    );
};

export default QuestionnairePage;