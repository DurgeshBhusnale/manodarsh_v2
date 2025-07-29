import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Bars3Icon } from '@heroicons/react/24/outline';

// Dummy data type
interface Soldier {
    force_id: string;
    last_survey: string;
    risk_level: 'low' | 'medium' | 'high';
    depression_score: number;
}

const SoldiersData: React.FC = () => {
    const { isSidebarOpen, toggleSidebar } = useAuth();
    const [filter, setFilter] = useState('all');

    // TODO: Replace with actual API data
    const dummyData: Soldier[] = [
        {
            force_id: '100000001',
            last_survey: '2024-05-09',
            risk_level: 'low',
            depression_score: 0.2,
        },
        {
            force_id: '100000002',
            last_survey: '2024-05-09',
            risk_level: 'medium',
            depression_score: 0.5,
        },
        {
            force_id: '100000003',
            last_survey: '2024-05-08',
            risk_level: 'high',
            depression_score: 0.8,
        },
    ];

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
                        <h1 className="text-lg font-semibold text-gray-900">Personnel Data</h1>
                        <div className="w-10"></div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="hidden md:block mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Personnel Data</h1>
                            <p className="text-gray-600">Monitor and analyze personnel wellness metrics</p>
                        </div>

                        {/* Filters */}
                        <div className="mb-6 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Personnel</h2>
                            <div className="flex flex-wrap gap-4">
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                >
                                    <option value="all">All Personnel</option>
                                    <option value="depressed">Attention Required</option>
                                    <option value="risk">Above Risk Threshold</option>
                                    <option value="pending">Pending Assessment</option>
                                </select>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Force ID
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Last Assessment
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Risk Level
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Wellness Score
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {dummyData.map((soldier) => (
                                            <tr
                                                key={soldier.force_id}
                                                className="hover:bg-gray-50 transition-colors duration-200"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {soldier.force_id}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600">
                                                        {soldier.last_survey}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                                            {
                                                                low: 'bg-green-100 text-green-800 border border-green-200',
                                                                medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
                                                                high: 'bg-red-100 text-red-800 border border-red-200',
                                                            }[soldier.risk_level]
                                                        }`}
                                                    >
                                                        {soldier.risk_level.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="text-sm font-medium text-gray-900 mr-2">
                                                            {soldier.depression_score.toFixed(2)}
                                                        </div>
                                                        <div className="w-16 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className={`h-2 rounded-full ${
                                                                    soldier.depression_score < 0.3 ? 'bg-green-500' :
                                                                    soldier.depression_score < 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${soldier.depression_score * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoldiersData;