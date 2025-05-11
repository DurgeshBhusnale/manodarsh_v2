import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const { logout } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const links = [
        { path: '/admin/dashboard', label: 'Dashboard' },
        { path: '/admin/add-soldier', label: 'Add Soldier' },
        { path: '/admin/soldiers-data', label: 'Soldiers Data' },
        { path: '/admin/questionnaire', label: 'Questionnaire' },
        { path: '/admin/daily-emotion', label: 'Daily Emotion' },
    ];

    return (
        <div className="w-64 h-screen bg-gray-800 text-white p-4">
            <div className="mb-8">
                <h2 className="text-xl font-bold">CRPF Admin</h2>
            </div>

            <nav className="space-y-2">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`block p-2 rounded ${
                            isActive(link.path)
                                ? 'bg-blue-600'
                                : 'hover:bg-gray-700'
                        }`}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            <div className="absolute bottom-4">
                <button
                    onClick={logout}
                    className="text-red-400 hover:text-red-300"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
