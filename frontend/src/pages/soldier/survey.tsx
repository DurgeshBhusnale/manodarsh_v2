import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

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
    const { user } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnswering, setIsAnswering] = useState(false);
    const [hasEndedAnswering, setHasEndedAnswering] = useState(false); // Track if user ended answering
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [recordedText, setRecordedText] = useState('');
    const [capturedText, setCapturedText] = useState('');
    const recognitionRef = useRef<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchActiveQuestionnaire = async () => {
            try {
                const response = await apiService.getActiveQuestionnaire();
                setQuestions(response.data.questions);
                setQuestionnaireId(response.data.questionnaire.id);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch questionnaire:', error);
                setIsLoading(false);
            }
        };

        fetchActiveQuestionnaire();
    }, []);

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
                // Append to capturedText if already present
                setCapturedText(prev => prev ? prev + ' ' + transcript : transcript);
            };
            recognition.onerror = (event: any) => {
                setIsAnswering(false);
                alert('Speech recognition error: ' + event.error);
            };
            recognitionRef.current = recognition;
            recognition.start();
        } else {
            alert('Speech recognition is not supported in this browser.');
            setIsAnswering(false);
        }
    };

    const handleStopAnswer = async () => {
        setIsAnswering(false);
        setHasEndedAnswering(true);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current.onend = async () => {
                // After recognition ends, always translate if Hindi
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
        setResponses([
            ...responses,
            {
                question_id: questions[currentQuestionIndex].id,
                answer_text: capturedText || recordedText || ''
            }
        ]);
        setCapturedText('');
        setRecordedText('');
        setHasEndedAnswering(false);
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setIsAnswering(false);
        }
    };

    const handleSubmitSurvey = async () => {
        // Add the last answer to responses
        const allResponses = [
            ...responses,
            {
                question_id: questions[currentQuestionIndex].id,
                answer_text: capturedText || recordedText || ''
            }
        ];

        // Translate all answers to English if needed
        const translatedResponses = await Promise.all(
            allResponses.map(async (resp) => {
                // If language is Hindi, translate; else keep as is
                // We assume that if the answer is not empty and the language was Hindi, it needs translation
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

        // Submit to backend
        if (!questionnaireId) {
            alert('Questionnaire ID is missing. Cannot submit survey.');
            return;
        }
        try {
            await apiService.submitSurvey({
                questionnaire_id: questionnaireId,
                responses: translatedResponses,
                force_id: user?.force_id
            });
            setHasEndedAnswering(false);
            navigate('/soldier/dashboard');
        } catch (err) {
            alert('Failed to submit survey. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen bg-gray-100">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-lg text-gray-600">Loading survey...</div>
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
                                <label className="block text-gray-700 mb-2">Captured Answer</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg"
                                    rows={3}
                                    value={capturedText}
                                    onChange={e => setCapturedText(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Button Controls - Both buttons in same line */}
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
                                className={`flex-1 py-3 px-6 rounded-lg transition-colors ${hasEndedAnswering ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
                                disabled={!hasEndedAnswering}
                            >
                                Submit Survey
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                className={`flex-1 py-3 px-6 rounded-lg transition-colors ${hasEndedAnswering ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
                                disabled={!hasEndedAnswering}
                            >
                                Next Question
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SurveyPage;
