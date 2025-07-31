import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const { logout } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        setShowLogoutModal(false);
        logout();
    };

    const cancelLogout = () => {
        setShowLogoutModal(false);
    };

    const links = [
        { path: '/admin/dashboard', label: 'Dashboard' },
        { path: '/admin/add-soldier', label: 'Add Soldier' },
        { path: '/admin/soldiers-data', label: 'Soldiers Data' },
        { path: '/admin/questionnaires', label: 'Questionnaire' },
        { path: '/admin/settings', label: 'System Settings' },
        { path: '/admin/survey', label: 'Survey' },
        { path: '/admin/daily-emotion', label: 'Daily Emotion' },
    ];

    return (
        <div className="w-64 h-screen bg-gray-800 text-white flex-col hidden md:flex fixed md:static z-30">
            <div className="p-4">
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
            </div>

            <div className="mt-auto p-4">
                <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                >
                    🔒 Logout
                </button>
            </div>

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                isOpen={showLogoutModal}
                onClose={cancelLogout}
                onConfirm={confirmLogout}
                title="Confirm Logout"
                message="Are you sure you want to logout? This will end your current session and you'll need to log in again to access the admin panel."
                confirmText="Yes, Logout"
                cancelText="Stay Logged In"
                type="warning"
                icon="🔐"
            />
        </div>
    );
};

export default Sidebar;
