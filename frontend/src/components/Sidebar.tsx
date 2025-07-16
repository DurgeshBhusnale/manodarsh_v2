import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const { logout, user } = useAuth();
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    // Calculate remaining session time (15 minutes total)
    useEffect(() => {
        const updateTimer = () => {
            const loginTimestamp = localStorage.getItem('login_timestamp');
            if (loginTimestamp && user) {
                const now = Date.now();
                const loginTime = parseInt(loginTimestamp);
                const sessionTimeout = 15 * 60 * 1000; // 15 minutes
                const elapsed = now - loginTime;
                const remaining = sessionTimeout - elapsed;

                if (remaining > 0) {
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setTimeRemaining('Expired');
                }
            }
        };

        if (user) {
            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        }
    }, [user]);

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
        { path: '/admin/questionnaire', label: 'Questionnaire' },
        { path: '/admin/survey', label: 'Survey' },
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

            <div className="mt-4 text-sm text-gray-400">
                Session Time Remaining: {timeRemaining}
            </div>

            <div className="absolute bottom-4 w-full pr-4">
                <div className="mb-2 text-xs text-gray-400">
                    <div>Admin: {user?.force_id}</div>
                    <div className={`${timeRemaining.includes('Expired') ? 'text-red-400' : 
                        parseInt(timeRemaining.split(':')[0]) < 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                        Session: {timeRemaining}
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                >
                    🔒 Secure Logout
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
