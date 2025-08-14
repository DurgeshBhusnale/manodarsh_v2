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
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
    const [loading, setLoading] = useState(true);
    const [activatingId, setActivatingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState<string>('');
    const [deleteWarning, setDeleteWarning] = useState<{show: boolean, sessionCount: number}>({show: false, sessionCount: 0});

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
            console.error('Failed to load questionnaire details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleBackToList = () => {
        setShowQuestionnaireDetails(false);
        setSelectedQuestionnaire(null);
    };

    const handleDeleteClick = (questionnaireId: number) => {
        setDeletingId(questionnaireId);
        setShowDeleteConfirm(true);
        setDeleteError('');
        setDeleteWarning({show: false, sessionCount: 0});
    };

    const handleDeleteConfirm = async () => {
        if (!deletingId) return;
        
        try {
            const response = await apiService.deleteQuestionnaire(deletingId, false);
            
            // Check if we got a warning about survey responses
            if (response.data.warning) {
                setDeleteWarning({
                    show: true, 
                    sessionCount: response.data.session_count
                });
                return;
            }
            
            // If no warning, proceed with normal deletion success
            setQuestionnaires(prev => prev.filter(q => q.id !== deletingId));
            
            if (selectedQuestionnaire && selectedQuestionnaire.id === deletingId) {
                setShowQuestionnaireDetails(false);
                setSelectedQuestionnaire(null);
            }
            
            setShowDeleteConfirm(false);
            setDeletingId(null);
            
        } catch (error: any) {
            console.error('Failed to delete questionnaire:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete questionnaire';
            setDeleteError(errorMessage);
        }
    };

    const handleForceDelete = async () => {
        if (!deletingId) return;
        
        try {
            await apiService.deleteQuestionnaire(deletingId, true);
            
            // Remove the deleted questionnaire from the list
            setQuestionnaires(prev => prev.filter(q => q.id !== deletingId));
            
            // If we're viewing the deleted questionnaire's details, go back to list
            if (selectedQuestionnaire && selectedQuestionnaire.id === deletingId) {
                setShowQuestionnaireDetails(false);
                setSelectedQuestionnaire(null);
            }
            
            setShowDeleteConfirm(false);
            setDeletingId(null);
            setDeleteWarning({show: false, sessionCount: 0});
            
        } catch (error: any) {
            console.error('Failed to delete questionnaire:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete questionnaire';
            setDeleteError(errorMessage);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setDeletingId(null);
        setDeleteError('');
        setDeleteWarning({show: false, sessionCount: 0});
    };

    // Sort questionnaires: active first, then by created_at desc
    const sortedQuestionnaires = [...questionnaires].sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (a.status !== 'Active' && b.status === 'Active') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

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

                <div className="max-w-7xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl p-5 shadow-xl border border-white/20 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                        <i className="fas fa-clipboard-list text-white text-xs"></i>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-black tracking-tight">Manage Questionnaires</h1>
                                    <p className="text-gray-600 text-sm mt-1">Create and manage mental health assessment questionnaires</p>
                                </div>
                            </div>
                            <button
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center text-sm"
                                onClick={handleCreateClick}
                            >
                                <i className="fas fa-plus mr-2"></i> <span className="ml-1">Create Questionnaire</span>
                            </button>
                        </div>
                    </div>
                    {/* Questionnaire List */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 mb-8">
                        <div className="p-8">
                            <div className="flex items-center mb-6">
                                <i className="fas fa-list-alt text-purple-600 text-xl mr-3"></i> <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">Questionnaire List</h2>
                            </div>
                            
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                                    <p className="text-xl font-semibold text-gray-700">Loading questionnaires...</p>
                                    <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the questionnaire list</p>
                                </div>
                            ) : showQuestionnaireDetails ? (
                                <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 max-w-4xl mx-auto relative">
                                    <button
                                        className="absolute top-4 right-4 w-10 h-10 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
                                        onClick={handleBackToList}
                                        title="Close"
                                        aria-label="Close details"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                    <div className="flex items-start mb-6 pr-12">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                                            <i className="fas fa-eye text-white"></i>
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Questionnaire Details</h2>
                                            <p className="text-gray-600 text-sm flex items-center mt-1">
                                                <i className="fas fa-calendar-alt mr-2"></i> Created: {selectedQuestionnaire && new Date(selectedQuestionnaire.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Action buttons moved below header */}
                                    {selectedQuestionnaire && (
                                        <div className="mb-6 flex justify-end space-x-3">
                                            {selectedQuestionnaire.status !== 'Active' ? (
                                                <button
                                                    className={`px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center ${activatingId === selectedQuestionnaire.id ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                            Activating...
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-check mr-2"></i> Activate
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold cursor-not-allowed opacity-70 flex items-center"
                                                    disabled
                                                >
                                                    <i className="fas fa-check mr-2"></i> Active
                                                </button>
                                            )}
                                            
                                            {/* Delete Button */}
                                            <button
                                                className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center ${selectedQuestionnaire.status === 'Active' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onClick={() => handleDeleteClick(selectedQuestionnaire.id)}
                                                disabled={selectedQuestionnaire.status === 'Active'}
                                                title={selectedQuestionnaire.status === 'Active' ? 'Cannot delete active questionnaire' : 'Delete questionnaire'}
                                            >
                                                <i className="fas fa-trash mr-2"></i> Delete
                                            </button>
                                        </div>
                                    )}
                                    {loadingDetails ? (
                                        <div className="text-center py-12">
                                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                                            <p className="text-xl font-semibold text-gray-700">Loading details...</p>
                                        </div>
                                    ) : selectedQuestionnaire ? (
                                        <div className="bg-white/40 backdrop-blur-md p-8 rounded-2xl border border-white/30">
                                            <div className="mb-6 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedQuestionnaire.title}</h3>
                                                    <p className="text-gray-600 text-sm flex items-center">
                                                        <i className="fas fa-calendar-alt mr-2"></i> Created: {new Date(selectedQuestionnaire.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span className={`px-4 py-2 rounded-full text-sm font-bold border ${selectedQuestionnaire.status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                    {selectedQuestionnaire.status}
                                                </span>
                                            </div>
                                            <div className="mb-6">
                                                <div className="flex items-center mb-3">
                                                    <i className="fas fa-info-circle text-blue-600 mr-2"></i> <span className="font-semibold text-gray-700">Description:</span>
                                                </div>
                                                <p className="text-gray-800 bg-blue-50/50 p-4 rounded-xl border border-blue-100">{selectedQuestionnaire.description}</p>
                                            </div>
                                            <div className="mb-6 flex items-center gap-6">
                                                <div className="bg-gradient-to-r from-purple-100 to-purple-200 px-4 py-3 rounded-xl border border-purple-200">
                                                    <span className="font-semibold text-purple-700">Total Questions:</span>
                                                    <span className="ml-2 text-purple-800 font-bold text-lg">{selectedQuestionnaire.total_questions}</span>
                                                </div>
                                            </div>
                                            {selectedQuestionnaire.questions && (
                                                <div className="mb-4">
                                                    <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                                                        <i className="fas fa-question-circle text-blue-600 mr-2"></i> <span>Questions</span>
                                                    </h4>
                                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl overflow-hidden border border-white/30">
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                                                                    <th className="py-3 px-4 text-left text-sm font-bold text-gray-700">No.</th>
                                                                    <th className="py-3 px-4 text-left text-sm font-bold text-gray-700">English Question</th>
                                                                    <th className="py-3 px-4 text-left text-sm font-bold text-gray-700">Hindi Translation</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedQuestionnaire.questions.map((q: any, idx: number) => (
                                                                    <tr key={q.id} className={`border-b last:border-b-0 ${idx % 2 === 0 ? 'bg-blue-50/30' : 'bg-white/30'} hover:bg-blue-100/40 transition-colors duration-200`}>
                                                                        <td className="py-3 px-4 text-sm font-bold text-blue-600">Q{idx + 1}</td>
                                                                        <td className="py-3 px-4 text-sm text-gray-800 font-medium">{q.question_text}</td>
                                                                        <td className="py-3 px-4 text-sm text-gray-600">{q.question_text_hindi}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <i className="fas fa-file-alt text-gray-400 text-4xl mb-4"></i> <p className="text-lg font-semibold text-gray-500">No details found.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl shadow-lg border border-white/30">
                                    <table className="w-full bg-white/60 backdrop-blur-sm">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-blue-100 to-purple-100">
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    <div className="flex items-center">
                                                        <i className="fas fa-clipboard-list mr-2"></i> <span>Title</span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Description</th>
                                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    <div className="flex items-center justify-center">
                                                        <i className="fas fa-check-circle mr-2"></i> <span>Status</span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    <div className="flex items-center justify-center">
                                                        <i className="fas fa-question-circle mr-2"></i> <span>Questions</span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    <div className="flex items-center justify-center">
                                                        <i className="fas fa-calendar-alt mr-2"></i> <span>Created</span>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {sortedQuestionnaires.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <i className="fas fa-clipboard-list text-gray-400 text-4xl mb-4"></i> <p className="text-lg font-semibold text-gray-500">No questionnaires found</p>
                                                            <p className="text-sm text-gray-400 mt-2">Create your first questionnaire to get started</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                sortedQuestionnaires.map((q, index) => (
                                                    <tr 
                                                        key={q.id} 
                                                        className={`${q.status === 'Active' ? 'bg-green-50/60' : index % 2 === 0 ? 'bg-white/40' : 'bg-gray-50/40'} hover:bg-blue-100/60 transition-all duration-200 cursor-pointer transform hover:scale-[1.01]`}
                                                        onClick={() => handleQuestionnaireClick(q.id)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <div className={`w-3 h-3 rounded-full mr-3 ${q.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-gray-900">{q.title}</div>
                                                                    {q.status === 'Active' && (
                                                                        <div className="text-xs text-green-600 font-medium">Currently Active</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-700 max-w-xs truncate">{q.description}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${q.status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                                {q.status === 'Active' ? (
                                                                    <>
                                                                        <i className="fas fa-check mr-1"></i> Active
                                                                    </>
                                                                ) : (
                                                                    'Inactive'
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm font-bold rounded-full border border-purple-200">
                                                                {q.total_questions}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="text-sm text-gray-600 font-medium">{new Date(q.created_at).toLocaleDateString()}</div>
                                                            <div className="text-xs text-gray-400">{new Date(q.created_at).toLocaleTimeString()}</div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete Questionnaire</h3>
                            {!deleteWarning.show ? (
                                <p className="text-gray-600 text-sm">
                                    Are you sure you want to delete this questionnaire? This action cannot be undone.
                                </p>
                            ) : (
                                <div className="text-left">
                                    <p className="text-red-600 text-sm font-medium mb-2">
                                        The questionnaire has {deleteWarning.sessionCount} survey responses. 
                                        Deleting the questionnaire will delete those responses too.
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        Do you want to proceed?
                                    </p>
                                </div>
                            )}
                        </div>

                        {deleteError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{deleteError}</p>
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button
                                onClick={handleDeleteCancel}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteWarning.show ? handleForceDelete : handleDeleteConfirm}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200"
                            >
                                {deleteWarning.show ? 'Delete All' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminQuestionnaires;
