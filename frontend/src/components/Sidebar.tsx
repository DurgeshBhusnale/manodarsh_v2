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
        { path: '/admin/add-soldier', label: 'Add User' },
        { path: '/admin/soldiers-data', label: 'Users Data' },
        { path: '/admin/questionnaires', label: 'Questionnaire' },
        { path: '/admin/face-model-management', label: 'User Management' },
        { path: '/admin/settings', label: 'System Settings' },
        { path: '/admin/daily-emotion', label: 'Daily Emotion' },
    ];

    const getIconForLink = (label: string): string => {
        const iconMap: { [key: string]: string } = {
            'Dashboard': 'fa-tachometer-alt',
            'Add User': 'fa-user-plus',
            'Users Data': 'fa-users',
            'Questionnaire': 'fa-clipboard-list',
            'User Management': 'fa-face-grin',
            'System Settings': 'fa-cogs',
            'Daily Emotion': 'fa-smile'
        };
        return iconMap[label] || 'fa-circle';
    };

    return (
        <div className="w-64 h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white hidden md:flex flex-col fixed md:static z-30 border-r border-gray-700/50 shadow-2xl backdrop-blur-xl">
            <div className="p-6">
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <i className="fas fa-shield-alt text-white text-sm"></i>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold bg-gradient-to-r from-orange-400 via-white to-green-400 bg-clip-text text-transparent">CRPF Admin</h2>
                            <p className="text-xs text-gray-400">Dashboard Portal</p>
                        </div>
                    </div>
                </div>

                <nav className="space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`block p-3 rounded-xl transition-all duration-200 ${
                                isActive(link.path)
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02] border border-blue-500/30'
                                    : 'hover:bg-gray-700/50 hover:shadow-md text-gray-300 hover:text-white border border-transparent hover:border-gray-600/30'
                            }`}
                        >
                            <span className="flex items-center">
                                <i className={`fas ${getIconForLink(link.label)} mr-3 text-sm`}></i>
                                {link.label}
                            </span>
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-6 pt-0">
                <button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center"
                >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Logout
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
