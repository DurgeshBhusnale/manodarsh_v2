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
    
    // Get soldier data from navigation state with authentication info
    const soldierData = location.state as { 
        force_id: string; 
        password: string; 
        authenticated?: boolean;
        auth_timestamp?: number;
    } | null;
    const [showStartNote, setShowStartNote] = useState(true);
    const [surveyStarted, setSurveyStarted] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false); // Track if survey is being completed
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState({ step: 'Initializing...', progress: 0 });
    const [isAnswering, setIsAnswering] = useState(false);
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [recordedText, setRecordedText] = useState('');
    const [capturedText, setCapturedText] = useState('');
    const [textInput, setTextInput] = useState(''); // Combined text input state
    const [manualInput, setManualInput] = useState(''); // Manual typing input only
    const [emotionMonitoringStarted, setEmotionMonitoringStarted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Prevent multiple submissions
    const [showBackNavigationWarning, setShowBackNavigationWarning] = useState(false);
    const [showWordCountWarning, setShowWordCountWarning] = useState(false);
    const [showMentalStateQuestion, setShowMentalStateQuestion] = useState(false);
    const [mentalStateRating, setMentalStateRating] = useState<number | null>(null);
    
    // Word count validation constants
    const MIN_WORD_COUNT = 5;
    
    // Mental state options based on your specifications
    const MENTAL_STATE_OPTIONS = [
        { 
            value: 1, 
            emoji: '😰', 
            textEn: 'Very Low', 
            textHi: 'बहुत उदास',
            color: '#dc2626' 
        },
        { 
            value: 2, 
            emoji: '😟', 
            textEn: 'Low', 
            textHi: 'उदास ',
            color: '#ea580c' 
        },
        { 
            value: 3, 
            emoji: '😐', 
            textEn: 'Neutral', 
            textHi: 'सामान्य',
            color: '#d97706' 
        },
        { 
            value: 4, 
            emoji: '🙂', 
            textEn: 'Slightly Positive', 
            textHi: 'थोड़े खुश',
            color: '#65a30d' 
        },
        { 
            value: 5, 
            emoji: '😊', 
            textEn: 'Positive', 
            textHi: 'खुश',
            color: '#16a34a' 
        },
        { 
            value: 6, 
            emoji: '😁', 
            textEn: 'Very Positive', 
            textHi: 'बहुत खुश',
            color: '#059669' 
        },
        { 
            value: 7, 
            emoji: '🤩', 
            textEn: 'Excellent', 
            textHi: 'शानदार',
            color: '#0d9488' 
        }
    ];
    
    // Function to count words in text
    const countWords = (text: string): number => {
        if (!text) return 0;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    };
    
    // Function to check if current answer meets minimum word count
    const isAnswerValid = (): boolean => {
        const currentAnswer = textInput.trim() || capturedText || recordedText || '';
        const wordCount = countWords(currentAnswer);
        return wordCount >= MIN_WORD_COUNT;
    };
    
    // Function to get current word count
    const getCurrentWordCount = (): number => {
        const currentAnswer = textInput.trim() || capturedText || recordedText || '';
        return countWords(currentAnswer);
    };
    
    // Effect to monitor text changes and show/hide word count warning
    useEffect(() => {
        const currentAnswer = textInput.trim() || capturedText || recordedText || '';
        const wordCount = countWords(currentAnswer);
        
        if (currentAnswer && wordCount < MIN_WORD_COUNT) {
            setShowWordCountWarning(true);
        } else {
            setShowWordCountWarning(false);
        }
    }, [textInput, capturedText, recordedText]);
    
    // Handle manual text input changes (when user types while not in voice mode)
    const handleTextInputChange = (value: string) => {
        setTextInput(value);
        if (!isAnswering) {
            // Update manual input only when not in voice recording mode
            setManualInput(value);
            // Clear recorded text if user is manually editing (they want to type instead)
            if (recordedText && !value.includes(recordedText)) {
                setRecordedText('');
                setCapturedText('');
            }
        }
    };
    const recognitionRef = useRef<any>(null);
    const surveyLoadedRef = useRef<boolean>(false); // Track if survey is already loaded
    const successModalShownRef = useRef<boolean>(false); // Track if success modal has been shown

    // Cleanup speech recognition on component unmount or question change
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
        };
    }, [currentQuestionIndex]); // Clean up when question changes

    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    // Prevent back navigation when survey is in progress
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (surveyStarted && !isSubmitting && !isCompleting) {
                // Prevent the back navigation immediately
                event.preventDefault();
                event.stopImmediatePropagation();
                
                // Re-push the current state to maintain history
                window.history.pushState(null, '', window.location.href);
                
                // Show warning modal immediately
                setModalTitle('Navigation Restricted');
                setModalMessage('You cannot go back while the survey is in progress. Please complete and submit the survey first.');
                setShowBackNavigationWarning(true);
                
                return false;
            }
        };

        // Only add event listener and manipulate history when survey is actually started
        if (surveyStarted && !isCompleting) {
            // Push a state to history to detect back navigation
            window.history.pushState({ surveyInProgress: true }, '', window.location.href);
            window.addEventListener('popstate', handlePopState, true); // Use capture phase
        }

        return () => {
            window.removeEventListener('popstate', handlePopState, true);
        };
    }, [surveyStarted, isSubmitting, isCompleting]);

    // Prevent page refresh/close when survey is in progress
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (surveyStarted && !isSubmitting && !isCompleting) {
                event.preventDefault();
                event.returnValue = 'You have a survey in progress. Are you sure you want to leave?';
                return 'You have a survey in progress. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [surveyStarted, isSubmitting, isCompleting]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            // FAST cleanup when component unmounts
            if (emotionMonitoringStarted) {
                // Primary cleanup - stop monitoring properly
                apiService.endSurveyEmotionMonitoring(soldierData?.force_id || '', undefined)
                    .catch(console.error);
                
                // Secondary cleanup - force camera cleanup if needed (reduced delay)
                setTimeout(() => {
                    apiService.forceCameraCleanup()
                        .catch(error => {
                            console.warn('Force camera cleanup failed:', error);
                        });
                }, 200);  // Reduced from 1000ms to 200ms
            }
        };
    }, [emotionMonitoringStarted, soldierData?.force_id]);

    useEffect(() => {
        // ENHANCED AUTHENTICATION CHECK: Verify soldier is properly authenticated
        if (!soldierData) {
            console.log('No soldier data - redirecting to login');
            navigate('/soldier/login');
            return;
        }

        // Check if soldier was authenticated at login
        if (!soldierData.authenticated) {
            console.log('Soldier not authenticated at login - redirecting');
            navigate('/soldier/login');
            return;
        }

        // Check authentication timestamp (optional - prevent old auth tokens)
        if (soldierData.auth_timestamp) {
            const authAge = Date.now() - soldierData.auth_timestamp;
            const maxAuthAge = 10 * 60 * 1000; // 10 minutes max age
            
            if (authAge > maxAuthAge) {
                console.log('Authentication expired - redirecting to login');
                navigate('/soldier/login');
                return;
            }
        }

        console.log('Soldier authentication verified:', {
            force_id: soldierData.force_id,
            authenticated: soldierData.authenticated,
            auth_age: soldierData.auth_timestamp ? Date.now() - soldierData.auth_timestamp : 'unknown'
        });
        
        // Reset all states when component mounts (handles page reload scenarios)
        const resetStates = () => {
            setCurrentQuestionIndex(0);
            setResponses([]);
            setCapturedText('');
            setRecordedText('');
            setTextInput('');
            setManualInput(''); // Clear manual input
            setIsAnswering(false);
            setIsSubmitting(false);
            setShowMentalStateQuestion(false);
            setMentalStateRating(null);
            setShowBackNavigationWarning(false);
            setShowErrorModal(false);
            setShowSuccessModal(false);
            setIsCompleting(false);
            setSurveyStarted(false);
        };
        
        // Reset states on component mount (but not if success modal was already shown)
        if (!successModalShownRef.current) {
            resetStates();
        }
        
        // Define emotion monitoring function inline to avoid dependency issues
        const startEmotionMonitoringAsync = async () => {
            // Check current state instead of using dependency
            const currentEmotionState = emotionMonitoringStarted;
            if (!soldierData?.force_id || currentEmotionState) return { success: false, reason: 'Already started or no soldier data' };
            
            try {
                console.log('Starting background emotion monitoring for:', soldierData.force_id);
                
                // OPTIMIZATION: Start monitoring request but don't wait for camera initialization
                // This will happen in the background while user takes the survey
                const response = await apiService.startSurveyEmotionMonitoring(soldierData.force_id);
                
                // Check if webcam is disabled by admin
                if (response.data.webcam_enabled === false) {
                    console.log('Webcam is disabled by administrator - continuing without monitoring');
                    return { success: false, reason: 'Webcam disabled by admin' };
                }
                
                setEmotionMonitoringStarted(true);
                console.log('Background emotion monitoring request sent successfully');
                return { success: true, message: 'Monitoring started in background' };
                
            } catch (error) {
                console.error('Background emotion monitoring failed (non-critical):', error);
                // Don't show error modal - this is background process
                return { success: false, error: error, reason: 'Background monitoring failed' };
            }
        };
        
        // Load survey only on initial mount
        const loadSurvey = async () => {
            // Prevent loading if already loaded or if completing/success modal or success already shown
            if (surveyLoadedRef.current || isCompleting || showSuccessModal || successModalShownRef.current) {
                console.log('Skipping survey load - already loaded or completing', {
                    alreadyLoaded: surveyLoadedRef.current,
                    isCompleting,
                    showSuccessModal,
                    successModalShown: successModalShownRef.current
                });
                return;
            }
            
            console.log('Initial survey load triggered');
            surveyLoadedRef.current = true; // Mark as loading
            
            try {
                console.log('Starting survey fetch process...');
                
                // Set a timeout to prevent infinite loading
                const timeoutId = setTimeout(() => {
                    if (isLoading) {
                        setModalTitle('Loading Timeout');
                        setModalMessage('Survey loading is taking too long. Please try logging in again.');
                        setShowErrorModal(true);
                        setIsLoading(false);
                        setShowStartNote(false);
                    }
                }, 30000); // 30 seconds timeout
                
                // OPTIMIZATION: Progressive loading feedback with realistic timing
                setLoadingProgress({ step: 'Initializing survey system...', progress: 10 });
                await new Promise(resolve => setTimeout(resolve, 500)); // Show this step
                
                // OPTIMIZATION: Start survey loading immediately, emotion monitoring in background
                console.log('Starting optimized survey initialization...');
                setLoadingProgress({ step: 'Loading survey questions...', progress: 30 });
                
                // Load questionnaire first (fast operation)
                const questionnaireResult = await apiService.getActiveQuestionnaire();
                console.log('Questionnaire loaded successfully:', questionnaireResult.data);
                
                setLoadingProgress({ step: 'Preparing survey interface...', progress: 60 });
                await new Promise(resolve => setTimeout(resolve, 300)); // Show progress
                
                // Start emotion monitoring in background (non-blocking)
                setLoadingProgress({ step: 'Setting up background monitoring...', progress: 80 });
                startEmotionMonitoringAsync().catch(error => {
                    console.warn('Background emotion monitoring failed, survey continues:', error);
                });
                
                setLoadingProgress({ step: 'Survey ready to start!', progress: 100 });
                
                // Clear timeout on success
                clearTimeout(timeoutId);
                
                if (!questionnaireResult.data.questionnaire) {
                    throw new Error('No active questionnaire found');
                }
                
                if (!questionnaireResult.data.questions || questionnaireResult.data.questions.length === 0) {
                    throw new Error('No questions found in the questionnaire');
                }
                
                setQuestions(questionnaireResult.data.questions);
                setQuestionnaireId(questionnaireResult.data.questionnaire.id);
                
                setLoadingProgress({ step: 'Survey ready!', progress: 100 });
                
                console.log('Survey loaded successfully:', {
                    questionnaireId: questionnaireResult.data.questionnaire.id,
                    questionsCount: questionnaireResult.data.questions.length,
                    loadingOptimized: true
                });
                
                // Brief delay to show completion before hiding loading
                setTimeout(() => {
                    setIsLoading(false);
                    setSurveyStarted(true); // Mark survey as started
                    setShowStartNote(false); // Only hide start note on success
                }, 800); // Reduced from 500ms to show the "Survey ready!" message
            } catch (error) {
                console.error('Failed to start survey:', error);
                setModalTitle('Loading Error');
                setModalMessage(error instanceof Error ? error.message : 'Failed to load survey. Please try again.');
                setShowErrorModal(true);
                setIsLoading(false);
                setShowStartNote(false); // Hide start note to show error modal
                surveyLoadedRef.current = false; // Reset on error so it can retry
            }
        };
        
        // Only load survey once on mount
        loadSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [soldierData, navigate]); // Only depend on soldierData and navigate to avoid re-renders on state changes

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
        
        // Don't clear recordedText when restarting - preserve existing voice input
        // setRecordedText(''); // Remove this line
        
        // Capture current manual input before starting voice recognition
        // But don't overwrite if we already have manual input stored
        const currentText = textInput.trim();
        if (currentText && !manualInput) {
            // If we have text but no manual input stored, it means this is existing content
            setManualInput(currentText);
        } else if (currentText && manualInput && !currentText.includes(recordedText || '')) {
            // If current text doesn't include recorded text, user has been typing manually
            setManualInput(currentText);
        }
        
        if ('webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
            recognition.continuous = true; // Keep listening continuously
            recognition.interimResults = true; // Get interim results as user speaks
            recognition.maxAlternatives = 1;
            
            // Additional settings to improve continuous listening
            if (recognition.serviceURI) {
                // This is available in some browsers
                recognition.serviceURI = 'wss://www.google.com/speech-api/full-duplex/v1/up';
            }
            
            // Start with existing voice transcript if any
            let finalTranscript = recordedText ? recordedText + ' ' : '';
            
            // Add start event handler for debugging
            recognition.onstart = () => {
                console.log('Speech recognition started successfully');
            };
            
            recognition.onresult = async (event: any) => {
                let interimTranscript = '';
                
                // Process all results from the current session
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                        console.log('Final transcript added:', transcript);
                    } else {
                        interimTranscript += transcript;
                        console.log('Interim transcript:', transcript);
                    }
                }
                
                // Update the complete transcript (final + interim)
                const completeTranscript = (finalTranscript + interimTranscript).trim();
                setRecordedText(completeTranscript);
                
                // Combine manual input with voice input
                const combinedText = manualInput && completeTranscript 
                    ? manualInput + ' ' + completeTranscript 
                    : manualInput || completeTranscript;
                
                setTextInput(combinedText);
                setCapturedText(completeTranscript); // Keep for backward compatibility
            };
            
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                // Handle different types of errors
                if (event.error === 'no-speech') {
                    console.log('No speech detected, will restart recognition...');
                    // Don't show error for no-speech, just let it restart via onend
                    return;
                } else if (event.error === 'network' || event.error === 'audio-capture') {
                    console.log('Temporary error, recognition will restart...', event.error);
                    return;
                } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setIsAnswering(false);
                    setModalTitle('Microphone Permission Required');
                    setModalMessage('Please allow microphone access to use voice input feature.');
                    setShowErrorModal(true);
                } else {
                    console.warn('Speech recognition error (will restart):', event.error);
                    // For other errors, let it restart through onend
                }
            };
            
            recognition.onend = () => {
                // Always restart if still in answering mode - no conditions
                if (isAnswering) {
                    console.log('Speech recognition ended, restarting immediately...');
                    // Use a very short timeout to ensure seamless restart
                    setTimeout(() => {
                        if (isAnswering && recognitionRef.current) {
                            try {
                                console.log('Attempting to restart speech recognition...');
                                recognitionRef.current.start();
                                console.log('Speech recognition restarted successfully');
                            } catch (error) {
                                console.error('Failed to restart recognition:', error);
                                // If immediate restart fails, try with slightly longer delay
                                setTimeout(() => {
                                    if (isAnswering && recognitionRef.current) {
                                        try {
                                            console.log('Attempting restart on second attempt...');
                                            recognitionRef.current.start();
                                            console.log('Speech recognition restarted on second attempt');
                                        } catch (retryError) {
                                            console.error('Failed to restart recognition on retry:', retryError);
                                            // Final attempt with longer delay
                                            setTimeout(() => {
                                                if (isAnswering && recognitionRef.current) {
                                                    try {
                                                        console.log('Final restart attempt...');
                                                        recognitionRef.current.start();
                                                        console.log('Speech recognition restarted on final attempt');
                                                    } catch (finalError) {
                                                        console.error('All restart attempts failed:', finalError);
                                                        setIsAnswering(false);
                                                        setModalTitle('Speech Recognition Error');
                                                        setModalMessage('Speech recognition stopped unexpectedly. Please try the voice button again.');
                                                        setShowErrorModal(true);
                                                    }
                                                }
                                            }, 1000);
                                        }
                                    }
                                }, 100);
                            }
                        }
                    }, 50); // Increased from 10ms to 50ms for more reliable restart
                } else {
                    console.log('Speech recognition ended - not restarting as isAnswering is false');
                }
            };
            
            recognitionRef.current = recognition;
            
            try {
                recognition.start();
            } catch (error) {
                console.error('Failed to start recognition:', error);
                setIsAnswering(false);
                setModalTitle('Speech Recognition Error');
                setModalMessage('Failed to start speech recognition. Please try again.');
                setShowErrorModal(true);
            }
        } else {
            setModalTitle('Not Supported');
            setModalMessage('Speech recognition is not supported in this browser.');
            setShowErrorModal(true);
            setIsAnswering(false);
        }
    };

    const handleStopAnswer = async () => {
        setIsAnswering(false);
        
        if (recognitionRef.current) {
            // Remove the onend handler to prevent automatic restart
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
            
            // Process final text after stopping
            setTimeout(async () => {
                // Use textInput which now contains the combined voice + manual input
                if (textInput) {
                    if (language === 'hi') {
                        try {
                            const english = await translateHindiToEnglish(textInput);
                            console.log('English translation of answer:', english);
                        } catch (err) {
                            console.error('Translation failed:', err);
                        }
                    } else {
                        console.log('Recognized:', textInput);
                    }
                }
            }, 100);
        }
    };

    const handleNextQuestion = () => {
        // Stop any ongoing speech recognition
        if (recognitionRef.current && isAnswering) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
            setIsAnswering(false);
        }
        
        // Validate that we have questions and current index is valid
        if (!questions || questions.length === 0) {
            console.error('No questions available');
            setModalTitle('Error');
            setModalMessage('No questions are available. Please try reloading the survey.');
            setShowErrorModal(true);
            return;
        }
        
        if (currentQuestionIndex >= questions.length) {
            console.error('Current question index is out of bounds:', currentQuestionIndex, 'of', questions.length);
            setModalTitle('Error');
            setModalMessage('Invalid question index. Please try reloading the survey.');
            setShowErrorModal(true);
            return;
        }
        
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion || !currentQuestion.id) {
            console.error('Current question is invalid:', currentQuestion);
            setModalTitle('Error');
            setModalMessage('Current question data is invalid. Please try reloading the survey.');
            setShowErrorModal(true);
            return;
        }
        
        // Combine captured text (voice) and text input
        const finalAnswer = textInput.trim() || capturedText || recordedText || '';
        
        console.log('Adding response for question:', currentQuestion.id, 'Answer:', finalAnswer);
        
        setResponses([
            ...responses,
            {
                question_id: currentQuestion.id,
                answer_text: finalAnswer
            }
        ]);
        setCapturedText('');
        setRecordedText('');
        setTextInput('');
        setManualInput(''); // Clear manual input as well
        
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setIsAnswering(false);
        } else {
            // Show mental state question after last regular question
            console.log('Last question answered, showing mental state question');
            console.log('Current question index:', currentQuestionIndex);
            console.log('Total questions:', questions.length);
            setShowMentalStateQuestion(true);
        }
    };

    const handleSubmitSurvey = async () => {
        // Prevent multiple submissions
        if (isSubmitting) return;
        
        console.log('Starting survey submission...');
        setIsSubmitting(true);
        
        let allResponses;
        let mentalStateData = null;
        
        if (showMentalStateQuestion) {
            // Submitting from mental state question
            console.log('Submitting from mental state question, rating:', mentalStateRating);
            const mentalStateOption = MENTAL_STATE_OPTIONS.find(opt => opt.value === mentalStateRating);
            allResponses = responses; // Don't add the mental state as a regular response
            mentalStateData = {
                mental_state_rating: mentalStateRating || undefined,
                mental_state_emoji: mentalStateOption?.emoji,
                mental_state_text_en: mentalStateOption?.textEn,
                mental_state_text_hi: mentalStateOption?.textHi
            };
            console.log('Mental state data:', mentalStateData);
        } else {
            // Direct submit from last question
            const finalAnswer = textInput.trim() || capturedText || recordedText || '';
            
            // Validate current question exists
            if (!questions[currentQuestionIndex] || !questions[currentQuestionIndex].id) {
                setModalTitle('Submission Error');
                setModalMessage('Current question data is invalid. Cannot submit survey.');
                setShowErrorModal(true);
                setIsSubmitting(false);
                return;
            }
            
            allResponses = [
                ...responses,
                {
                    question_id: questions[currentQuestionIndex].id,
                    answer_text: finalAnswer
                }
            ];
        }

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
            // CREDENTIALS ALREADY VERIFIED AT LOGIN - No need to re-verify
            console.log('Submitting survey for authenticated soldier:', soldierData?.force_id);
            
            const response = await apiService.submitSurvey({
                questionnaire_id: questionnaireId,
                responses: translatedResponses,
                force_id: soldierData?.force_id || '',
                password: soldierData?.password || '', // Keep for backend compatibility during transition
                ...mentalStateData // Include mental state data in submission
            });
            
            console.log('Survey submitted successfully:', response.data);
            
            // Stop emotion monitoring and get results first
            const emotionData = await stopEmotionMonitoring(response.data?.session_id);
            
            if (emotionData) {
                console.log('Emotion monitoring data collected:', emotionData);
            }
            
            // Mark survey as completing to prevent re-renders and set success modal FIRST
            console.log('Setting showSuccessModal to true');
            
            // Set all completion states together to prevent race conditions
            setIsCompleting(true);
            setSurveyStarted(false);
            setShowMentalStateQuestion(false); // Hide mental state question
            setShowErrorModal(false); // Ensure error modal is hidden
            setShowStartNote(false); // Ensure start note is hidden
            setIsLoading(false); // Ensure loading is false
            setShowSuccessModal(true); // Set success modal LAST
            successModalShownRef.current = true; // Mark success modal as shown permanently
            
            console.log('Set completion states: isCompleting=true, surveyStarted=false, showMentalStateQuestion=false, showSuccessModal=true');
            
            // IMPORTANT: Don't clear questions array here as it might trigger useEffect
            // setQuestions([]); // DON'T DO THIS
            
            // Don't clear loading states here - let success modal handle navigation
            setModalTitle('Survey Submitted Successfully');
            setModalMessage('Thank you for completing the mental health survey. Your responses have been recorded successfully.');
            console.log('Set modal title and message, submission complete');
        } catch (err: any) {
            console.error('Survey submission error:', err);
            
            // Ensure success modal is not shown on error
            setShowSuccessModal(false);
            setIsCompleting(false); // Reset completing state on error
            
            setModalTitle('Submission Failed');
            setModalMessage(err.response?.data?.error || 'Failed to submit survey. Please try again.');
            setShowErrorModal(true);
            
            // IMPORTANT: Stop emotion monitoring even on error
            if (emotionMonitoringStarted) {
                await stopEmotionMonitoring();
            }
        } finally {
            // Always reset submitting state
            setIsSubmitting(false);
        }
    };

    const handleSuccessModalClose = async () => {
        console.log('Closing success modal and navigating...');
        
        // Stop emotion monitoring if still running
        if (emotionMonitoringStarted) {
            await stopEmotionMonitoring();
        }
        
        // Don't reset success modal state - just navigate away
        // The navigation will unmount the component anyway
        navigate('/soldier/login', { replace: true });
    };

    const handleBackNavigationWarningClose = () => {
        setShowBackNavigationWarning(false);
    };

    // Priority: Show success modal first if it's triggered (even if ref says it was shown)
    if (showSuccessModal || successModalShownRef.current) {
        console.log('Rendering success modal, showSuccessModal:', showSuccessModal, 'successModalShownRef:', successModalShownRef.current);
        console.log('All state values:', {
            showSuccessModal,
            showErrorModal,
            showBackNavigationWarning,
            isCompleting,
            showStartNote,
            isLoading,
            showMentalStateQuestion,
            surveyStarted
        });
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 relative overflow-hidden flex items-center justify-center">
                <div className="w-full max-w-lg mx-auto p-4 relative z-10">
                    <Modal
                        isOpen={showSuccessModal || successModalShownRef.current}
                        onClose={handleSuccessModalClose}
                        title=""
                        type="success"
                    >
                        <div className="text-center py-6">
                            {/* Success Icon with Animation */}
                            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 mb-6 shadow-xl">
                                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white">
                                    <i className="fas fa-check text-3xl text-green-500 animate-pulse"></i>
                                </div>
                            </div>
                            
                            {/* Success Title */}
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                                Survey Submitted Successfully!
                            </h3>
                            
                            {/* Success Message */}
                            <p className="text-gray-600 text-lg mb-6 leading-relaxed px-4">
                                Thank you for completing the mental health survey. Your responses have been recorded successfully and will help us better support your well-being.
                            </p>
                            
                            {/* Decorative Elements */}
                            <div className="flex justify-center space-x-2 mb-6">
                                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                            
                            {/* Action Button */}
                            <button
                                onClick={handleSuccessModalClose}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center mx-auto"
                            >
                                <i className="fas fa-home mr-2"></i>
                                Return to Login
                            </button>
                        </div>
                    </Modal>
                </div>
            </div>
        );
    }

    if (showStartNote && !showErrorModal && !showBackNavigationWarning && !isCompleting && !showSuccessModal) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-6 shadow-xl">
                            <i className="fas fa-check text-white text-3xl"></i>
                        </div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                            Login Successful!
                        </div>
                        <div className="text-lg text-gray-600 font-medium">Starting your mental health survey...</div>
                        <div className="mt-6">
                            <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mx-auto animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (isLoading && !showErrorModal && !showBackNavigationWarning && !isCompleting && !showSuccessModal) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-xl">
                            <i className="fas fa-heart text-white text-3xl animate-pulse"></i>
                        </div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                            Loading Survey...
                        </div>
                        
                        {/* OPTIMIZATION: Progressive loading feedback */}
                        <div className="text-lg text-gray-600 font-medium mb-4">
                            {loadingProgress.step}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${loadingProgress.progress}%` }}
                            ></div>
                        </div>
                        
                        <div className="flex items-center justify-center space-x-2 text-blue-600 text-sm">
                            <i className="fas fa-rocket"></i>
                            <span>Fast loading - Emotion monitoring in background</span>
                        </div>
                        
                        <div className="mt-4">
                            <div className="flex justify-center space-x-1">
                                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Mental State Question UI - but only if success modal is not showing
    if (showMentalStateQuestion && !showSuccessModal && !showErrorModal) {
        console.log('Rendering mental state question, showMentalStateQuestion:', showMentalStateQuestion);
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 relative overflow-hidden flex items-center justify-center">
                {/* Background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse"></div>
                    <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-10 animate-bounce"></div>
                    <div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
                </div>
                
                <div className="w-full max-w-4xl mx-auto p-4 relative z-10">
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6">
                        {/* Header with Language Toggle */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex-1">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4 shadow-lg">
                                        <i className="fas fa-brain text-white text-2xl"></i>
                                    </div>
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                                        {language === 'en' ? 'Mental State Assessment' : 'मानसिक स्थिति मूल्यांकन'}
                                    </h2>
                                    <p className="text-gray-600">
                                        {language === 'en' 
                                            ? 'How would you describe your overall current mental state?' 
                                            : 'आप अपनी वर्तमान मानसिक स्थिति का वर्णन कैसे करेंगे?'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Language Toggle */}
                            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-1 rounded-xl shadow-lg">
                                <div className="inline-flex rounded-lg shadow-sm overflow-hidden" role="group">
                                    <button
                                        type="button"
                                        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                            language === 'en' 
                                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transform scale-105' 
                                                : 'bg-white/80 text-gray-700 hover:bg-white hover:text-purple-600'
                                        } rounded-l-lg border-r border-gray-200`}
                                        onClick={() => setLanguage('en')}
                                    >
                                        <i className="fas fa-globe-americas mr-2"></i>
                                        English
                                    </button>
                                    <button
                                        type="button"
                                        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                            language === 'hi' 
                                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg transform scale-105' 
                                                : 'bg-white/80 text-gray-700 hover:bg-white hover:text-orange-600'
                                        } rounded-r-lg`}
                                        onClick={() => setLanguage('hi')}
                                    >
                                        <i className="fas fa-language mr-2"></i>
                                        हिंदी
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mental State Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
                            {MENTAL_STATE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setMentalStateRating(option.value)}
                                    className={`p-4 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                                        mentalStateRating === option.value
                                            ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg scale-105'
                                            : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                                    }`}
                                    style={{
                                        borderColor: mentalStateRating === option.value ? option.color : undefined,
                                        backgroundColor: mentalStateRating === option.value ? `${option.color}10` : undefined
                                    }}
                                >
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">{option.emoji}</div>
                                        <div className="text-sm font-semibold text-gray-800">
                                            {language === 'en' ? option.textEn : option.textHi}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {option.value}/7
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Progress Indicator */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200 shadow-inner mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    {language === 'en' ? 'Final Step' : 'अंतिम चरण'}
                                </span>
                                <span className="text-sm font-semibold text-green-600">
                                    {language === 'en' ? 'Almost Complete!' : 'लगभग पूरा!'}
                                </span>
                            </div>
                            <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-2 shadow-inner">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full w-full transition-all duration-500"></div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={handleSubmitSurvey}
                                className={`py-3 px-8 rounded-xl font-semibold shadow-lg transition-all duration-200 ${
                                    isSubmitting 
                                        ? 'bg-gradient-to-r from-purple-800 to-pink-800 text-white cursor-not-allowed' 
                                        : mentalStateRating 
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:scale-105' 
                                            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed'
                                }`}
                                disabled={isSubmitting || !mentalStateRating}
                            >
                                <div className="flex items-center justify-center">
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            <span>{language === 'en' ? 'Submitting...' : 'जमा कर रहे हैं...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check mr-2"></i>
                                            <span>{language === 'en' ? 'Complete Survey' : 'सर्वेक्षण पूरा करें'}</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Error Modal for Mental State Question */}
                <ErrorModal
                    isOpen={showErrorModal}
                    onClose={() => setShowErrorModal(false)}
                    title={modalTitle}
                    message={modalMessage}
                    onRetry={() => setShowErrorModal(false)}
                />
            </div>
        );
    }

    // Safety check: Ensure questions are properly loaded before rendering survey
    if (!questions || questions.length === 0 || currentQuestionIndex >= questions.length) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mb-6 shadow-xl">
                            <i className="fas fa-exclamation-triangle text-white text-3xl"></i>
                        </div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-3">
                            Survey Data Error
                        </div>
                        <div className="text-lg text-gray-600 font-medium mb-6">Unable to load survey questions properly</div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        >
                            <i className="fas fa-refresh mr-2"></i>
                            Reload Survey
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-10 animate-pulse"></div>
                <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-10 animate-bounce"></div>
                <div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
            </div>
            
            <div className="w-full max-w-2xl mx-auto p-4 relative z-10">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5">
                    {/* Header with Language Toggle */}
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mr-2 shadow-lg flex items-center justify-center">
                                <i className="fas fa-heart text-white text-sm"></i>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Mental Health Survey
                                </h1>
                                <p className="text-gray-600 text-xs">Your well-being matters to us</p>
                            </div>
                        </div>
                        
                        {/* Language Toggle */}
                        <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-1 rounded-xl shadow-lg">
                            <div className="inline-flex rounded-lg shadow-sm overflow-hidden" role="group">
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                        language === 'en' 
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105' 
                                            : 'bg-white/80 text-gray-700 hover:bg-white hover:text-blue-600'
                                    } rounded-l-lg border-r border-gray-200`}
                                    onClick={() => setLanguage('en')}
                                >
                                    <i className="fas fa-globe-americas mr-2"></i>
                                    English
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                        language === 'hi' 
                                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg transform scale-105' 
                                            : 'bg-white/80 text-gray-700 hover:bg-white hover:text-orange-600'
                                    } rounded-r-lg`}
                                    onClick={() => setLanguage('hi')}
                                >
                                    <i className="fas fa-language mr-2"></i>
                                    हिंदी
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-2.5 border border-gray-200 shadow-inner mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center">
                                <div className="w-5 h-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-white text-xs font-bold">{currentQuestionIndex + 1}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <i className="fas fa-chart-line mr-1 text-green-600"></i>
                                <span className="text-sm font-semibold text-green-600">
                                    {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-1.5 shadow-inner">
                            <div
                                className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out shadow-lg relative overflow-hidden"
                                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-4 mb-3 border border-gray-200 shadow-xl relative overflow-hidden">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full -mr-12 -mt-12 opacity-50"></div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-green-100 to-blue-100 rounded-full -ml-10 -mb-10 opacity-50"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-start mb-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-2 shadow-lg">
                                    <i className="fas fa-question text-white text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-gray-800 leading-relaxed">
                                        {language === 'en'
                                            ? questions[currentQuestionIndex]?.question_text
                                            : questions[currentQuestionIndex]?.question_text_hindi}
                                    </h2>
                                </div>
                            </div>
                            
                            {/* Combined Voice and Text Input */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-gray-700">Your Response</label>
                                    <div className="flex items-center space-x-2">
                                        {isAnswering && (
                                            <div className="flex items-center bg-gradient-to-r from-red-50 to-pink-50 px-2 py-1 rounded-full">
                                                <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                                                <span className="text-xs font-semibold text-red-600">Recording</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={isAnswering ? handleStopAnswer : handleStartAnswer}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center ${
                                                isAnswering 
                                                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg transform scale-105' 
                                                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:scale-105'
                                            }`}
                                        >
                                            <i className={`fas ${isAnswering ? 'fa-stop' : 'fa-microphone'} mr-1`}></i>
                                            {isAnswering ? 'Stop' : 'Voice'}
                                        </button>
                                    </div>
                                </div>
                                
                                <textarea
                                    value={textInput || capturedText}
                                    onChange={(e) => handleTextInputChange(e.target.value)}
                                    placeholder={`Type your response here or use voice input... ${language === 'hi' ? '(यहाँ अपना उत्तर टाइप करें या वॉयस इनपुट का उपयोग करें...)' : ''}`}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gradient-to-br from-white to-gray-50 shadow-inner resize-none"
                                    rows={3}
                                />
                                
                                {/* Word Count Warning */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                        {showWordCountWarning && (
                                            <div className="flex items-center bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-200">
                                                <i className="fas fa-exclamation-triangle mr-1 text-amber-600"></i>
                                                <span className="font-medium">
                                                    Please answer in at least {MIN_WORD_COUNT} words
                                                    {language === 'hi' && ' (कृपया कम से कम ५ शब्दों में उत्तर दें)'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-gray-500">
                                        <span className={`font-medium ${getCurrentWordCount() < MIN_WORD_COUNT ? 'text-amber-600' : 'text-green-600'}`}>
                                            {getCurrentWordCount()}/{MIN_WORD_COUNT} words
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex justify-between items-center space-x-3">
                        {/* Next Question Button (always show Next, mental state question will be handled in logic) */}
                        <button
                            onClick={handleNextQuestion}
                            className={`flex-1 py-2.5 px-5 rounded-lg font-semibold shadow-lg transition-all duration-200 ${
                                isAnswerValid() 
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:scale-[1.02]' 
                                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed'
                            }`}
                            disabled={!isAnswerValid()}
                        >
                            <div className="flex items-center justify-center">
                                <i className="fas fa-arrow-right mr-2"></i>
                                <span>
                                    {currentQuestionIndex === questions.length - 1 
                                        ? 'Continue to Final Step' 
                                        : 'Next Question'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <ErrorModal
                isOpen={showErrorModal && !showSuccessModal}
                onClose={() => setShowErrorModal(false)}
                title={modalTitle}
                message={modalMessage}
                onRetry={() => setShowErrorModal(false)}
            />

            {/* Back Navigation Warning Modal */}
            <Modal
                isOpen={showBackNavigationWarning}
                onClose={handleBackNavigationWarningClose}
                title="Navigation Restricted"
                type="warning"
            >
                <div className="text-center py-4">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 mb-4 shadow-lg">
                        <i className="fas fa-exclamation-triangle text-white text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">Cannot Navigate Back</h3>
                    <p className="text-gray-600 mb-6">
                        You cannot go back while the survey is in progress. Please complete and submit the survey first.
                    </p>
                    <button
                        onClick={handleBackNavigationWarningClose}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        Continue Survey
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default SurveyPage;
