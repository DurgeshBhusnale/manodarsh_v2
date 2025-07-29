import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    HomeIcon, 
    UserPlusIcon, 
    UsersIcon, 
    DocumentTextIcon, 
    CameraIcon,
    XMarkIcon,
    Bars3Icon
} from '@heroicons/react/24/outline';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { logout } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const links = [
        { 
            path: '/admin/dashboard', 
            label: 'Dashboard', 
            icon: HomeIcon,
            description: 'Overview & Statistics'
        },
        { 
            path: '/admin/add-soldier', 
            label: 'Add Soldier', 
            icon: UserPlusIcon,
            description: 'Register New Personnel'
        },
        { 
            path: '/admin/soldiers-data', 
            label: 'Personnel Data', 
            icon: UsersIcon,
            description: 'View Soldier Records'
        },
        { 
            path: '/admin/questionnaire', 
            label: 'Questionnaire', 
            icon: DocumentTextIcon,
            description: 'Manage Assessments'
        },
        { 
            path: '/admin/daily-emotion', 
            label: 'Emotion Monitor', 
            icon: CameraIcon,
            description: 'Daily Monitoring'
        },
    ];

    const handleLinkClick = () => {
        // Close sidebar on mobile when a link is clicked
        onClose();
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <div 
                className={`
                    fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 
                    transform transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0 md:z-auto
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    shadow-2xl border-r border-slate-700
                `}
                role="navigation"
                aria-label="Main navigation"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">C</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-wide">CRPF</h2>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Admin Panel</p>
                        </div>
                    </div>
                    
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors duration-200"
                        aria-label="Close navigation menu"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.path);
                        
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={handleLinkClick}
                                className={`
                                    group flex items-center px-4 py-3 rounded-lg text-sm font-medium
                                    transition-all duration-200 ease-in-out
                                    ${active 
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25' 
                                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                    }
                                `}
                                aria-current={active ? 'page' : undefined}
                            >
                                <Icon className={`
                                    w-5 h-5 mr-3 transition-transform duration-200
                                    ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                                    group-hover:scale-110
                                `} />
                                <div className="flex-1">
                                    <div className="font-medium">{link.label}</div>
                                    <div className={`
                                        text-xs mt-0.5 transition-colors duration-200
                                        ${active ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-300'}
                                    `}>
                                        {link.description}
                                    </div>
                                </div>
                                
                                {/* Active indicator */}
                                {active && (
                                    <div className="w-2 h-2 bg-white rounded-full opacity-75" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-red-300 hover:text-white hover:bg-red-600/20 rounded-lg transition-all duration-200 border border-red-600/30 hover:border-red-500"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Secure Logout
                    </button>
                    
                    <div className="mt-3 text-center">
                        <p className="text-xs text-slate-500">
                            System Status: <span className="text-green-400 font-medium">Operational</span>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;