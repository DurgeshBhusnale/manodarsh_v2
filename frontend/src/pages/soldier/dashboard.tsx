import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SoldierDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleStartSurvey = () => {
        navigate('/survey');
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to logout:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-800">Soldier Dashboard</h1>
                        <span className="text-gray-600">Hello, {user?.force_id}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid gap-6 mb-8">
                    {/* Welcome Section */}
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome, {user?.force_id}</h2>
                                <p className="text-gray-600">
                                    Complete your weekly mental health assessment to help us better understand and support your well-being.
                                </p>
                            </div>
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                Required
                            </div>
                        </div>
                        <button
                            onClick={handleStartSurvey}
                            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                            <span>Start Survey</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Depression Score */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Weekly Depression Score</h3>
                            <div className="flex items-baseline">
                                <span className="text-2xl font-semibold text-gray-800">Low Risk</span>
                                <span className="ml-2 text-sm text-green-600">Good</span>
                            </div>
                        </div>

                        {/* Weekly Progress */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Surveys Completed</h3>
                            <div className="flex items-baseline">
                                <span className="text-2xl font-semibold text-gray-800">4/4</span>
                                <span className="ml-2 text-sm text-gray-600">This month</span>
                            </div>
                        </div>

                        {/* Next Survey */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Next Survey Due</h3>
                            <div className="flex items-baseline">
                                <span className="text-2xl font-semibold text-gray-800">Today</span>
                                <span className="ml-2 text-sm text-yellow-600">Due</span>
                            </div>
                        </div>
                    </div>

                    {/* Resources Card */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Mental Health Resources</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="mr-4 text-blue-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-800">Stress Management Guide</h3>
                                    <p className="text-sm text-gray-600">Learn effective techniques to manage stress</p>
                                </div>
                            </button>
                            <button 
                                className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="mr-4 text-blue-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-800">Schedule Consultation</h3>
                                    <p className="text-sm text-gray-600">Book a session with mental health professional</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoldierDashboard;