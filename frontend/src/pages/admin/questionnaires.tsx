import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { apiService } from '../../services/api';

interface Questionnaire {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    isActive: boolean;
}

const AdminQuestionnaires: React.FC = () => {
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
    const [loading, setLoading] = useState(true);
    const [activatingId, setActivatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchQuestionnaires();
    }, []);

    const fetchQuestionnaires = async () => {
        setLoading(true);
        try {
            const response = await apiService.getQuestionnaires();
            setQuestionnaires(response.data);
        } catch (error) {
            setQuestionnaires([]); // fallback
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id: string) => {
        setActivatingId(id);
        try {
            await apiService.activateQuestionnaire(id);
            await fetchQuestionnaires();
        } catch (error) {
        } finally {
            setActivatingId(null);
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-900">Manage Questionnaires</h1>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : (
                        <table className="min-w-full bg-white rounded-lg shadow-md">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2 text-left">Title</th>
                                    <th className="px-4 py-2 text-left">Created</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-left">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questionnaires.map(q => (
                                    <tr key={q.id} className={q.isActive ? 'bg-blue-50' : ''}>
                                        <td className="px-4 py-2 font-medium">{q.title}</td>
                                        <td className="px-4 py-2">{new Date(q.createdAt).toLocaleString()}</td>
                                        <td className="px-4 py-2">
                                            {q.isActive ? (
                                                <span className="text-green-600 font-semibold">Active</span>
                                            ) : (
                                                <span className="text-gray-500">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {!q.isActive && (
                                                <button
                                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                                                    onClick={() => handleActivate(q.id)}
                                                    disabled={!!activatingId}
                                                >
                                                    {activatingId === q.id ? 'Activating...' : 'Activate'}
                                                </button>
                                            )}
                                            {q.isActive && (
                                                <span className="px-4 py-2 text-xs text-blue-700">Currently Active</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminQuestionnaires;
