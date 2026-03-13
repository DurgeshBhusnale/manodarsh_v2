import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

interface SurveyRecord {
    session_id: number;
    completion_date: string;
    nlp_score: number;
    emotion_score: number;
    combined_score: number;
    mental_state_score: number;
    questionnaire_title: string;
    questionnaire_id: number;
    risk_level?: string;
}

interface SurveyHistoryResponse {
    force_id: string;
    survey_history: SurveyRecord[];
    total_surveys: number;
}

const SoldierSurveyHistory: React.FC = () => {
    const { forceId } = useParams<{ forceId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [surveyHistory, setSurveyHistory] = useState<SurveyRecord[]>([]);
    const [totalSurveys, setTotalSurveys] = useState(0);
    const [error, setError] = useState<string>('');
    const [downloadingPDF, setDownloadingPDF] = useState(false);
    const [downloadingCSV, setDownloadingCSV] = useState(false);
    const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState<string>('');

    useEffect(() => {
        if (forceId) {
            fetchSurveyHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forceId]);

    const fetchSurveyHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiService.getSoldierSurveyHistory(forceId!);
            const data: SurveyHistoryResponse = response.data;
            setSurveyHistory(data.survey_history);
            setTotalSurveys(data.total_surveys);
        } catch (err: any) {
            console.error('Error fetching survey history:', err);
            setError(err.response?.data?.error || 'Failed to load survey history');
        } finally {
            setLoading(false);
        }
    };

    const getRiskLevel = (score: number): { label: string; color: string } => {
        // Support both 0-1 and 0-100 score scales as a fallback
        const isPercentScale = score > 10;
        const s = isPercentScale ? score : score * 100;

        if (s >= 70) return { label: 'CRITICAL', color: 'bg-red-100 text-red-800 border-red-200' };
        if (s >= 50) return { label: 'HIGH', color: 'bg-orange-100 text-orange-800 border-orange-200' };
        if (s >= 30) return { label: 'MEDIUM', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
        return { label: 'LOW', color: 'bg-green-100 text-green-800 border-green-200' };
    };

    const mapRiskLabelToBadge = (risk?: string): { label: string; color: string } => {
        if (!risk) return { label: 'LOW', color: 'bg-green-100 text-green-800 border-green-200' };
        const r = risk.toUpperCase();
        if (r === 'CRITICAL') return { label: 'CRITICAL', color: 'bg-red-100 text-red-800 border-red-200' };
        if (r === 'HIGH') return { label: 'HIGH', color: 'bg-orange-100 text-orange-800 border-orange-200' };
        if (r === 'MID' || r === 'MEDIUM') return { label: 'MID', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
        return { label: 'LOW', color: 'bg-green-100 text-green-800 border-green-200' };
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const downloadFile = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleDownloadPDF = async () => {
        if (!forceId) return;
        setDownloadingPDF(true);
        try {
            const response = await apiService.downloadSoldierHistoryPDF(forceId);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            downloadFile(response.data, `survey_history_${forceId}_${timestamp}.pdf`);
        } catch (error: any) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF report. Please try again.');
        } finally {
            setDownloadingPDF(false);
        }
    };

    const handleDownloadCSV = async () => {
        if (!forceId) return;
        setDownloadingCSV(true);
        try {
            const response = await apiService.downloadSoldierHistoryCSV(forceId);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            downloadFile(response.data, `survey_history_${forceId}_${timestamp}.csv`);
        } catch (error: any) {
            console.error('Error downloading CSV:', error);
            alert('Failed to download CSV report. Please try again.');
        } finally {
            setDownloadingCSV(false);
        }
    };

    const handleDeleteClick = (sessionId: number) => {
        setDeletingSessionId(sessionId);
        setShowDeleteConfirm(true);
        setDeleteError('');
    };

    const handleDeleteConfirm = async () => {
        if (!forceId || !deletingSessionId) return;
        
        try {
            await apiService.deleteSoldierSession(forceId, deletingSessionId);
            
            // Remove the deleted session from the list
            setSurveyHistory(prev => prev.filter(s => s.session_id !== deletingSessionId));
            setTotalSurveys(prev => prev - 1);
            
            setShowDeleteConfirm(false);
            setDeletingSessionId(null);
            setDeleteError('');
        } catch (error: any) {
            console.error('Error deleting session:', error);
            setDeleteError(error.response?.data?.error || 'Failed to delete survey record');
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setDeletingSessionId(null);
        setDeleteError('');
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

                <div className="max-w-7xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl p-5 shadow-xl border border-white/20 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <button
                                    onClick={() => navigate('/admin/soldiers-data')}
                                    className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
                                    title="Back to Users Data"
                                >
                                    <i className="fas fa-arrow-left text-xl"></i>
                                </button>
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                                    <i className="fas fa-user text-white text-lg"></i>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-black tracking-tight">
                                        Survey History - {forceId}
                                    </h1>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Complete mental health assessment records for this user
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-5 py-3 rounded-xl border border-blue-200">
                                    <span className="text-sm font-semibold text-gray-700">Total Surveys:</span>
                                    <span className="ml-2 text-xl font-bold text-blue-600">{totalSurveys}</span>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={downloadingPDF || surveyHistory.length === 0}
                                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                                >
                                    {downloadingPDF ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-file-pdf mr-2"></i>
                                            Download PDF
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleDownloadCSV}
                                    disabled={downloadingCSV || surveyHistory.length === 0}
                                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                                >
                                    {downloadingCSV ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-file-csv mr-2"></i>
                                            Download CSV
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600 font-semibold">Loading survey history...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <i className="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                                    <p className="text-red-600 font-semibold text-lg">{error}</p>
                                    <button
                                        onClick={fetchSurveyHistory}
                                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <i className="fas fa-redo mr-2"></i>Retry
                                    </button>
                                </div>
                            </div>
                        ) : surveyHistory.length === 0 ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <i className="fas fa-inbox text-gray-400 text-5xl mb-4"></i>
                                    <p className="text-gray-600 font-semibold text-lg">No survey records found</p>
                                    <p className="text-gray-500 text-sm mt-2">This user hasn't completed any surveys yet.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-blue-100 to-purple-100 border-b-2 border-blue-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Questionnaire
                                            </th>
                                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Text Score
                                            </th>
                                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Emotion Score
                                            </th>
                                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Combined Score
                                            </th>
                                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Risk Level
                                            </th>
                                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white/50 divide-y divide-gray-200">
                                        {surveyHistory.map((survey, index) => {
                                            const riskLevel = survey.risk_level ? mapRiskLabelToBadge(survey.risk_level) : getRiskLevel(survey.combined_score);
                                            return (
                                                <tr
                                                    key={survey.session_id}
                                                    className={`hover:bg-blue-50/50 transition-colors duration-200 ${
                                                        index % 2 === 0 ? 'bg-white/30' : 'bg-gray-50/30'
                                                    }`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <i className="fas fa-calendar-check text-blue-600 mr-3"></i>
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {formatDate(survey.completion_date)}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Session #{survey.session_id}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <i className="fas fa-clipboard-list text-purple-600 mr-2"></i>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {survey.questionnaire_title}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                                                            <i className="fas fa-comment-dots text-blue-600 mr-2 text-xs"></i>
                                                            <span className="text-sm font-bold text-blue-700">
                                                                {survey.nlp_score.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
                                                            <i className="fas fa-smile text-purple-600 mr-2 text-xs"></i>
                                                            <span className="text-sm font-bold text-purple-700">
                                                                {survey.emotion_score.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
                                                            <i className="fas fa-chart-line text-indigo-600 mr-2 text-xs"></i>
                                                            <span className="text-sm font-bold text-indigo-700">
                                                                {survey.combined_score.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span
                                                            className={`inline-flex items-center px-3 py-1.5 rounded-lg border font-bold text-sm ${riskLevel.color}`}
                                                        >
                                                            {riskLevel.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleDeleteClick(survey.session_id)}
                                                            className="text-red-600 hover:text-red-800 transition-colors"
                                                            title="Delete Survey Record"
                                                        >
                                                            <i className="fas fa-trash text-lg"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                                <div className="text-center">
                                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                        <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Survey Record</h3>
                                    <p className="text-gray-600 mb-6">
                                        Are you sure you want to delete this survey record? This will permanently remove all associated data including responses and cannot be undone.
                                    </p>
                                    
                                    {deleteError && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-sm text-red-600">{deleteError}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={handleDeleteCancel}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteConfirm}
                                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                        >
                                            <i className="fas fa-trash mr-2"></i>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SoldierSurveyHistory;
