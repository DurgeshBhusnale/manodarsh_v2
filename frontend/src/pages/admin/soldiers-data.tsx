import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

// Mental state options - same as in survey
const MENTAL_STATE_OPTIONS = [
    { 
        value: 1, 
        emoji: '😰', 
        textEn: 'Very Low', 
        textHi: 'बहुत उदास (Bahut Udaas)',
        color: '#dc2626' 
    },
    { 
        value: 2, 
        emoji: '😟', 
        textEn: 'Low', 
        textHi: 'उदास (Udaas)',
        color: '#ea580c' 
    },
    { 
        value: 3, 
        emoji: '😐', 
        textEn: 'Neutral', 
        textHi: 'सामान्य (Saamaanya)',
        color: '#d97706' 
    },
    { 
        value: 4, 
        emoji: '🙂', 
        textEn: 'Slightly Positive', 
        textHi: 'थोड़े खुश (Thode Khush)',
        color: '#65a30d' 
    },
    { 
        value: 5, 
        emoji: '😊', 
        textEn: 'Positive', 
        textHi: 'खुश (Khush)',
        color: '#16a34a' 
    },
    { 
        value: 6, 
        emoji: '😁', 
        textEn: 'Very Positive', 
        textHi: 'बहुत खुश (Bahut Khush)',
        color: '#059669' 
    },
    { 
        value: 7, 
        emoji: '🤩', 
        textEn: 'Excellent', 
        textHi: 'शानदार / बेहद खुश (Shandar / Behad Khush)',
        color: '#0d9488' 
    }
];

// Real data type from backend
interface Soldier {
    force_id: string;
    name: string;
    last_survey_date: string | null;
    risk_level: 'LOW' | 'MID' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
    combined_score: number;
    nlp_score: number;
    image_score: number;
    mental_state: string;
    mental_state_emoji?: string;
    mental_state_text_en?: string;
    mental_state_text_hi?: string;
    mental_state_rating?: number;
    mental_state_score?: number; // Add this field for the score from weekly_sessions
    alert_level: string;
    recommendation: string;
    total_cctv_detections: number;
    avg_cctv_score: number;
    questionnaire_title: string;
}

