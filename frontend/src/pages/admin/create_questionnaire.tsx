import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import LoadingModal from '../../components/LoadingModal';
import { apiService} from '../../services/api';

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
    const [translationError, setTranslationError] = useState<string>('');
    const [showTranslationRetry, setShowTranslationRetry] = useState(false);

    // Fetch questionnaires on component mount
    useEffect(() => {
        // Component initialization
    }, []);

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

    // Translate and add question with proper error handling
    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!questionText.trim()) return;

        setTranslating(true);
        setTranslationError('');
        setShowTranslationRetry(false);
        
        try {
            console.log('🔄 Starting translation for:', questionText);
            
            // Translate to Hindi
            const res = await apiService.translateQuestion(questionText);
            const hindi = res.data.hindi_text;
            
            console.log('✅ Translation successful:', hindi);
            
            // Validate translation - check if it's actually translated
            if (!hindi || hindi.trim() === '') {
                throw new Error('Translation service returned empty result');
            }
            
            // Simple check - if the Hindi text is exactly the same as English text, 
            // it might indicate translation failed
            if (hindi.trim() === questionText.trim()) {
                console.warn('Warning: Hindi translation is identical to English text');
                // Don't throw error here as some words might be the same, but log for review
            }
            
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
        } catch (error: any) {
            console.error('❌ Translation failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                response: error.response,
                status: error.response?.status,
                data: error.response?.data,
                code: error.code
            });
            
            // Determine the type of error based on backend response
            let errorMsg = 'Translation failed. ';
            const errorType = error.response?.data?.error_type;
            const errorMessage = error.response?.data?.error;
            
            console.log('🔍 Error analysis:', { errorType, errorMessage });
            
            if (errorType === 'NETWORK_ERROR' || error.code === 'NETWORK_ERROR' || !navigator.onLine) {
                errorMsg += 'Please check your internet connection and try again.';
            } else if (errorType === 'TIMEOUT_ERROR') {
                errorMsg += 'Translation request timed out. Please try again.';
            } else if (errorType === 'SERVICE_ERROR') {
                errorMsg += 'Translation service is temporarily unavailable. Please try again later.';
            } else if (errorType === 'TRANSLATION_EMPTY' || errorType === 'TRANSLATION_INVALID') {
                errorMsg += 'Translation service returned invalid results. Please try again or contact support.';
            } else if (error.response?.status === 429) {
                errorMsg += 'Too many translation requests. Please wait a moment and try again.';
            } else if (error.response?.status >= 500) {
                errorMsg += 'Server error occurred. Please try again later.';
            } else if (error.response?.status >= 400) {
                errorMsg += errorMessage || 'Invalid request. Please check your input and try again.';
            } else if (error.message?.includes('timeout')) {
                errorMsg += 'Request timed out. Please check your connection and try again.';
            } else {
                errorMsg += errorMessage || 'An unexpected error occurred. Please try again or contact support if the problem persists.';
            }
            
            console.log('🚨 Final error message:', errorMsg);
            setTranslationError(errorMsg);
            setShowTranslationRetry(true);
            
            // DO NOT save the question if translation failed
            console.log('🚫 Not saving question due to translation error');
            return; // Early return to prevent saving
        } finally {
            setTranslating(false);
        }
    };

    // Retry translation function
    const handleTranslationRetry = async () => {
        if (!questionText.trim()) return;
        
        setTranslationError('');
        setShowTranslationRetry(false);
        
        // Retry the translation
        await handleAddQuestion({ preventDefault: () => {} } as React.FormEvent);
    };

    // Skip translation and proceed with English only (fallback option)
    const handleSkipTranslation = () => {
        console.warn('User chose to skip translation for:', questionText);
        
        // Save with English text as Hindi (user's choice)
        const updatedQuestions = [...questions];
        updatedQuestions[currentQuestionIndex] = { 
            english: questionText, 
            hindi: questionText + ' (Translation skipped - Please add Hindi translation manually later)'
        };
        setQuestions(updatedQuestions);
        
        // Reset translation error state
        setTranslationError('');
        setShowTranslationRetry(false);
        setQuestionTextHindi(questionText + ' (Translation skipped)');

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
        <div className="flex h-screen bg-gradient-to-br from-orange-50 via-green-50 to-blue-50">
            <Sidebar />
            <div className="flex-1 p-6 overflow-y-auto relative">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 right-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-5 animate-pulse"></div>
                    <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-bounce"></div>
                    <div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse delay-1000"></div>
                </div>

                <div className="max-w-4xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl p-5 shadow-xl border border-white/20 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                        ➕
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-black tracking-tight">Create Questionnaire</h1>
                                    <p className="text-gray-600 text-sm mt-1">Design comprehensive mental health assessment questionnaires</p>
                                </div>
                            </div>
                            <button
                                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center text-sm"
                                onClick={() => navigate('/admin/questionnaires')}
                            >
                                ← <span className="ml-2">Back to List</span>
                            </button>
                        </div>
                    </div>
                    {step === 1 ? (
                        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/20">
                            <div className="flex items-center mb-6">
                                📋 <div className="ml-3">
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Questionnaire Setup</h2>
                                    <p className="text-gray-600 text-sm">Configure the basic details of your questionnaire</p>
                                </div>
                            </div>
                            
                            <form onSubmit={handleCreateQuestionnaire} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <i className="fas fa-heading mr-2 text-blue-500"></i>
                                        Questionnaire Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm"
                                        required
                                        placeholder="Enter a descriptive title for your questionnaire"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <i className="fas fa-align-left mr-2 text-green-500"></i>
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm"
                                        rows={3}
                                        required
                                        placeholder="Describe the purpose and scope of this questionnaire"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <i className="fas fa-list-ol mr-2 text-purple-500"></i>
                                        Number of Questions
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={numberOfQuestions}
                                        onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm"
                                        required
                                        placeholder="How many questions will this questionnaire have?"
                                    />
                                </div>
                                
                                <div className="bg-gradient-to-r from-orange-50 to-green-50 p-4 rounded-lg border border-orange-200">
                                    <label className="flex items-center text-gray-700 font-medium cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <i className="fas fa-toggle-on mr-2 text-green-500"></i>
                                        Set as Active Questionnaire
                                    </label>
                                    <p className="text-sm text-gray-600 mt-2 ml-7">This questionnaire will be used for new user assessments</p>
                                </div>
                                
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-sm"
                                >
                                    <i className="fas fa-arrow-right mr-3"></i>
                                    Continue to Add Questions
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/20">
                            <div className="mb-6">
                                <div className="flex items-center mb-4">
                                    <i className="fas fa-question-circle text-2xl text-green-600 mr-3"></i>
                                    <div>
                                        <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Add Questions</h2>
                                        <p className="text-gray-600 text-sm">Create bilingual questions for your mental health assessment</p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center mb-5">
                                    <div className="bg-gradient-to-r from-green-100 to-blue-100 px-3 py-2 rounded-lg border border-green-200">
                                        <p className="text-sm font-medium text-gray-700">
                                            <i className="fas fa-list mr-2 text-green-600"></i>
                                            Question {currentQuestionIndex + 1} of {numberOfQuestions}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handlePreviousQuestion}
                                            disabled={currentQuestionIndex === 0}
                                            className={`px-3 py-2 rounded-lg font-medium shadow-sm transition-all duration-200 flex items-center text-sm ${
                                                currentQuestionIndex === 0
                                                    ? 'bg-gray-200 cursor-not-allowed text-gray-400'
                                                    : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white transform hover:scale-105'
                                            }`}
                                        >
                                            <i className="fas fa-chevron-left mr-1"></i>
                                            Previous
                                        </button>
                                        <button
                                            onClick={handleNextQuestion}
                                            disabled={currentQuestionIndex === numberOfQuestions - 1 || !questions[currentQuestionIndex]}
                                            className={`px-3 py-2 rounded-lg font-medium shadow-sm transition-all duration-200 flex items-center text-sm ${
                                                currentQuestionIndex === numberOfQuestions - 1 || !questions[currentQuestionIndex]
                                                    ? 'bg-gray-200 cursor-not-allowed text-gray-400'
                                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transform hover:scale-105'
                                            }`}
                                        >
                                            Next
                                            <i className="fas fa-chevron-right ml-1"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="w-full bg-gray-200/50 rounded-full h-2 mb-5 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${((currentQuestionIndex + 1) / numberOfQuestions) * 100}%` }}
                                    />
                                </div>
                            </div>
                            {questions.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                                        <i className="fas fa-clipboard-list mr-2 text-blue-500"></i>
                                        Questions Overview
                                    </h3>
                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/30">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-blue-50 to-green-50">
                                                    <th className="py-3 px-4 text-left text-sm font-bold text-gray-700">No.</th>
                                                    <th className="py-3 px-4 text-left text-sm font-bold text-gray-700">Question Preview</th>
                                                    <th className="py-3 px-4 text-center text-sm font-bold text-gray-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {questions.map((q, index) => (
                                                    <tr 
                                                        key={index}
                                                        className={`border-b last:border-b-0 transition-colors duration-200 ${
                                                            index === currentQuestionIndex
                                                                ? 'bg-blue-100/60'
                                                                : 'bg-white/40 hover:bg-gray-50/60'
                                                        }`}
                                                    >
                                                        <td className="py-3 px-4 text-sm font-bold text-blue-600">
                                                            Q{index + 1}
                                                            {index === currentQuestionIndex && (
                                                                <i className="fas fa-edit ml-2 text-green-500"></i>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-800">
                                                            {q && q.english ? (
                                                                <div className="line-clamp-2 font-medium">{q.english}</div>
                                                            ) : (
                                                                <span className="text-gray-400 italic">Not added yet</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {q && q.english && (
                                                                <button
                                                                    onClick={() => {
                                                                        setCurrentQuestionIndex(index);
                                                                        setQuestionText(q.english);
                                                                        setQuestionTextHindi(q.hindi);
                                                                        setIsEditMode(true);
                                                                    }}
                                                                    className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                                                                >
                                                                    <i className="fas fa-edit mr-1"></i>
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
                                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-5 rounded-lg border border-blue-200">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                                        <i className="fas fa-edit mr-2 text-green-500"></i>
                                        {isEditMode ? 'Edit Question' : `Add Question ${currentQuestionIndex + 1}`}
                                    </h3>
                                    
                                    <form onSubmit={handleAddQuestion} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                                <i className="fas fa-language mr-2 text-blue-500"></i>
                                                Question Text (English)
                                            </label>
                                            <textarea
                                                value={questionText}
                                                onChange={(e) => {
                                                    setQuestionText(e.target.value);
                                                    // Clear translation errors when user modifies the question
                                                    if (translationError) {
                                                        setTranslationError('');
                                                        setShowTranslationRetry(false);
                                                        setQuestionTextHindi('');
                                                    }
                                                }}
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm"
                                                rows={3}
                                                placeholder="Enter your question here... Be clear and specific for better mental health assessment."
                                                required
                                            />
                                        </div>
                                        
                                        {questionTextHindi && !translationError && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700 flex items-center">
                                                    <i className="fas fa-globe mr-2 text-orange-500"></i>
                                                    Hindi Translation (Auto-generated)
                                                </label>
                                                <div className="p-3 border border-orange-200 rounded-lg bg-orange-50/50 text-gray-800 min-h-[48px] font-medium text-sm">
                                                    {questionTextHindi}
                                                </div>
                                            </div>
                                        )}

                                        {/* Translation Error Display */}
                                        {!!translationError && (
                                            <div className="space-y-3">
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="flex items-start">
                                                        <i className="fas fa-exclamation-triangle text-red-500 mt-0.5 mr-3"></i>
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-semibold text-red-800 mb-1">Translation Error</h4>
                                                            <p className="text-sm text-red-700">{translationError}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {showTranslationRetry && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleTranslationRetry}
                                                            disabled={translating}
                                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                                        >
                                                            {translating ? (
                                                                <>
                                                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                                                    Retrying...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-redo mr-2"></i>
                                                                    Retry Translation
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleSkipTranslation}
                                                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center"
                                                        >
                                                            <i className="fas fa-skip-forward mr-2"></i>
                                                            Skip Translation
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="flex space-x-3">
                                            <button
                                                type="submit"
                                                disabled={loading || translating || (!!translationError && showTranslationRetry)}
                                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-sm"
                                            >
                                                {loading || translating ? (
                                                    <>
                                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                                        Translating...
                                                    </>
                                                ) : !!translationError && showTranslationRetry ? (
                                                    <>
                                                        <i className="fas fa-exclamation-triangle mr-2"></i>
                                                        Fix Translation Error
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className={`fas ${isEditMode ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                                                        {isEditMode ? 'Update Question' : `Add Question ${currentQuestionIndex + 1}`}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                                    <div className="mb-5">
                                        <i className="fas fa-check-circle text-5xl text-green-500 mb-3"></i>
                                        <h3 className="text-xl font-bold text-green-700 mb-2">All Questions Complete!</h3>
                                        <p className="text-green-600 font-medium text-sm">Review your questions and create the questionnaire when ready.</p>
                                    </div>
                                    
                                    <div className="flex space-x-3 justify-center">
                                        <button
                                            onClick={() => setAllQuestionsEntered(false)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] font-medium transition-all duration-200 flex items-center text-sm"
                                        >
                                            <i className="fas fa-edit mr-2"></i>
                                            Edit Questions
                                        </button>
                                        <button
                                            onClick={handleSaveQuestionnaire}
                                            disabled={loading}
                                            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] font-medium transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Create Questionnaire
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

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
                onClose={() => {
                    setShowSuccessModal(false);
                    navigate('/admin/questionnaires');
                }}
                title="Questionnaire Created Successfully!"
                questionnaireName={title}
                questionCount={questions.length}
                isActive={isActive}
                onContinue={() => {
                    setShowSuccessModal(false);
                    navigate('/admin/dashboard');
                }}
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