import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

const DailyEmotionPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState('');
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleStartMonitoring = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            await apiService.startDailyMonitoring(selectedDate);
            setIsMonitoring(true);
            setError('');
        } catch (error: any) {
            console.error('Failed to start monitoring:', error);
            setError(error.response?.data?.error || 'Failed to start monitoring');
            setIsMonitoring(false);
        } finally {
            setLoading(false);
        }
    };

    const handleEndMonitoring = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            await apiService.endDailyMonitoring(selectedDate);
            setIsMonitoring(false);
        } catch (error) {
            console.error('Failed to end monitoring:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100">
                <h1 className="text-2xl font-bold mb-6">
                    Daily Emotion Detection
                </h1>

                <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">
                            Select Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setError(''); // Clear error when date changes
                            }}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleStartMonitoring}
                            disabled={!selectedDate || isMonitoring || loading}
                            className={`w-full p-2 rounded text-white
                                ${
                                    !selectedDate || isMonitoring
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {loading ? 'Processing...' : 'Start Day'}
                        </button>

                        <button
                            onClick={handleEndMonitoring}
                            disabled={!selectedDate || !isMonitoring || loading}
                            className={`w-full p-2 rounded text-white
                                ${
                                    !selectedDate || !isMonitoring
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {loading ? 'Processing...' : 'End Day'}
                        </button>
                    </div>

                    {isMonitoring && (
                        <div className="mt-6 p-4 bg-green-100 text-green-700 rounded">
                            Monitoring active for {selectedDate}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DailyEmotionPage;