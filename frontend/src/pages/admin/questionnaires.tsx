import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

interface Questionnaire {
id: number;
title: string;
description: string;
status: string;
total_questions: number;
created_at: string;
}

const AdminQuestionnaires: React.FC = () => {
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<any>(null);
    const [showQuestionnaireDetails, setShowQuestionnaireDetails] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
    const [loading, setLoading] = useState(true);
    const [activatingId, setActivatingId] = useState<number | null>(null);

    useEffect(() => {
        fetchQuestionnaires();
    }, []);

    const fetchQuestionnaires = async () => {
        setLoading(true);
        try {
            const response = await apiService.getQuestionnaires();
            setQuestionnaires(response.data.questionnaires || []);
        } catch (error) {
            setQuestionnaires([]); // fallback
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id: number) => {
        setActivatingId(id);
        try {
            await apiService.activateQuestionnaire(id.toString());
            await fetchQuestionnaires();
        } catch (error) {
        } finally {
            setActivatingId(null);
        }
    };
    // Use React Router for navigation
    const navigate = require('react-router-dom').useNavigate();
    const handleCreateClick = () => {
        navigate('/admin/create-questionnaire');
    };

    const handleQuestionnaireClick = async (questionnaireId: number) => {
        setLoadingDetails(true);
        try {
            const response = await apiService.getQuestionnaireDetails(questionnaireId);
            setSelectedQuestionnaire(response.data.questionnaire);
            setShowQuestionnaireDetails(true);
        } catch (error) {
            setErrorMessage('Failed to load questionnaire details. Please try again.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleBackToList = () => {
        setShowQuestionnaireDetails(false);
        setSelectedQuestionnaire(null);
    };
    // Sort questionnaires: active first, then by created_at desc
    const sortedQuestionnaires = [...questionnaires].sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (a.status !== 'Active' && b.status === 'Active') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100 overflow-y-auto relative">
                <div className="w-full mx-auto">
                    <div className="flex items-center mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">Manage Questionnaires</h1>
                    </div>
                    <div className="flex justify-end mb-8">
                        <button
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold"
                            onClick={handleCreateClick}
                        >
                            + Create Questionnaire
                        </button>
                    </div>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Questionnaire List</h2>
                    </div>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : showQuestionnaireDetails ? (
                        <div className="bg-white rounded-lg shadow-xl p-8 w-[80%] mx-auto relative">
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-3xl font-bold transition"
                                onClick={handleBackToList}
                                title="Close"
                                aria-label="Close details"
                            >
                                &times;
                            </button>
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                                    <span className="text-2xl text-blue-600 font-bold">📋</span>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-800">Questionnaire Details</h2>
                                    <p className="text-gray-500 text-sm">Created: {selectedQuestionnaire && new Date(selectedQuestionnaire.created_at).toLocaleString()}</p>
                                </div>
                                {/* Activate button at top right */}
                                {selectedQuestionnaire && (
                                    selectedQuestionnaire.status !== 'Active' ? (
                                        <button
                                            className={`ml-8 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center ${activatingId === selectedQuestionnaire.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            onClick={async () => {
                                                if (activatingId === selectedQuestionnaire.id) return;
                                                setActivatingId(selectedQuestionnaire.id);
                                                await apiService.activateQuestionnaire(selectedQuestionnaire.id.toString());
                                                setTimeout(async () => {
                                                    const response = await apiService.getQuestionnaireDetails(selectedQuestionnaire.id);
                                                    setSelectedQuestionnaire(response.data.questionnaire);
                                                    fetchQuestionnaires();
                                                    setActivatingId(null);
                                                }, 500);
                                            }}
                                            disabled={activatingId === selectedQuestionnaire.id}
                                        >
                                            {activatingId === selectedQuestionnaire.id ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                                    </svg>
                                                    Activating...
                                                </span>
                                            ) : (
                                                'Activate'
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            className="ml-8 px-4 py-2 bg-green-600 text-white rounded font-semibold cursor-not-allowed opacity-70"
                                            disabled
                                        >
                                            Active
                                        </button>
                                    )
                                )}
                            </div>
                            {loadingDetails ? (
                                <div className="text-center py-8 text-gray-500">Loading details...</div>
                            ) : selectedQuestionnaire ? (
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <div className="mb-6 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-800 mb-1">{selectedQuestionnaire.title}</h2>
                                            <p className="text-gray-500 text-sm">Created: {new Date(selectedQuestionnaire.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedQuestionnaire.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{selectedQuestionnaire.status}</span>
                                    </div>
                                    <div className="mb-4">
                                        <span className="font-semibold text-gray-700">Description:</span>
                                        <span className="ml-2 text-gray-800">{selectedQuestionnaire.description}</span>
                                    </div>
                                    <div className="mb-4 flex items-center gap-4">
                                        <span className="font-semibold text-gray-700">Total Questions:</span>
                                        <span className="ml-2 text-blue-700 font-semibold">{selectedQuestionnaire.total_questions}</span>
                                    </div>
                                    {selectedQuestionnaire.questions && (
                                        <div className="mb-4">
                                            <h3 className="text-md font-semibold text-gray-700 mb-2">Questions</h3>
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full">
                                                    <tbody>
                                                        {selectedQuestionnaire.questions.map((q: any, idx: number) => (
                                                            <tr key={q.id} className={`border-b last:border-b-0 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                                                <td className="py-2 px-3 text-sm font-medium text-gray-600">Q{idx + 1}:</td>
                                                                <td className="py-2 px-3 text-sm text-gray-800">{q.question_text}</td>
                                                                <td className="py-2 px-3 text-sm text-gray-500">{q.question_text_hindi}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">No details found.</div>
                            )}
                        </div>
                    ) : (
                        <table className="w-full bg-white rounded-lg shadow-md">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2 text-left">Title</th>
                                    <th className="px-4 py-2 text-left">Description</th>
                                    <th className="px-4 py-2 text-center">Status</th>
                                    <th className="px-4 py-2 text-center">Questions</th>
                                    <th className="px-4 py-2 text-center">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedQuestionnaires.map(q => (
                                    <tr key={q.id} className={q.status === 'Active' ? 'bg-blue-50' : ''}
                                        onClick={() => handleQuestionnaireClick(q.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className="px-4 py-2 font-medium">{q.title}</td>
                                        <td className="px-4 py-2">{q.description}</td>
                                        <td className="px-4 py-2 text-center">
                                            {q.status === 'Active' ? (
                                                <span className="text-green-600 font-semibold">Active</span>
                                            ) : (
                                                <span className="text-gray-500">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-center">{q.total_questions}</td>
                                        <td className="px-4 py-2 text-center text-sm text-gray-600">{new Date(q.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {/* The create questionnaire modal is now replaced by navigation to a dedicated page. */}
                </div>
            </div>
        </div>
    );
};

export default AdminQuestionnaires;
