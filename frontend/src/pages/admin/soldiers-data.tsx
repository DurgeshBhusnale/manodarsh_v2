import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';

// Dummy data type
interface Soldier {
    force_id: string;
    last_survey: string;
    risk_level: 'low' | 'medium' | 'high';
    depression_score: number;
}

const SoldiersData: React.FC = () => {
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
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100">
                <h1 className="text-2xl font-bold mb-6">Soldiers Data</h1>

                {/* Filters */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold mb-4">Filters</h2>
                    <div className="flex gap-4">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="p-2 border rounded"
                        >
                            <option value="all">All Soldiers</option>
                            <option value="depressed">Last Week Depressed</option>
                            <option value="risk">Above Risk Threshold</option>
                            <option value="pending">Pending Survey</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-lg shadow-md">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-3 text-left">Force ID</th>
                                <th className="px-6 py-3 text-left">Last Survey</th>
                                <th className="px-6 py-3 text-left">Risk Level</th>
                                <th className="px-6 py-3 text-left">
                                    Depression Score
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {dummyData.map((soldier) => (
                                <tr
                                    key={soldier.force_id}
                                    className="border-t hover:bg-gray-50"
                                >
                                    <td className="px-6 py-4">
                                        {soldier.force_id}
                                    </td>
                                    <td className="px-6 py-4">
                                        {soldier.last_survey}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded text-sm ${
                                                {
                                                    low: 'bg-green-100 text-green-800',
                                                    medium: 'bg-yellow-100 text-yellow-800',
                                                    high: 'bg-red-100 text-red-800',
                                                }[soldier.risk_level]
                                            }`}
                                        >
                                            {soldier.risk_level}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {soldier.depression_score.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SoldiersData;