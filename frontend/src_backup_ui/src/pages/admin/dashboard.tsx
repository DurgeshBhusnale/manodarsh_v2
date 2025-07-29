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
    recentSessions?: number;
    trends?: {
        totalSoldiersChange: number;
        activeSurveysChange: number;
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

interface Alert {
    force_id: string;
    name: string;
    unit: string;
    rank?: string;
    score: number;
    timestamp: string;
    severity: string;
    recommendation: string;
    alert_type: string;
}

interface RealtimeData {
    criticalAlerts: Alert[];
    emotionAlerts: Alert[];
    systemHealth: {
        todaySessions: number;
        activeUsersToday: number;
        inactiveSoldiers: number;
        systemStatus: string;
        lastDataUpdate: string;
    };
    totalAlerts: number;
    timestamp: string;
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
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
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
    const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('7d');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [webcamEnabled, setWebcamEnabled] = useState(true);
    const [webcamLoading, setWebcamLoading] = useState(false);

    useEffect(() => {
        fetchDashboardStats();
        fetchRealtimeAlerts();
        fetchWebcamToggle();
        
        // Set up auto-refresh every 30 seconds for alerts, 5 minutes for stats
        const alertsInterval = setInterval(() => {
            fetchRealtimeAlerts();
        }, 30 * 1000);
        
        const statsInterval = setInterval(() => {
            fetchDashboardStats();
        }, 5 * 60 * 1000);
        
        return () => {
            clearInterval(alertsInterval);
            clearInterval(statsInterval);
        };
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
                recentSessions: response.data.recentSessions || 0,
                trends: response.data.trends || {
                    totalSoldiersChange: 0,
                    activeSurveysChange: 0,
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
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // Enhanced fallback to mock data if API fails
            const mockStats: DashboardStats = {
                totalSoldiers: 150,
                activeSurveys: 12,
                highRiskSoldiers: 8,
                criticalAlerts: 2,
                surveyCompletionRate: 85.5,
                averageMentalHealthScore: 0.35,
                recentSessions: 24,
                trends: {
                    totalSoldiersChange: 2.5,
                    activeSurveysChange: 12.3,
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
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    };

    const fetchRealtimeAlerts = async () => {
        try {
            const response = await apiService.getRealtimeAlerts();
            setRealtimeData(response.data);
        } catch (error) {
            console.error('Error fetching real-time alerts:', error);
            // Mock data for demonstration
            const mockRealtimeData: RealtimeData = {
                criticalAlerts: [
                    {
                        force_id: 'CRPF001',
                        name: 'John Doe',
                        unit: 'Alpha Battalion',
                        rank: 'Constable',
                        score: 0.15,
                        timestamp: new Date().toISOString(),
                        severity: 'CRITICAL',
                        recommendation: 'Immediate counseling required',
                        alert_type: 'mental_health'
                    }
                ],
                emotionAlerts: [
                    {
                        force_id: 'CRPF002',
                        name: 'Jane Smith',
                        unit: 'Bravo Company',
                        rank: 'Head Constable',
                        score: 0.25,
                        timestamp: new Date().toISOString(),
                        severity: 'ORANGE',
                        recommendation: 'Monitor emotional state',
                        alert_type: 'emotion_detection'
                    }
                ],
                systemHealth: {
                    todaySessions: 24,
                    activeUsersToday: 89,
                    inactiveSoldiers: 12,
                    systemStatus: 'HEALTHY',
                    lastDataUpdate: new Date().toISOString()
                },
                totalAlerts: 2,
                timestamp: new Date().toISOString()
            };
            setRealtimeData(mockRealtimeData);
        }
    };

    const fetchWebcamToggle = async () => {
        try {
            const response = await apiService.getWebcamToggle();
            setWebcamEnabled(response.data.webcam_enabled);
        } catch (error) {
            console.error('Error fetching webcam toggle:', error);
            // Default to enabled if API fails
            setWebcamEnabled(true);
        }
    };

    const handleWebcamToggle = async () => {
        try {
            setWebcamLoading(true);
            const newState = !webcamEnabled;
            await apiService.setWebcamToggle(newState);
            setWebcamEnabled(newState);
        } catch (error) {
            console.error('Error toggling webcam:', error);
        } finally {
            setWebcamLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchDashboardStats();
        fetchRealtimeAlerts();
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
                icon: '👥',
                color: 'bg-blue-500'
            },
            {
                title: 'Active Surveys',
                value: stats.activeSurveys || 0,
                icon: '📋',
                color: 'bg-green-500'
            },
            {
                title: 'High Risk Soldiers',
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
                title: 'Survey Completion',
                value: `${safeToFixed(stats.surveyCompletionRate)}%`,
                icon: '✅',
                color: 'bg-purple-500'
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
                            {/* Webcam Toggle */}
                            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
                                <span className="text-sm font-medium text-gray-700">
                                    Webcam Feed:
                                </span>
                                <button
                                    onClick={handleWebcamToggle}
                                    disabled={webcamLoading}
                                    aria-label={`Toggle webcam feed ${webcamEnabled ? 'off' : 'on'}`}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        webcamEnabled ? 'bg-blue-600' : 'bg-gray-300'
                                    } ${webcamLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            webcamEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                                <span className={`text-sm font-medium ${
                                    webcamEnabled ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {webcamEnabled ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            
                            {/* Timeframe Selector */}
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

                    {/* Webcam Toggle Info */}
                    {!webcamEnabled && (
                        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                            <div className="flex items-center">
                                <span className="text-yellow-600 mr-2">⚠️</span>
                                <div>
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Webcam Feed Disabled
                                    </h3>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Survey emotion monitoring is currently disabled. Soldiers will not be prompted for webcam access during surveys. This setting is for setup/testing purposes only.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* System Health Status */}
                    {realtimeData?.systemHealth && (
                        <div className="mb-6">
                            <div className={`p-4 rounded-lg border-l-4 ${
                                realtimeData.systemHealth.systemStatus === 'HEALTHY' 
                                    ? 'bg-green-50 border-green-500' 
                                    : 'bg-yellow-50 border-yellow-500'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">System Status: {realtimeData.systemHealth.systemStatus}</h3>
                                        <p className="text-sm text-gray-600">
                                            Active today: {realtimeData.systemHealth.activeUsersToday} users • 
                                            Sessions: {realtimeData.systemHealth.todaySessions} • 
                                            Inactive: {realtimeData.systemHealth.inactiveSoldiers} soldiers
                                        </p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Last updated: {lastUpdated.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {getStatCards().map((card, index) => (
                            <StatCardComponent key={index} {...card} />
                        ))}
                    </div>

                    {/* Enhanced Analytics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Risk Distribution */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Risk Level Distribution</h3>
                            {stats?.riskDistribution && (
                                <div className="space-y-4">
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
                                            <div key={level} className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className={`w-4 h-4 ${colors[level as keyof typeof colors]} rounded mr-3`}></div>
                                                    <span className="capitalize">{level.replace('noData', 'No Data')}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-semibold">{count}</span>
                                                    <span className="text-sm text-gray-500">({percentage}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {(!stats?.riskDistribution) && (
                                <div className="text-center text-gray-500">
                                    <p>No risk distribution data available</p>
                                </div>
                            )}
                        </div>

                        {/* CCTV Monitoring Stats */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">CCTV Monitoring</h3>
                            {stats?.cctvMonitoring && (
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span>Total Detections</span>
                                        <span className="font-semibold">{stats.cctvMonitoring.totalDetections}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Monitored Soldiers</span>
                                        <span className="font-semibold">{stats.cctvMonitoring.monitoredSoldiers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Avg Emotion Score</span>
                                        <span className="font-semibold">{stats.cctvMonitoring.averageEmotionScore}</span>
                                    </div>
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm text-gray-600">
                                            Recent sessions: {stats.recentSessions || 0} in last 24h
                                        </p>
                                    </div>
                                </div>
                            )}
                            {(!stats?.cctvMonitoring) && (
                                <div className="text-center text-gray-500">
                                    <p>No CCTV monitoring data available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Unit Distribution */}
                    {stats?.unitDistribution && stats.unitDistribution.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                            <h3 className="text-lg font-semibold mb-4">Unit Distribution (Top 10)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.unitDistribution.slice(0, 10).map((unit, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                        <span className="text-sm font-medium">{unit.unit}</span>
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                            {unit.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trends Chart Placeholder */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Risk Level Trends</h3>
                        {stats?.trendsData && (
                            <div className="text-center py-8 text-gray-500">
                                <p>📊 Advanced Chart Component</p>
                                <p className="text-sm mt-2">
                                    Data available: {stats.trendsData.labels.join(', ')}
                                </p>
                                <p className="text-xs mt-1">
                                    Total data points: {stats.trendsData.riskLevels.low.reduce((a, b) => a + b, 0)} sessions
                                </p>
                            </div>
                        )}
                        {(!stats?.trendsData) && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No trends data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;