import React, { useState, useEffect } from 'react';

interface MobileLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
}

const MobileResponsiveLayout: React.FC<MobileLayoutProps> = ({ children, sidebar }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    if (isMobile) {
        return (
            <div className="h-screen flex flex-col relative">
                {/* Mobile Header */}
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                    <h1 className="text-lg font-bold">CRPF Admin</h1>
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded hover:bg-gray-700"
                        aria-label="Open sidebar menu"
                        title="Open sidebar menu"
                    >
                        <span className="sr-only">Open sidebar menu</span>
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-40"
                            onClick={toggleSidebar}
                        />
                        <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 z-50 transform transition-transform shadow-lg">
                            {sidebar}
                        </div>
                    </>
                )}

                {/* Mobile Content */}
                <div className="flex-1 overflow-auto p-4 bg-gray-100">
                    {children}
                </div>
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="flex h-screen">
            <div className="w-64 bg-gray-800 hidden md:flex flex-col relative z-20">{sidebar}</div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">{children}</div>
        </div>
    );
};

export default MobileResponsiveLayout;
