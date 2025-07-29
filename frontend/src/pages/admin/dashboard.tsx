import React from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Bars3Icon } from '@heroicons/react/24/outline';

const StatCard: React.FC<{ title: string; value: string | number }> = ({
    title,
    value,
}) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <h3 className="text-gray-600 text-sm uppercase font-semibold tracking-wider">{title}</h3>
        <p className="text-3xl font-bold mt-3 text-gray-800">{value}</p>
        <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
    </div>
);

const AdminDashboard: React.FC = () => {
    const { isSidebarOpen, toggleSidebar } = useAuth();
    
    // TODO: Replace with actual API data
    const stats = {
        totalSoldiers: 150,
        surveysCompleted: 89,
        depressedLastWeek: 12,
    };

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
                        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
                        <div className="w-10"></div> {/* Spacer for centering */}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="hidden md:block mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Command Dashboard</h1>
                            <p className="text-gray-600">Monitor personnel wellness and system status</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <StatCard title="Total Personnel" value={stats.totalSoldiers} />
                            <StatCard title="Assessments Today" value={stats.surveysCompleted} />
                            <StatCard title="Attention Required" value={stats.depressedLastWeek} />
                        </div>

                        {/* Additional dashboard content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">New assessment completed</span>
                                        <span className="text-sm text-gray-500">2 min ago</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Personnel added to system</span>
                                        <span className="text-sm text-gray-500">15 min ago</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-gray-600">Daily monitoring started</span>
                                        <span className="text-sm text-gray-500">1 hour ago</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Database Connection</span>
                                        <span className="flex items-center text-green-600">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                            Online
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Monitoring Service</span>
                                        <span className="flex items-center text-green-600">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                            Active
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Last Backup</span>
                                        <span className="text-gray-500">2 hours ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
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
export default AdminDashboard;