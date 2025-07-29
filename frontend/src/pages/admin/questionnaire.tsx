import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { apiService} from '../../services/api';

const QuestionnairePage: React.FC = () => {
    const { isSidebarOpen, toggleSidebar } = useAuth();
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

    const handleCreateQuestionnaire = async (e: React.FormEvent) => {
        e.preventDefault();
        if (numberOfQuestions <= 0) {
            alert('Please enter the number of questions');
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
            // First create the questionnaire
            const questionnaireResponse = await apiService.createQuestionnaire({
                title,
                description,
                isActive,
                numberOfQuestions
            });

            const questionnaireId = questionnaireResponse.data.id;

            // Then add all questions
            for (const q of questions) {
                await apiService.addQuestion({
                    questionnaire_id: questionnaireId,
                    question_text: q.english,
                    question_text_hindi: q.hindi
                });
            }

            // Reset and go back to first step
            handleReset();
        } catch (error) {
            console.error('Failed to save questionnaire:', error);
            alert('Failed to save questionnaire. Please try again.');
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
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={isSidebarOpen} onClose={() => toggleSidebar()} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile header */}
                <div className="md:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
                            aria-label="Open navigation menu"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">Questionnaire</h1>
                        <div className="w-10"></div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="hidden md:block mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Management</h1>
                            <p className="text-gray-600">Create and manage mental health assessments</p>
                        </div>

                        {step === 1 ? (
                            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-2xl mx-auto">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create New Assessment</h2>
                                <form onSubmit={handleCreateQuestionnaire}>
                                    <div className="mb-6">
                                        <label className="block text-gray-700 mb-2 font-medium">
                                            Assessment Title
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                            required
                                            placeholder="Enter assessment title"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-gray-700 mb-2 font-medium">
                                            Description
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                            rows={4}
                                            required
                                            placeholder="Describe the purpose of this assessment"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-gray-700 mb-2 font-medium">
                                            Number of Questions
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={numberOfQuestions}
                                            onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                            required
                                            placeholder="Enter number of questions"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="flex items-center text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="font-medium">Make Assessment Active</span>
                                        </label>
                                        <p className="text-sm text-gray-500 mt-1 ml-7">
                                            Active assessments will be available to personnel
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Processing...' : 'Continue to Add Questions'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                        <div className="mb-6">
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Add Questions</h2>
                            <div className="flex justify-between items-center mb-4">
                                        <p className="text-gray-600 font-medium">
                                    Question {currentQuestionIndex + 1} of {numberOfQuestions}
                                </p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handlePreviousQuestion}
                                        disabled={currentQuestionIndex === 0}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                            currentQuestionIndex === 0
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                                        }`}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={handleNextQuestion}
                                        disabled={currentQuestionIndex === numberOfQuestions - 1 || !questions[currentQuestionIndex]}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                            currentQuestionIndex === numberOfQuestions - 1 || !questions[currentQuestionIndex]
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                                        }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                                        <div 
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentQuestionIndex + 1) / numberOfQuestions) * 100}%` }}
                                />
                            </div>
                        </div>
                        
                        {questions.length > 0 && (
                            <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions Overview:</h3>
                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <tbody>
                                            {questions.map((q, index) => (
                                                <tr 
                                                    key={index}
                                                    className={`border-b last:border-b-0 ${
                                                        index === currentQuestionIndex
                                                                    ? 'bg-blue-50 border-blue-100'
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
                                        <div className="mb-6">
                                            <label className="block text-gray-700 mb-2 font-medium">
                                        Question Text (English)
                                    </label>
                                    <textarea
                                        value={questionText}
                                        onChange={(e) => setQuestionText(e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        rows={4}
                                        placeholder="Enter your question here..."
                                        required
                                    />
                                </div>
                                {questionTextHindi && (
                                            <div className="mb-6">
                                                <label className="block text-gray-700 mb-2 font-medium">Hindi Translation</label>
                                                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 min-h-[48px]">{questionTextHindi}</div>
                                    </div>
                                )}
                                        <div className="flex space-x-4">
                                    <button
                                        type="submit"
                                        disabled={loading || translating}
                                                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading || translating ? 'Translating...' : isEditMode ? 'Update Question' : `Add Question ${currentQuestionIndex + 1}`}
                                    </button>
                                </div>
                            </form>
                        ) : (
                                    <div className="text-center py-8 bg-green-50 rounded-xl border border-green-200">
                                        <p className="text-green-700 font-medium mb-6 text-lg">All questions have been entered. Review them and click 'Create Assessment' when ready.</p>
                                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
                                    <button
                                        onClick={() => setAllQuestionsEntered(false)}
                                                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                                    >
                                        Edit Questions
                                    </button>
                                    <button
                                        onClick={handleSaveQuestionnaire}
                                        disabled={loading}
                                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                                {loading ? 'Creating...' : 'Create Assessment'}
                                    </button>
                                </div>
                            </div>
                        )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionnairePage;