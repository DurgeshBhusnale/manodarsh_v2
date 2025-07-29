import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/api';
import Modal from '../../components/Modal';
import ErrorModal from '../../components/ErrorModal';

// Helper function to translate Hindi to English using backend
async function translateHindiToEnglish(text: string): Promise<string> {
    try {
        const res = await apiService.translateAnswer({ answer_text: text });
        return res.data.english_text;
    } catch (err) {
        console.error('Translation API error:', err);
        return text;
    }
}

interface Question {
    id: number;
    question_text: string;
    question_text_hindi: string;
    questionnaire_id: number;
}

interface SurveyResponse {
    question_id: number;
    answer_text: string;
}

const SurveyPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get soldier data from navigation state
    const soldierData = location.state as { force_id: string; password: string } | null;
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnswering, setIsAnswering] = useState(false);
    const [hasEndedAnswering, setHasEndedAnswering] = useState(false);
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [recordedText, setRecordedText] = useState('');
    const [capturedText, setCapturedText] = useState('');
    const [textInput, setTextInput] = useState(''); // New text input state
    const [emotionMonitoringStarted, setEmotionMonitoringStarted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Prevent multiple submissions
    const recognitionRef = useRef<any>(null);

    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        // Redirect if no soldier data provided
        if (!soldierData) {
            navigate('/admin/survey');
            return;
        }
        
        const fetchActiveQuestionnaire = async () => {
            try {
                // Start emotion monitoring BEFORE fetching questionnaire
                // This ensures camera is ready when user sees first question
                await startEmotionMonitoring();
                
                const response = await apiService.getActiveQuestionnaire();
                setQuestions(response.data.questions);
                setQuestionnaireId(response.data.questionnaire.id);
                setIsLoading(false);
                
            } catch (error) {
                console.error('Failed to fetch questionnaire:', error);
                setModalTitle('Loading Error');
                setModalMessage('Failed to load questionnaire. Please try again.');
                setShowErrorModal(true);
                setIsLoading(false);
            }
        };

        fetchActiveQuestionnaire();
    }, [soldierData, navigate]);

    const startEmotionMonitoring = async () => {
        if (!soldierData?.force_id || emotionMonitoringStarted) return;
        
        try {
            console.log('Starting emotion monitoring for:', soldierData.force_id);
            const response = await apiService.startSurveyEmotionMonitoring(soldierData.force_id);
            
            // Check if webcam is disabled by admin
            if (response.data.webcam_enabled === false) {
                console.log('Webcam is disabled by administrator');
                setModalTitle('Webcam Disabled');
                setModalMessage('Webcam monitoring is currently disabled by the administrator. The survey will continue without emotion detection.');
                setShowErrorModal(true);
                return; // Exit without setting emotionMonitoringStarted
            }
            
            setEmotionMonitoringStarted(true);
            console.log('Emotion monitoring started successfully for survey');
            
            // Add a small delay to ensure camera is fully initialized
            // This prevents users from answering questions before camera is ready
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            
        } catch (error) {
            console.error('Failed to start emotion monitoring:', error);
            // Don't block survey if emotion monitoring fails
            setModalTitle('Emotion Monitoring Warning');
            setModalMessage('Failed to start emotion monitoring. The survey will continue without emotion detection.');
            setShowErrorModal(true);
        }
    };

    const stopEmotionMonitoring = async (sessionId?: number) => {
        if (!soldierData?.force_id) {
            console.log('No soldier data available for stopping emotion monitoring');
            return null;
        }
        
        // Always try to stop monitoring, even if state says it's not started
        // This ensures cleanup in case of state inconsistencies
        try {
            console.log('Stopping emotion monitoring for:', soldierData.force_id, 'session:', sessionId);
            const response = await apiService.endSurveyEmotionMonitoring(soldierData.force_id, sessionId);
            setEmotionMonitoringStarted(false);
            console.log('Emotion monitoring stopped successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to stop emotion monitoring:', error);
            setEmotionMonitoringStarted(false); // Reset state even on error
            return null;
        }
    };

    const handleStartAnswer = () => {
        setIsAnswering(true);
        setHasEndedAnswering(false);
        setRecordedText('');
        if ('webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onresult = async (event: any) => {
                let transcript = event.results[0][0].transcript;
                setRecordedText(transcript);
                setCapturedText(prev => prev ? prev + ' ' + transcript : transcript);
            };
            recognition.onerror = (event: any) => {
                setIsAnswering(false);
                setModalTitle('Speech Recognition Error');
                setModalMessage(`Speech recognition error: ${event.error}`);
                setShowErrorModal(true);
            };
            recognitionRef.current = recognition;
            recognition.start();
        } else {
            setModalTitle('Not Supported');
            setModalMessage('Speech recognition is not supported in this browser.');
            setShowErrorModal(true);
            setIsAnswering(false);
        }
    };

    const handleStopAnswer = async () => {
        setIsAnswering(false);
        setHasEndedAnswering(true);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current.onend = async () => {
                if (capturedText) {
                    if (language === 'hi') {
                        try {
                            const english = await translateHindiToEnglish(capturedText);
                            console.log('English translation of answer:', english);
                        } catch (err) {
                            console.error('Translation failed:', err);
                        }
                    } else {
                        console.log('Recognized:', capturedText);
                    }
                }
            };
        }
    };

    const handleNextQuestion = () => {
        // Combine captured text (voice) and text input
        const finalAnswer = textInput.trim() || capturedText || recordedText || '';
        
        setResponses([
            ...responses,
            {
                question_id: questions[currentQuestionIndex].id,
                answer_text: finalAnswer
            }
        ]);
        setCapturedText('');
        setRecordedText('');
        setTextInput('');
        setHasEndedAnswering(false);
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setIsAnswering(false);
        }
    };

    const handleSubmitSurvey = async () => {
        // Prevent multiple submissions
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        // Combine captured text (voice) and text input for final question
        const finalAnswer = textInput.trim() || capturedText || recordedText || '';
        
        const allResponses = [
            ...responses,
            {
                question_id: questions[currentQuestionIndex].id,
                answer_text: finalAnswer
            }
        ];

        const translatedResponses = await Promise.all(
            allResponses.map(async (resp) => {
                if (language === 'hi' && resp.answer_text) {
                    try {
                        const english = await translateHindiToEnglish(resp.answer_text);
                        return { ...resp, answer_text: english };
                    } catch {
                        return { ...resp, answer_text: resp.answer_text };
                    }
                } else {
                    return resp;
                }
            })
        );

        if (!questionnaireId) {
            setModalTitle('Submission Error');
            setModalMessage('Questionnaire ID is missing. Cannot submit survey.');
            setShowErrorModal(true);
            setIsSubmitting(false); // Reset on error
            return;
        }

        try {
            const response = await apiService.submitSurvey({
                questionnaire_id: questionnaireId,
                responses: translatedResponses,
                force_id: soldierData?.force_id || '',
                password: soldierData?.password || ''
            });
            
            console.log('Survey submitted successfully:', response.data);
            
            // Stop emotion monitoring and get results
            const emotionData = await stopEmotionMonitoring(response.data?.session_id);
            
            if (emotionData) {
                console.log('Emotion monitoring data collected:', emotionData);
            }
            
            setModalTitle('Survey Submitted Successfully');
            setModalMessage('Thank you for completing the mental health survey. Your responses have been recorded successfully.');
            setShowSuccessModal(true);
        } catch (err: any) {
            console.error('Survey submission error:', err);
            setModalTitle('Submission Failed');
            setModalMessage(err.response?.data?.error || 'Failed to submit survey. Please try again.');
            setShowErrorModal(true);
            setIsSubmitting(false); // Reset on error
            
            // IMPORTANT: Stop emotion monitoring even on error
            if (emotionMonitoringStarted) {
                await stopEmotionMonitoring();
            }
        }
    };

    const handleSuccessModalClose = async () => {
        setShowSuccessModal(false);
        
        // Stop emotion monitoring if still running
        if (emotionMonitoringStarted) {
            await stopEmotionMonitoring();
        }
        
        // Reset the survey for next soldier
        setCurrentQuestionIndex(0);
        setResponses([]);
        setCapturedText('');
        setRecordedText('');
        setTextInput('');
        setHasEndedAnswering(false);
        setIsAnswering(false);
        setIsSubmitting(false); // Reset submission state
        // Navigate back to survey page (same page, but reset)
        navigate('/admin/survey');
    };

    if (isLoading) {
        return (
            <div className="flex h-screen bg-gray-100">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-lg text-gray-600 mb-2">Loading survey...</div>
                        <div className="text-sm text-gray-500">Preparing camera for emotion monitoring</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-3xl mx-auto p-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                    {/* Language Toggle */}
                    <div className="flex justify-end mb-4">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                            <button
                                type="button"
                                className={`px-4 py-2 border border-gray-300 text-sm font-medium rounded-l-md focus:outline-none ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                                onClick={() => setLanguage('en')}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                className={`px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md focus:outline-none ${language === 'hi' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                                onClick={() => setLanguage('hi')}
                            >
                                Hindi
                            </button>
                        </div>
                    </div>

                    {/* Header with progress */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold mb-4">Weekly Mental Health Survey</h1>
                        
                        {/* Emotion Monitoring Indicator */}
                        {emotionMonitoringStarted && (
                            <div className="flex items-center justify-center text-blue-600 mb-4 bg-blue-50 p-2 rounded-lg">
                                <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse" />
                                <span className="text-sm">Emotion monitoring active during survey</span>
                            </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </span>
                            <span className="text-sm text-gray-600">
                                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                        <h2 className="text-xl font-medium text-gray-800 mb-4">
                            {language === 'en'
                                ? questions[currentQuestionIndex]?.question_text
                                : questions[currentQuestionIndex]?.question_text_hindi}
                        </h2>
                        
                        {/* Answer Status Indicator */}
                        {isAnswering && (
                            <div className="flex items-center justify-center text-green-600 mb-4">
                                <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
                                <span>Recording your answer...</span>
                            </div>
                        )}
                        
                        {/* Captured Answer Textbox */}
                        {capturedText && !isAnswering && (
                            <div className="mt-4">
                                <label className="block text-gray-700 mb-2">Captured Voice Answer</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg bg-gray-50"
                                    rows={3}
                                    value={capturedText}
                                    onChange={e => setCapturedText(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Text Input for Manual Answer */}
                        <div className="mt-4">
                            <label className="block text-gray-700 mb-2">
                                Your Answer (Type here or use voice recording above)
                            </label>
                            <textarea
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={4}
                                value={textInput}
                                onChange={e => setTextInput(e.target.value)}
                                placeholder={language === 'hi' 
                                    ? "अपना उत्तर यहाँ टाइप करें..." 
                                    : "Type your answer here..."}
                            />
                            <div className="text-sm text-gray-500 mt-1">
                                {language === 'hi' 
                                    ? "आप अपना उत्तर टाइप कर सकते हैं या ऊपर वॉयस रिकॉर्डिंग का उपयोग कर सकते हैं"
                                    : "You can type your answer or use voice recording above"}
                            </div>
                        </div>
                    </div>

                    {/* Button Controls */}
                    <div className="flex justify-between items-center space-x-4">
                        {/* Start/Stop Answer Button */}
                        {!isAnswering ? (
                            <button
                                onClick={handleStartAnswer}
                                className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="6" fill="currentColor" />
                                </svg>
                                Start Answering
                            </button>
                        ) : (
                            <button
                                onClick={handleStopAnswer}
                                className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="8" y="8" width="8" height="8" fill="currentColor" />
                                </svg>
                                End Answering
                            </button>
                        )}

                        {/* Next Question or Submit Button */}
                        {currentQuestionIndex === questions.length - 1 ? (
                            <button
                                onClick={handleSubmitSurvey}
                                className={`flex-1 py-3 px-6 rounded-lg transition-colors ${
                                    isSubmitting 
                                        ? 'bg-blue-800 text-white cursor-not-allowed' 
                                        : (hasEndedAnswering || textInput.trim()) 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                }`}
                                disabled={isSubmitting || (!hasEndedAnswering && !textInput.trim())}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </span>
                                ) : (
                                    'Submit Survey'
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                className={`flex-1 py-3 px-6 rounded-lg transition-colors ${
                                    (hasEndedAnswering || textInput.trim()) 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                }`}
                                disabled={!hasEndedAnswering && !textInput.trim()}
                            >
                                Next Question
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Components */}
            <Modal
                isOpen={showSuccessModal}
                onClose={handleSuccessModalClose}
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
        </div>
    );
};

export default SurveyPage;
