import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

const QuestionnairePage: React.FC = () => {
    const [step, setStep] = useState(1);
    const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [questions, setQuestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleCreateQuestionnaire = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await apiService.createQuestionnaire({
                title,
                description
            });
            setQuestionnaireId(response.data.id);
            setStep(2);
        } catch (error) {
            console.error('Failed to create questionnaire:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!questionnaireId || !questionText.trim()) return;

        setLoading(true);
        try {
            await apiService.addQuestion({
                questionnaire_id: questionnaireId,
                question_text: questionText
            });
            setQuestions([...questions, questionText]);
            setQuestionText('');
        } catch (error) {
            console.error('Failed to add question:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100">
                <h1 className="text-2xl font-bold mb-6">
                    Questionnaire Management
                </h1>

                {step === 1 ? (
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

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                            >
                                {loading ? 'Creating...' : 'Create Questionnaire'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
                        <h2 className="text-xl mb-4">Add Questions</h2>
                        
                        {questions.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg mb-2">Added Questions:</h3>
                                <ul className="list-disc pl-5">
                                    {questions.map((q, index) => (
                                        <li key={index} className="mb-1">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <form onSubmit={handleAddQuestion}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">
                                    Question Text
                                </label>
                                <textarea
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    rows={3}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
                            >
                                {loading ? 'Adding...' : 'Add Question'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionnairePage;