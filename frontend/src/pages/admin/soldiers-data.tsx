import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

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

    const fetchSoldiersData = async () => {
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
            setError(err.response?.data?.error || 'Failed to fetch soldiers data');
            console.error('Error fetching soldiers data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSoldiersData();
    }, [filter, daysFilter, forceIdFilter, currentPage]);

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
            case 'LOW': return 'bg-green-100 text-green-800';
            case 'MID': return 'bg-yellow-100 text-yellow-800';
            case 'HIGH': return 'bg-orange-100 text-orange-800';
            case 'CRITICAL': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getAlertLevelColor = (alertLevel: string) => {
        switch (alertLevel) {
            case 'GREEN': return 'bg-green-100 text-green-800';
            case 'YELLOW': return 'bg-yellow-100 text-yellow-800';
            case 'ORANGE': return 'bg-orange-100 text-orange-800';
            case 'RED': return 'bg-red-100 text-red-800';
            case 'CRITICAL': return 'bg-red-200 text-red-900';
            default: return 'bg-gray-100 text-gray-800';
        }
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
            const filename = `soldiers_report_${timestamp}.pdf`;
            
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
            const filename = `soldiers_report_${timestamp}.csv`;
            
            downloadFile(response.data, filename);
        } catch (error: any) {
            console.error('Error downloading CSV:', error);
            alert('Failed to download CSV report. Please try again.');
        } finally {
            setDownloadingCSV(false);
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100">
                <h1 className="text-2xl font-bold mb-6">Soldiers Mental Health Report</h1>

                {/* Filters */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold mb-4">Filters</h2>
                    <div className="flex gap-4 flex-wrap">
                        {/* Risk Level Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                            <select
                                value={filter}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                className="p-2 border rounded"
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="low">Low Risk</option>
                                <option value="mid">Mid Risk</option>
                                <option value="high">High Risk</option>
                                <option value="critical">Critical Risk</option>
                            </select>
                        </div>

                        {/* Time Period Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                            <select
                                value={daysFilter}
                                onChange={(e) => handleDaysFilterChange(e.target.value)}
                                className="p-2 border rounded"
                            >
                                <option value="3">Last 3 Days</option>
                                <option value="7">Last 7 Days</option>
                                <option value="30">Last 30 Days</option>
                                <option value="180">Last 6 Months</option>
                            </select>
                        </div>

                        {/* Force ID Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Force ID</label>
                            <input
                                type="text"
                                value={forceIdFilter}
                                onChange={(e) => handleForceIdFilterChange(e.target.value)}
                                placeholder="Enter Force ID..."
                                className="p-2 border rounded w-40"
                            />
                        </div>

                        {/* Refresh Button */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                            <button
                                onClick={fetchSoldiersData}
                                disabled={loading}
                                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>

                        {/* Download PDF Button */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={downloadingPDF || loading || allFilteredData.length === 0}
                                className="p-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                {downloadingPDF ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        📄 Download PDF
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Download CSV Button */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                            <button
                                onClick={handleDownloadCSV}
                                disabled={downloadingCSV || loading || allFilteredData.length === 0}
                                className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                {downloadingCSV ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        📊 Download CSV
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Data Summary */}
                {!loading && allFilteredData.length > 0 && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded flex justify-between items-center">
                        <div>
                            <strong>Total Records Available for Download:</strong> {allFilteredData.length} soldiers
                            {pagination && (
                                <span className="ml-4 text-sm">
                                    (Showing {soldiersData.length} of {pagination.total_count} on this page)
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                                Filters Applied: 
                                {filter !== 'all' && ` Risk: ${filter.toUpperCase()}`}
                                {daysFilter && ` | Period: ${daysFilter} days`}
                                {forceIdFilter && ` | Force ID: ${forceIdFilter}`}
                            </span>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading soldiers data...</p>
                    </div>
                )}

                {/* Data Table */}
                {!loading && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Soldier Info
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Survey
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Risk Level
                                        </th>
                                        {/* Removed Mental State column */}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Scores
                                        </th>
                                        {/* Removed CCTV Data column */}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {soldiersData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                No soldiers data found for the selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        soldiersData.map((soldier) => (
                                            <tr key={soldier.force_id} className="hover:bg-gray-50">
                                                {/* Soldier Info */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {soldier.force_id}
                                                    </div>
                                                </td>

                                                {/* Last Survey */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {soldier.last_survey_date || 'No survey'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {soldier.questionnaire_title || 'N/A'}
                                                    </div>
                                                </td>

                                                {/* Risk Level */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(soldier.risk_level)}`}>
                                                        {soldier.risk_level}
                                                    </span>
                                                </td>

                                                {/* Removed Mental State cell */}

                                                {/* Scores */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        <div>Combined: <strong>{soldier.combined_score.toFixed(3)}</strong></div>
                                                        <div className="text-xs text-gray-500">
                                                            NLP: {soldier.nlp_score.toFixed(3)} | 
                                                            Emotion: {soldier.image_score.toFixed(3)}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Removed CCTV Data cell */}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.total_pages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                                <div className="flex-1 flex justify-between">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={!pagination.has_prev}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        Previous
                                    </button>
                                    
                                    <span className="text-sm text-gray-700">
                                        Page {pagination.current_page} of {pagination.total_pages} 
                                        ({pagination.total_count} total soldiers)
                                    </span>
                                    
                                    <button
                                        onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                                        disabled={!pagination.has_next}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoldiersData;