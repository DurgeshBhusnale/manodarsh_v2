import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

interface DashboardStats {
    totalSoldiers?: number;
    activeSurveys?: number;
    highRiskSoldiers?: number;
    criticalAlerts?: number;
    surveyCompletionRate?: number;
    averageMentalHealthScore?: number;
    trendsData?: {
        labels: string[];
        riskLevels: {
            low: number[];
            medium: number[];
            high: number[];
            critical: number[];
        };
    };
}

interface StatCard {
    title: string;
    value: string | number;
    change: number;
    changeType: 'increase' | 'decrease' | 'neutral';
    icon: string;
    color: string;
}

const StatCardComponent: React.FC<StatCard> = ({
    title,
    value,
    change,
    changeType,
    icon,
    color
}) => {
    const getChangeIcon = (changeType: string) => {
        switch (changeType) {
            case 'increase':
                return '↗️';
            case 'decrease':
                return '↘️';
            default:
                return '➡️';
        }
    };

    const getChangeColor = (changeType: string) => {
        switch (changeType) {
            case 'increase':
                return 'text-green-600';
            case 'decrease':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                    
                    <div className="flex items-center mt-2">
                        <span className={`text-sm font-medium ${getChangeColor(changeType)}`}>
                            {getChangeIcon(changeType)} {Math.abs(change)}%
                        </span>
                        <span className="text-sm text-gray-500 ml-2">vs last period</span>
                    </div>
                </div>
                
                <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center text-white text-2xl`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('7d');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        fetchDashboardStats();
        
        // Set up auto-refresh every 5 minutes
        const interval = setInterval(() => {
            fetchDashboardStats();
        }, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [timeframe]);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            // Fetch real data from backend
            const response = await apiService.getDashboardStats(timeframe);
            
            // Ensure all required properties exist with defaults
            const dashboardData: DashboardStats = {
                totalSoldiers: response.data.totalSoldiers || 0,
                activeSurveys: response.data.activeSurveys || 0,
                highRiskSoldiers: response.data.highRiskSoldiers || 0,
                criticalAlerts: response.data.criticalAlerts || 0,
                surveyCompletionRate: response.data.surveyCompletionRate || 0,
                averageMentalHealthScore: response.data.averageMentalHealthScore || 0,
                trendsData: response.data.trendsData || {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    riskLevels: {
                        low: [0, 0, 0, 0, 0, 0, 0],
                        medium: [0, 0, 0, 0, 0, 0, 0],
                        high: [0, 0, 0, 0, 0, 0, 0],
                        critical: [0, 0, 0, 0, 0, 0, 0]
                    }
                }
            };
            
            setStats(dashboardData);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // Fallback to mock data if API fails
            const mockStats: DashboardStats = {
                totalSoldiers: 150,
                activeSurveys: 12,
                highRiskSoldiers: 8,
                criticalAlerts: 2,
                surveyCompletionRate: 85.5,
                averageMentalHealthScore: 0.35,
                trendsData: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    riskLevels: {
                        low: [120, 118, 125, 122, 130, 128, 132],
                        medium: [20, 22, 18, 23, 15, 17, 13],
                        high: [8, 7, 6, 4, 4, 4, 4],
                        critical: [2, 3, 1, 1, 1, 1, 1]
                    }
                }
            };
            setStats(mockStats);
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchDashboardStats();
    };

    const getStatCards = (): StatCard[] => {
        if (!stats) return [];
        
        // Helper function to safely format numbers
        const safeToFixed = (value: any, decimals: number = 1): string => {
            const num = parseFloat(value);
            return isNaN(num) ? '0' : num.toFixed(decimals);
        };
        
        return [
            {
                title: 'Total Soldiers',
                value: stats.totalSoldiers || 0,
                change: 2.5,
                changeType: 'increase',
                icon: '👥',
                color: 'bg-blue-500'
            },
            {
                title: 'Active Surveys',
                value: stats.activeSurveys || 0,
                change: 12.3,
                changeType: 'increase',
                icon: '📋',
                color: 'bg-green-500'
            },
            {
                title: 'High Risk Soldiers',
                value: stats.highRiskSoldiers || 0,
                change: -5.2,
                changeType: 'decrease',
                icon: '⚠️',
                color: 'bg-orange-500'
            },
            {
                title: 'Critical Alerts',
                value: stats.criticalAlerts || 0,
                change: 0,
                changeType: 'neutral',
                icon: '🚨',
                color: 'bg-red-500'
            },
            {
                title: 'Survey Completion',
                value: `${safeToFixed(stats.surveyCompletionRate)}%`,
                change: 8.7,
                changeType: 'increase',
                icon: '✅',
                color: 'bg-purple-500'
            },
            {
                title: 'Avg Mental Health Score',
                value: safeToFixed(stats.averageMentalHealthScore, 2),
                change: -2.1,
                changeType: 'decrease',
                icon: '🧠',
                color: 'bg-indigo-500'
            }
        ];
    };

    if (loading && !stats) {
        return (
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-600">Mental Health Monitoring Overview</p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            {/* Timeframe Selector */}
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 3 Months</option>
                            </select>
                            
                            {/* Refresh Button */}
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                            >
                                <span className={`mr-2 ${loading ? 'animate-spin' : ''}`}>
                                    {loading ? '⟳' : '🔄'}
                                </span>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Last Updated Info */}
                    <div className="mb-6">
                        <p className="text-sm text-gray-500">
                            Last updated: {lastUpdated.toLocaleString()}
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {getStatCards().map((card, index) => (
                            <StatCardComponent key={index} {...card} />
                        ))}
                    </div>

                    {/* Charts and Additional Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Risk Levels Chart */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Risk Level Distribution</h3>
                            {stats && stats.trendsData && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                                            <span>Low Risk</span>
                                        </div>
                                        <span className="font-semibold">
                                            {stats.trendsData.riskLevels.low[stats.trendsData.riskLevels.low.length - 1] || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                                            <span>Medium Risk</span>
                                        </div>
                                        <span className="font-semibold">
                                            {stats.trendsData.riskLevels.medium[stats.trendsData.riskLevels.medium.length - 1] || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                                            <span>High Risk</span>
                                        </div>
                                        <span className="font-semibold">
                                            {stats.trendsData.riskLevels.high[stats.trendsData.riskLevels.high.length - 1] || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                                            <span>Critical Risk</span>
                                        </div>
                                        <span className="font-semibold">
                                            {stats.trendsData.riskLevels.critical[stats.trendsData.riskLevels.critical.length - 1] || 0}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {(!stats || !stats.trendsData) && (
                                <div className="text-center text-gray-500">
                                    <p>No trend data available</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <a href="/admin/soldiers-data" className="block w-full text-left p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                                    <div className="font-medium text-blue-900">📊 View Soldiers Data</div>
                                    <div className="text-sm text-blue-700">Detailed soldier mental health reports</div>
                                </a>
                                
                                <a href="/admin/add-soldier" className="block w-full text-left p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                                    <div className="font-medium text-green-900">👥 Manage Soldiers</div>
                                    <div className="text-sm text-green-700">Add or update soldier profiles</div>
                                </a>
                                
                                <a href="/admin/questionnaire" className="block w-full text-left p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                                    <div className="font-medium text-purple-900">❓ Create Questionnaire</div>
                                    <div className="text-sm text-purple-700">Design new mental health surveys</div>
                                </a>
                                
                                <a href="/admin/settings" className="block w-full text-left p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                                    <div className="font-medium text-orange-900">⚙️ System Settings</div>
                                    <div className="text-sm text-orange-700">Configure system parameters</div>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
                        <div className="space-y-3">
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Survey completed by Soldier #100000001</p>
                                    <p className="text-xs text-gray-500">2 minutes ago</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Medium risk alert triggered</p>
                                    <p className="text-xs text-gray-500">15 minutes ago</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">New questionnaire created</p>
                                    <p className="text-xs text-gray-500">1 hour ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;