interface SoldiersResponse {
    soldiers: Soldier[];
    pagination: {
        current_page: number;
        per_page: number;
        total_count: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
    filters: {
        risk_level: string;
        days: string;
    };
    message: string;
}

const SoldiersData: React.FC = () => {
    const [filter, setFilter] = useState('all');
    const [daysFilter, setDaysFilter] = useState('7');
    const [forceIdFilter, setForceIdFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [soldiersData, setSoldiersData] = useState<Soldier[]>([]);
    const [allFilteredData, setAllFilteredData] = useState<Soldier[]>([]);  // Store all filtered data
    const [pagination, setPagination] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingPDF, setDownloadingPDF] = useState(false);
    const [downloadingCSV, setDownloadingCSV] = useState(false);

    const fetchSoldiersData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch paginated data for display
            const response = await apiService.getSoldiersData({
                risk_level: filter,
                days: daysFilter,
                force_id: forceIdFilter.trim() || undefined,
                page: currentPage,
                per_page: 20
            });
            
            const data: SoldiersResponse = response.data;
            setSoldiersData(data.soldiers);
            setPagination(data.pagination);

            // Fetch all data for downloads (without pagination)
            const allDataResponse = await apiService.getSoldiersData({
                risk_level: filter,
                days: daysFilter,
                force_id: forceIdFilter.trim() || undefined,
                page: 1,
                per_page: 10000  // Large number to get all data
            });
            
            setAllFilteredData(allDataResponse.data.soldiers);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch users data');
            console.error('Error fetching users data:', err);
        } finally {
            setLoading(false);
        }
    }, [filter, daysFilter, forceIdFilter, currentPage]);

    useEffect(() => {
        fetchSoldiersData();
    }, [filter, daysFilter, forceIdFilter, currentPage, fetchSoldiersData]);

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleDaysFilterChange = (newDaysFilter: string) => {
        setDaysFilter(newDaysFilter);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleForceIdFilterChange = (newForceId: string) => {
        setForceIdFilter(newForceId);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const getRiskLevelColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
            case 'MID': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Function to get mental state display data from score
    const getMentalStateDisplay = (score: number | undefined) => {
        if (!score || score < 1 || score > 7) {
            return null;
        }
        return MENTAL_STATE_OPTIONS.find(option => option.value === score);
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
        if (allFilteredData.length === 0) {
            alert('No data available to download');
            return;
        }

        setDownloadingPDF(true);
        try {
            const currentFilters = {
                risk_level: filter,
                days: daysFilter,
                force_id: forceIdFilter
            };

            const response = await apiService.downloadSoldiersPDF(allFilteredData, currentFilters);
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `users_report_${timestamp}.pdf`;
            
            downloadFile(response.data, filename);
        } catch (error: any) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF report. Please try again.');
        } finally {
            setDownloadingPDF(false);
        }
    };

    const handleDownloadCSV = async () => {
        if (allFilteredData.length === 0) {
            alert('No data available to download');
            return;
        }

        setDownloadingCSV(true);
        try {
            const currentFilters = {
                risk_level: filter,
                days: daysFilter,
                force_id: forceIdFilter
            };

            const response = await apiService.downloadSoldiersCSV(allFilteredData, currentFilters);
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `users_report_${timestamp}.csv`;
            
            downloadFile(response.data, filename);
        } catch (error: any) {
            console.error('Error downloading CSV:', error);
            alert('Failed to download CSV report. Please try again.');
        } finally {
            setDownloadingCSV(false);
        }
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
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 shadow-xl border border-white/20 mb-6">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <i className="fas fa-users text-white text-xs"></i>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-black tracking-tight">Users Mental Health Report</h1>
                                <p className="text-gray-600 text-sm mt-1">Monitor and analyze soldier mental health data</p>
                            </div>
                        </div>
                    </div>

                {/* Filters */}
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/20 mb-6">
                    <div className="flex items-center mb-4">
                        <i className="fas fa-filter text-lg text-purple-600 mr-2"></i>
                        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">Data Filters</h2>
                    </div>
                    
                    {/* Filter Controls Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Risk Level Filter */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <i className="fas fa-exclamation-triangle mr-2 text-orange-500 text-xs"></i>
                                Risk Level
                            </label>
                            <select
                                value={filter}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm"
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="low">Low Risk</option>
                                <option value="mid">Mid Risk</option>
                                <option value="high">High Risk</option>
                                <option value="critical">Critical Risk</option>
                            </select>
                        </div>

                        {/* Time Period Filter */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <i className="fas fa-calendar-alt mr-2 text-blue-500 text-xs"></i>
                                Time Period
                            </label>
                            <select
                                value={daysFilter}
                                onChange={(e) => handleDaysFilterChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm"
                            >
                                <option value="3">Last 3 Days</option>
                                <option value="7">Last 7 Days</option>
                                <option value="30">Last 30 Days</option>
                                <option value="180">Last 6 Months</option>
                            </select>
                        </div>

                        {/* Force ID Filter */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <i className="fas fa-id-badge mr-2 text-green-500 text-xs"></i>
                                Force ID
                            </label>
                            <input
                                type="text"
                                value={forceIdFilter}
                                onChange={(e) => handleForceIdFilterChange(e.target.value)}
                                placeholder="Enter Force ID..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-sm transition-all duration-200 text-sm"
                            />
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap gap-3">
                        {/* Refresh Button */}
                        <button
                            onClick={fetchSoldiersData}
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center text-sm"
                        >
                            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} mr-2 text-xs`}></i>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>

                        {/* Download PDF Button */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={downloadingPDF || loading || allFilteredData.length === 0}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center text-sm"
                        >
                            {downloadingPDF ? (
                                <>
                                    <i className="fas fa-spinner fa-spin mr-2 text-xs"></i>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-file-pdf mr-2 text-xs"></i>
                                    PDF Report
                                </>
                            )}
                        </button>

                        {/* Download CSV Button */}
                        <button
                            onClick={handleDownloadCSV}
                            disabled={downloadingCSV || loading || allFilteredData.length === 0}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center text-sm"
                        >
                            {downloadingCSV ? (
                                <>
                                    <i className="fas fa-spinner fa-spin mr-2 text-xs"></i>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-file-csv mr-2 text-xs"></i>
                                    CSV Report
                                </>
                            )}
                        </button>

                        {/* View All Data Button */}
                        <button
                            onClick={() => {
                                setFilter('all');
                                setDaysFilter('7');
                                setForceIdFilter('');
                                setCurrentPage(1);
                            }}
                            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center text-sm"
                        >
                            <i className="fas fa-eye mr-2 text-xs"></i>
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50/80 backdrop-blur-xl border border-red-200 text-red-700 px-6 py-4 rounded-2xl shadow-lg">
                        <div className="flex items-center">
                            <i className="fas fa-exclamation-circle text-red-500 mr-3"></i>
                            <div>
                                <strong>Error:</strong> {error}
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Summary */}
                {!loading && allFilteredData.length > 0 && (
                    <div className="mb-6 bg-blue-50/80 backdrop-blur-xl border border-blue-200 text-blue-800 px-6 py-4 rounded-2xl shadow-lg">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                            <div className="flex items-center mb-3 md:mb-0">
                                <i className="fas fa-info-circle text-blue-600 mr-3"></i>
                                <div>
                                    <strong>Total Records Available for Download:</strong> {allFilteredData.length} users
                                    {pagination && (
                                        <span className="ml-4 text-sm">
                                            (Showing {soldiersData.length} of {pagination.total_count} on this page)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                                    Filters Applied: 
                                    {filter !== 'all' && ` Risk: ${filter.toUpperCase()}`}
                                    {daysFilter && ` | Period: ${daysFilter} days`}
                                    {forceIdFilter && ` | Force ID: ${forceIdFilter}`}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 text-center border border-white/20">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                        <p className="text-xl font-semibold text-gray-700">Loading users data...</p>
                        <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the latest information</p>
                    </div>
                )}

                {/* Data Table */}
                {!loading && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <i className="fas fa-id-badge mr-2 text-blue-500"></i>
                                                User Info
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <i className="fas fa-calendar-check mr-2 text-green-500"></i>
                                                Last Survey
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <i className="fas fa-exclamation-triangle mr-2 text-orange-500"></i>
                                                Risk Level
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <i className="fas fa-brain mr-2 text-pink-500"></i>
                                                Mental State
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <i className="fas fa-chart-bar mr-2 text-purple-500"></i>
                                                Scores
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white/50 divide-y divide-gray-200">
                                    {soldiersData.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <i className="fas fa-search text-4xl text-gray-300 mb-4"></i>
                                                    <p className="text-lg font-semibold">No users data found</p>
                                                    <p className="text-sm">Try adjusting your filters to see more results</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        soldiersData.map((soldier, index) => (
                                            <tr key={soldier.force_id} className={`hover:bg-blue-50/50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white/30' : 'bg-gray-50/30'}`}>
                                                {/* Soldier Info */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-sm">
                                                            <i className="fas fa-user text-white text-sm"></i>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {soldier.force_id}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                ID: {index + 1}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Last Survey */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {soldier.last_survey_date ? (
                                                            <span className="flex items-center">
                                                                <i className="fas fa-check-circle text-green-500 mr-2"></i>
                                                                {soldier.last_survey_date}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center text-gray-500">
                                                                <i className="fas fa-times-circle text-red-500 mr-2"></i>
                                                                No survey
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {soldier.questionnaire_title || 'N/A'}
                                                    </div>
                                                </td>

                                                {/* Risk Level */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getRiskLevelColor(soldier.risk_level)} border shadow-sm`}>
                                                        {soldier.risk_level}
                                                    </span>
                                                </td>

                                                {/* Mental State */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        // First check if we have direct mental state data (from mental_state_responses table)
                                                        if (soldier.mental_state_emoji && soldier.mental_state_text_en) {
                                                            return (
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-2xl" title={`Rating: ${soldier.mental_state_rating || 'N/A'}/7`}>
                                                                        {soldier.mental_state_emoji}
                                                                    </span>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-900">
                                                                            {soldier.mental_state_text_en}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {soldier.mental_state_rating}/7
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        // If not, check if we have mental_state_score (from weekly_sessions table)
                                                        const mentalStateData = getMentalStateDisplay(soldier.mental_state_score);
                                                        if (mentalStateData) {
                                                            return (
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-2xl" title={`Rating: ${soldier.mental_state_score}/7`}>
                                                                        {mentalStateData.emoji}
                                                                    </span>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-900">
                                                                            {mentalStateData.textEn}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {soldier.mental_state_score}/7
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        // If no mental state data available
                                                        return (
                                                            <div className="flex items-center space-x-2 text-gray-400">
                                                                <i className="fas fa-question-circle"></i>
                                                                <span className="text-sm">Not assessed</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Scores */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-1">
                                                            <span className="text-xs font-semibold text-gray-600">Combined:</span>
                                                            <span className="text-sm font-bold text-gray-900">{soldier.combined_score.toFixed(3)}</span>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <div className="flex-1 bg-blue-50 rounded px-2 py-1">
                                                                <div className="text-xs text-blue-600 font-medium">NLP</div>
                                                                <div className="text-xs font-bold text-blue-800">{soldier.nlp_score.toFixed(3)}</div>
                                                            </div>
                                                            <div className="flex-1 bg-purple-50 rounded px-2 py-1">
                                                                <div className="text-xs text-purple-600 font-medium">Emotion</div>
                                                                <div className="text-xs font-bold text-purple-800">{soldier.image_score.toFixed(3)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.total_pages > 1 && (
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                                <div className="flex items-center">
                                    <span className="text-sm text-gray-700 flex items-center">
                                        <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                                        Page {pagination.current_page} of {pagination.total_pages} 
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                            {pagination.total_count} total users
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={!pagination.has_prev}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                                    >
                                        <i className="fas fa-chevron-left mr-2"></i>
                                        Previous
                                    </button>
                                    
                                    <span className="text-sm text-gray-500">|</span>
                                    
                                    <button
                                        onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                                        disabled={!pagination.has_next}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                                    >
                                        Next
                                        <i className="fas fa-chevron-right ml-2"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default SoldiersData;