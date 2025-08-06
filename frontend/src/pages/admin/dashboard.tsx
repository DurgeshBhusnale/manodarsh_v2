
import React, { useState, useEffect, useCallback } from 'react';
import RiskTrendsChart from '../../components/RiskTrendsChart';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

interface DashboardStats {
    totalSoldiers?: number;
    // REMOVED: activeSurveys (not meaningful - always 1)
    
    // NEW: Current Survey Statistics (meaningful replacement)
    currentSurveyResponses?: number;
    currentSurveyTitle?: string;
    currentSurveyCompletionRate?: number;
    pendingResponses?: number;
    
    // Existing meaningful stats
    highRiskSoldiers?: number;
    criticalAlerts?: number;
    surveyCompletionRate?: number;
    averageMentalHealthScore?: number;
    recentSessions?: number;
    trends?: {
        totalSoldiersChange: number;
        // REMOVED: activeSurveysChange
        currentSurveyResponsesChange?: number;
        pendingResponsesChange?: number;
        highRiskChange: number;
        criticalChange: number;
        completionRateChange: number;
        scoreChange: number;
    };
    riskDistribution?: {
        low: number;
        medium: number;
        high: number;
        critical: number;
        noData: number;
    };
    cctvMonitoring?: {
        totalDetections: number;
        monitoredSoldiers: number;
        averageEmotionScore: number;
    };
    unitDistribution?: Array<{unit: string; count: number}>;
    trendsData?: {
        labels: string[];
        riskLevels: {
            low: number[];
            medium: number[];
            high: number[];
            critical: number[];
        };
    };
    timeframe?: string;
    lastUpdated?: string;
}

interface StatCard {
    title: string;
    value: string | number;
    icon: string;
    color: string;
}

const StatCardComponent: React.FC<StatCard> = ({
    title,
    value,
    icon,
    color
}) => {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 group relative border border-white/20 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 flex items-center mb-2">
                        {title}
                        <span className="ml-2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" title={title + ' info'}>
                            <i className="fas fa-info-circle text-xs"></i>
                        </span>
                    </p>
                    <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">{value}</p>
                </div>
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white text-lg shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
            </div>
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
    );
};



