import React from 'react';
import Sidebar from '../../components/Sidebar';

const StatCard: React.FC<{ title: string; value: string | number }> = ({
    title,
    value,
}) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-gray-500 text-sm uppercase">{title}</h3>
        <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
);

const AdminDashboard: React.FC = () => {
    // TODO: Replace with actual API data
    const stats = {
        totalSoldiers: 150,
        surveysCompleted: 89,
        depressedLastWeek: 12,
    };

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100">
                <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
                <div className="grid grid-cols-3 gap-6">
                    <StatCard title="Total Soldiers" value={stats.totalSoldiers} />
                    <StatCard
                        title="Surveys Completed Today"
                        value={stats.surveysCompleted}
                    />
                    <StatCard
                        title="Depressed Last Week"
                        value={stats.depressedLastWeek}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;