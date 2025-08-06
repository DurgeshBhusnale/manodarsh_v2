import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

interface AdvancedFilters {
    riskLevels: string[];
    dateRange: {
        start: string;
        end: string;
    };
    scoreRange: {
        min: number;
        max: number;
    };
    unit: string;
    searchTerm: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    mentalStates: string[];
}

interface FilterPreset {
    id: string;
    name: string;
    description: string;
    filters: Partial<AdvancedFilters>;
}

const AdvancedSoldiersSearch: React.FC = () => {
    const [filters, setFilters] = useState<AdvancedFilters>({
        riskLevels: [],
        dateRange: { start: '', end: '' },
        scoreRange: { min: 0, max: 1 },
        unit: '',
        searchTerm: '',
        sortBy: 'lastSurvey',
        sortOrder: 'desc',
        mentalStates: []
    });

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [savedSearches, setSavedSearches] = useState<FilterPreset[]>([]);
    const [searchName, setSearchName] = useState('');

    // Predefined filter presets
    const filterPresets: FilterPreset[] = [
        {
            id: 'high-risk',
            name: 'High Risk Users',
            description: 'Users with high or critical risk levels',
            filters: {
                riskLevels: ['HIGH', 'CRITICAL'],
                sortBy: 'combined_score',
                sortOrder: 'desc'
            }
        },
        {
            id: 'recent-surveys',
            name: 'Recent Surveys',
            description: 'Users who completed surveys in the last 7 days',
            filters: {
                dateRange: {
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                },
                sortBy: 'lastSurvey',
                sortOrder: 'desc'
            }
        },
        {
            id: 'improvement-needed',
            name: 'Improvement Needed',
            description: 'Users with declining mental health scores',
            filters: {
                scoreRange: { min: 0.5, max: 1 },
                sortBy: 'combined_score',
                sortOrder: 'desc'
            }
        }
    ];

    const handleFilterChange = (key: keyof AdvancedFilters, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleArrayFilterChange = (key: keyof AdvancedFilters, value: string, checked: boolean) => {
        setFilters(prev => {
            const currentArray = prev[key] as string[];
            const newArray = checked 
                ? [...currentArray, value]
                : currentArray.filter(item => item !== value);
            
            return {
                ...prev,
                [key]: newArray
            };
        });
    };

    const performSearch = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiService.searchSoldiers(filters.searchTerm, filters);
            setResults(response.data.soldiers || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const applyPreset = (preset: FilterPreset) => {
        setFilters(prev => ({
            ...prev,
            ...preset.filters
        }));
    };

    const saveCurrentSearch = () => {
        if (searchName.trim()) {
            const newSearch: FilterPreset = {
                id: `custom-${Date.now()}`,
                name: searchName,
                description: 'Custom saved search',
                filters: { ...filters }
            };
            setSavedSearches(prev => [...prev, newSearch]);
            setSearchName('');
        }
    };

    const clearAllFilters = () => {
        setFilters({
            riskLevels: [],
            dateRange: { start: '', end: '' },
            scoreRange: { min: 0, max: 1 },
            unit: '',
            searchTerm: '',
            sortBy: 'lastSurvey',
            sortOrder: 'desc',
            mentalStates: []
        });
    };

    const exportResults = () => {
        // Create CSV export
        const headers = ['Force ID', 'Risk Level', 'Mental State', 'Combined Score', 'Last Survey'];
        const csvContent = [
            headers.join(','),
            ...results.map((soldier: any) => [
                soldier.force_id,
                soldier.risk_level,
                soldier.mental_state,
                soldier.combined_score,
                soldier.last_survey_date
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `users-search-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (filters.searchTerm || filters.riskLevels.length > 0) {
                performSearch();
            }
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [filters, performSearch]);

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Advanced Users Search</h1>
                        <p className="text-gray-600 mt-2">Search and filter users with advanced criteria</p>
                    </div>

                    {/* Quick Filter Presets */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">Quick Filters</h3>
                        <div className="flex flex-wrap gap-3">
                            {filterPresets.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset)}
                                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                    {preset.name}
                                </button>
                            ))}
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Main Search and Filters */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Filters Panel */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                                {/* Search Term */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                    <input
                                        type="text"
                                        value={filters.searchTerm}
                                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                                        placeholder="Search by Force ID..."
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Risk Levels */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Risk Levels</label>
                                    <div className="space-y-2">
                                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(level => (
                                            <label key={level} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.riskLevels.includes(level)}
                                                    onChange={(e) => handleArrayFilterChange('riskLevels', level, e.target.checked)}
                                                    className="mr-2"
                                                />
                                                <span className={`px-2 py-1 text-xs rounded ${
                                                    level === 'LOW' ? 'bg-green-100 text-green-800' :
                                                    level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                                    level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {level}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                                    <div className="space-y-2">
                                        <input
                                            type="date"
                                            value={filters.dateRange.start}
                                            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded"
                                        />
                                        <input
                                            type="date"
                                            value={filters.dateRange.end}
                                            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded"
                                        />
                                    </div>
                                </div>

                                {/* Score Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Score Range: {filters.scoreRange.min.toFixed(2)} - {filters.scoreRange.max.toFixed(2)}
                                    </label>
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={filters.scoreRange.min}
                                            onChange={(e) => handleFilterChange('scoreRange', { ...filters.scoreRange, min: parseFloat(e.target.value) })}
                                            className="w-full"
                                        />
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={filters.scoreRange.max}
                                            onChange={(e) => handleFilterChange('scoreRange', { ...filters.scoreRange, max: parseFloat(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {/* Sort Options */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                    <select
                                        value={filters.sortBy}
                                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded"
                                    >
                                        <option value="lastSurvey">Last Survey</option>
                                        <option value="combined_score">Combined Score</option>
                                        <option value="risk_level">Risk Level</option>
                                        <option value="force_id">Force ID</option>
                                    </select>
                                    <select
                                        value={filters.sortOrder}
                                        onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                                        className="w-full mt-2 p-2 border border-gray-300 rounded"
                                    >
                                        <option value="desc">Descending</option>
                                        <option value="asc">Ascending</option>
                                    </select>
                                </div>

                                {/* Save Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Save Search</label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={searchName}
                                            onChange={(e) => setSearchName(e.target.value)}
                                            placeholder="Search name..."
                                            className="flex-1 p-2 border border-gray-300 rounded text-sm"
                                        />
                                        <button
                                            onClick={saveCurrentSearch}
                                            disabled={!searchName.trim()}
                                            className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Results Panel */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-lg shadow-md">
                                {/* Results Header */}
                                <div className="p-6 border-b">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-semibold">Search Results</h3>
                                            <p className="text-gray-600">{results.length} users found</p>
                                        </div>
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={exportResults}
                                                disabled={results.length === 0}
                                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                                            >
                                                Export CSV
                                            </button>
                                            <button
                                                onClick={performSearch}
                                                disabled={loading}
                                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                {loading ? 'Searching...' : 'Refresh'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Results Table */}
                                <div className="overflow-x-auto">
                                    {loading ? (
                                        <div className="p-8 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="mt-2 text-gray-600">Searching...</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Force ID</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mental State</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combined Score</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Survey</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {results.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                            No users found matching your criteria
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    results.map((soldier: any) => (
                                                        <tr key={soldier.force_id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="font-medium text-gray-900">{soldier.force_id}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                    soldier.risk_level === 'LOW' ? 'bg-green-100 text-green-800' :
                                                                    soldier.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                                                    soldier.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {soldier.risk_level}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm text-gray-900">{soldier.mental_state}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">{soldier.combined_score?.toFixed(3) || 'N/A'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">{soldier.last_survey_date || 'Never'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <button className="text-blue-600 hover:text-blue-900 text-sm">
                                                                    View Details
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedSoldiersSearch;