const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('7d');

    const fetchDashboardStats = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch real data from backend
            const response = await apiService.getDashboardStats(timeframe);
            
            // Ensure all required properties exist with defaults
            const dashboardData: DashboardStats = {
                totalSoldiers: response.data.totalSoldiers || 0,
                // REMOVED: activeSurveys
                
                // NEW: Current Survey Statistics
                currentSurveyResponses: response.data.currentSurveyResponses || 0,
                currentSurveyTitle: response.data.currentSurveyTitle || "No Active Survey",
                currentSurveyCompletionRate: response.data.currentSurveyCompletionRate || 0,
                pendingResponses: response.data.pendingResponses || 0,
                
                // Existing stats
                highRiskSoldiers: response.data.highRiskSoldiers || 0,
                criticalAlerts: response.data.criticalAlerts || 0,
                surveyCompletionRate: response.data.surveyCompletionRate || 0,
                averageMentalHealthScore: response.data.averageMentalHealthScore || 0,
                recentSessions: response.data.recentSessions || 0,
                trends: response.data.trends || {
                    totalSoldiersChange: 0,
                    // REMOVED: activeSurveysChange
                    currentSurveyResponsesChange: 0,
                    pendingResponsesChange: 0,
                    highRiskChange: 0,
                    criticalChange: 0,
                    completionRateChange: 0,
                    scoreChange: 0
                },
                riskDistribution: response.data.riskDistribution || {
                    low: 0, medium: 0, high: 0, critical: 0, noData: 0
                },
                cctvMonitoring: response.data.cctvMonitoring || {
                    totalDetections: 0, monitoredSoldiers: 0, averageEmotionScore: 0
                },
                unitDistribution: response.data.unitDistribution || [],
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
        } catch (error) {
            // Enhanced fallback to mock data if API fails
            const mockStats: DashboardStats = {
                totalSoldiers: 150,
                // REMOVED: activeSurveys (replaced with meaningful stats)
                
                // NEW: Mock data for current survey stats
                currentSurveyResponses: 125,
                currentSurveyTitle: "Weekly Mental Health Assessment",
                currentSurveyCompletionRate: 83.3,
                pendingResponses: 25,
                
                highRiskSoldiers: 8,
                criticalAlerts: 2,
                surveyCompletionRate: 85.5,
                averageMentalHealthScore: 0.35,
                recentSessions: 24,
                trends: {
                    totalSoldiersChange: 2.5,
                    // REMOVED: activeSurveysChange (replaced)
                    currentSurveyResponsesChange: 15.2,
                    pendingResponsesChange: -8.3,
                    highRiskChange: -5.2,
                    criticalChange: 0,
                    completionRateChange: 8.7,
                    scoreChange: -2.1
                },
                riskDistribution: {
                    low: 120, medium: 20, high: 8, critical: 2, noData: 0
                },
                cctvMonitoring: {
                    totalDetections: 145, monitoredSoldiers: 98, averageEmotionScore: 0.72
                },
                unitDistribution: [
                    {unit: 'Alpha Battalion', count: 45},
                    {unit: 'Bravo Company', count: 38},
                    {unit: 'Charlie Squadron', count: 32}
                ],
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
        } finally {
            setLoading(false);
        }
    }, [timeframe]);

    useEffect(() => {
        const fetchData = async () => {
            await fetchDashboardStats();
        };
        
        fetchData();
        
        // Set up auto-refresh every 5 minutes for stats
        const statsInterval = setInterval(() => {
            fetchDashboardStats();
        }, 5 * 60 * 1000);
        
        return () => {
            clearInterval(statsInterval);
        };
    }, [timeframe, fetchDashboardStats]); // Now safe to include the memoized function

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
                title: 'Total Users',
                value: stats.totalSoldiers || 0,
                icon: '👥',
                color: 'bg-blue-500'
            },
            {
                title: `Responses: ${stats.currentSurveyTitle || 'No Survey'}`,
                value: `${stats.currentSurveyResponses || 0} (${safeToFixed(stats.currentSurveyCompletionRate)}%)`,
                icon: '�',
                color: 'bg-green-500'
            },
            {
                title: 'Pending Responses',
                value: stats.pendingResponses || 0,
                icon: '⏳',
                color: 'bg-yellow-500'
            },
            {
                title: 'High Risk Users',
                value: stats.highRiskSoldiers || 0,
                icon: '⚠️',
                color: 'bg-orange-500'
            },
            {
                title: 'Critical Alerts',
                value: stats.criticalAlerts || 0,
                icon: '🚨',
                color: 'bg-red-500'
            },
            {
                title: 'Avg Mental Health Score',
                value: safeToFixed(stats.averageMentalHealthScore, 2),
                icon: '🧠',
                color: 'bg-indigo-500'
            }
        ];
    };

    if (loading && !stats) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-orange-50 via-green-50 to-blue-50">
                <Sidebar />
                <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden">
                    {/* Animated Background Elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 animate-pulse"></div>
                        <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-10 animate-bounce"></div>
                    </div>
                    <div className="text-center relative z-10 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-xl font-semibold text-gray-700">Loading dashboard...</p>
                        <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your data</p>
                    </div>
                </div>
            </div>
        );
    }

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
                    <div className="flex flex-col mb-6 bg-white/80 backdrop-blur-xl rounded-xl p-5 shadow-xl border border-white/20">
                        <div className="flex justify-between items-center w-full mb-3">
                            <div>
                                <h1 className="text-2xl font-bold text-black tracking-tight">Dashboard</h1>
                                <p className="text-gray-600 text-sm mt-1">Mental Health Monitoring Overview</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                {/* Timeframe Selector */}
                                <select
                                    value={timeframe}
                                    onChange={(e) => setTimeframe(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm shadow-md transition-all duration-200 text-sm"
                                    aria-label="Select timeframe"
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
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 font-medium text-sm"
                                >
                                    <span className={`mr-2 ${loading ? 'animate-spin' : ''}`}>{loading ? '⟳' : '🔄'}</span>
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Health & Webcam Block removed to avoid duplication */}

                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                        {getStatCards().map((card, index) => (
                            <StatCardComponent key={index} {...card} />
                        ))}
                    </div>

                    {/* Trends Chart Block - full width */}
                    <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/80 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/20 mb-6">
                        <h3 className="text-xl font-bold mb-5 flex items-center bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            <i className="fas fa-chart-line mr-3 text-blue-500"></i>
                            Risk Level Trends 
                            <span className="ml-3 text-blue-400 hover:text-blue-600 cursor-help transition-colors" title="Trends in risk levels over time">
                                <i className="fas fa-info-circle text-sm"></i>
                            </span>
                        </h3>
                        {stats?.trendsData ? (
                          <RiskTrendsChart labels={stats.trendsData.labels} riskLevels={stats.trendsData.riskLevels} />
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <i className="fas fa-chart-line text-3xl mb-3 opacity-50"></i>
                            <p className="text-lg">No trends data available</p>
                          </div>
                        )}
                    </div>

                    {/* Analytics Blocks: Risk Distribution & Unit Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Risk Distribution */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl p-5 border border-white/20">
                            <h3 className="text-lg font-semibold mb-4 flex items-center bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                                <i className="fas fa-chart-pie mr-3 text-orange-500"></i>
                                Risk Level Distribution 
                                <span className="ml-3 text-gray-400 hover:text-gray-600 cursor-help transition-colors" title="Distribution of users by risk level">
                                    <i className="fas fa-info-circle text-sm"></i>
                                </span>
                            </h3>
                            {stats?.riskDistribution && (
                                <div className="space-y-3">
                                    {Object.entries(stats.riskDistribution).map(([level, count]) => {
                                        const total = Object.values(stats.riskDistribution!).reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0';
                                        const colors = {
                                            low: 'bg-green-500',
                                            medium: 'bg-yellow-500',
                                            high: 'bg-orange-500',
                                            critical: 'bg-red-500',
                                            noData: 'bg-gray-500'
                                        };
                                        return (
                                            <div key={level} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors duration-200">
                                                <div className="flex items-center">
                                                    <div className={`w-3 h-3 ${colors[level as keyof typeof colors]} rounded-full mr-3 shadow-sm`} />
                                                    <span className="font-medium capitalize text-gray-700 text-sm">{level.replace('noData', 'No Data')}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-gray-900 text-sm">{count}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {(!stats?.riskDistribution) && (
                                <div className="text-center text-gray-500 py-6">
                                    <i className="fas fa-chart-pie text-3xl mb-3 opacity-50"></i>
                                    <p>No distribution data available</p>
                                </div>
                            )}
                        </div>
                        {/* Unit Distribution */}
                        {stats?.unitDistribution && stats.unitDistribution.length > 0 && (
                            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl p-5 border border-white/20">
                                <h3 className="text-lg font-semibold mb-4 flex items-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                    <i className="fas fa-users mr-3 text-green-500"></i>
                                    Unit Distribution (Top 10)
                                </h3>
                                <div className="space-y-3">
                                    {stats.unitDistribution.slice(0, 10).map((unit, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors duration-200">
                                            <div className="flex items-center">
                                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 shadow-sm">
                                                    {index + 1}
                                                </div>
                                                <span className="font-medium text-gray-700 text-sm">{unit.unit}</span>
                                            </div>
                                            <span className="font-bold text-gray-900 bg-blue-100 px-2 py-1 rounded-full text-xs shadow-sm">
                                                {unit.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;