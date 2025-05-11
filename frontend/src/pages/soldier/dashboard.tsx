import React from 'react';
import { useAuth } from '../../context/AuthContext';

const SoldierDashboard: React.FC = () => {
    const { user } = useAuth();

    const handleStartSurvey = async () => {
        try {
            // TODO: Implement actual API call
            console.log('Starting survey...');
            // await api.post('/api/survey/start');
        } catch (error) {
            console.error('Failed to start survey:', error);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">
                Welcome, Soldier {user?.force_id}!
            </h1>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl mb-4">Daily Mental Health Check</h2>
                <p className="mb-4">
                    Please complete your daily mental health survey.
                </p>
                <button
                    onClick={handleStartSurvey}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Start Survey
                </button>
            </div>
        </div>
    );
};

export default SoldierDashboard;