import React, { useEffect, useState } from 'react';

interface SystemLoadingScreenProps {
  onSystemReady: () => void;
}

const SystemLoadingScreen: React.FC<SystemLoadingScreenProps> = ({ onSystemReady }) => {
  const [loadingStage, setLoadingStage] = useState(0);
  const [backendReady, setBackendReady] = useState(false);
  const [progress, setProgress] = useState(0);

  const stages = [
    { text: 'Initializing SATHI System...', duration: 2000 },
    { text: 'Starting Backend Server...', duration: 3000 },
    { text: 'Loading AI Models...', duration: 2000 },
    { text: 'Connecting to Database...', duration: 1500 },
    { text: 'Preparing User Interface...', duration: 1000 },
  ];

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + 1;
      });
    }, 100);

    // Check backend health
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000', {
          method: 'GET',
          timeout: 2000
        } as any);
        
        if (response.ok || response.status === 404) {
          // Backend is responding (404 is OK, means server is up)
          setBackendReady(true);
          setProgress(100);
          setTimeout(() => {
            onSystemReady();
          }, 500);
        }
      } catch (error) {
        // Backend not ready yet, will retry
        setTimeout(checkBackend, 2000);
      }
    };

    // Start checking backend after 3 seconds (give it time to start)
    setTimeout(checkBackend, 3000);

    // Stage progression
    let currentStage = 0;
    const stageInterval = setInterval(() => {
      if (currentStage < stages.length - 1 && !backendReady) {
        currentStage++;
        setLoadingStage(currentStage);
      }
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, [backendReady, onSystemReady]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-green-50 to-blue-50 flex items-center justify-center z-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-10 animate-bounce"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
      </div>

      {/* Loading card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-12 max-w-md w-full mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <i className="fas fa-shield-alt text-white text-2xl"></i>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-white to-green-500 bg-clip-text text-transparent mb-2">
            SATHI
          </h1>
          <p className="text-gray-600 font-semibold">Mental Health & Wellness System</p>
          <p className="text-xs text-gray-500 mt-1">Central Reserve Police Force</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full transition-all duration-300 ease-out animate-gradient"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-gray-600 font-medium">Loading System...</p>
            <p className="text-sm text-blue-600 font-bold">{progress}%</p>
          </div>
        </div>

        {/* Loading stage text */}
        <div className="text-center mb-6 min-h-[24px]">
          <p className="text-gray-700 font-medium animate-pulse">
            {stages[loadingStage]?.text}
          </p>
        </div>

        {/* Spinner */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>

        {/* Status message */}
        <div className="mt-6 text-center">
          {backendReady ? (
            <div className="flex items-center justify-center text-green-600">
              <i className="fas fa-check-circle mr-2"></i>
              <span className="font-semibold">System Ready!</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Please wait while we prepare the system for you...
            </p>
          )}
        </div>
      </div>

      {/* Custom CSS for gradient animation */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 2s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default SystemLoadingScreen;
