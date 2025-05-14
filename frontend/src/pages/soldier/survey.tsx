import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

interface Question {
    id: number;
    question_text: string;
    questionnaire_id: number;
}

interface SurveyResponse {
    question_id: number;
    answer_text: string;
}

const SurveyPage: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnswering, setIsAnswering] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchActiveQuestionnaire = async () => {
            try {
                const response = await apiService.getActiveQuestionnaire();
                setQuestions(response.data.questions);
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
        // TODO: This is where recording functionality will be implemented
        console.log('Started answering question', currentQuestionIndex + 1);
    };

    const handleStopAnswer = () => {
        setIsAnswering(false);
        // TODO: This is where recording will be stopped and processed
        console.log('Stopped answering question', currentQuestionIndex + 1);
    };

    const handleNextQuestion = () => {
        // Add dummy response for now
        setResponses([
            ...responses,
            {
                question_id: questions[currentQuestionIndex].id,
                answer_text: "Answered via voice"
            }
        ]);
        
        // Move to next question
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setIsAnswering(false);
        }
    };

    const handleSubmitSurvey = () => {
        // Add the last answer
        setResponses([
            ...responses,
            {
                question_id: questions[currentQuestionIndex].id,
                answer_text: "Answered via voice"
            }
        ]);

        // For now, just navigate back
        navigate('/soldier/dashboard');
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
                            {questions[currentQuestionIndex]?.question_text}
                        </h2>
                        
                        {/* Answer Status Indicator */}
                        {isAnswering && (
                            <div className="flex items-center justify-center text-green-600 mb-4">
                                <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
                                <span>Recording your answer...</span>
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
                                Start Answer
                            </button>
                        ) : (
                            <button
                                onClick={handleStopAnswer}
                                className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="8" y="8" width="8" height="8" fill="currentColor" />
                                </svg>
                                Stop Answer
                            </button>
                        )}

                        {/* Next Question or Submit Button */}
                        {currentQuestionIndex === questions.length - 1 ? (
                            <button
                                onClick={handleSubmitSurvey}
                                className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Submit Survey
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
