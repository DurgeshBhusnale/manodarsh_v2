import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPhaseFeatures } from '../config/phaseConfig';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'soldier';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    requiredRole = 'admin' 
}) => {
    const { isAuthenticated, user } = useAuth();
    const phaseFeatures = getPhaseFeatures();

    // PHASE 1: Simple authentication check only - no session validation
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
        console.log('🔒 ProtectedRoute: User not authenticated, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    // Check if user has required role
    if (requiredRole && user.role !== requiredRole) {
        console.log(`🔒 ProtectedRoute: User role ${user.role} does not match required role ${requiredRole}`);
        return <Navigate to="/login" replace />;
    }

    // PHASE 2: Would add session timeout checking here
    if (phaseFeatures.SESSION_MONITORING) {
        // Future: Add session expiration check
        console.log('Session monitoring active (Phase 2)');
    }

    return <>{children}</>;
};

export default ProtectedRoute;
