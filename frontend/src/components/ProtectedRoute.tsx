import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'soldier';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    requiredRole = 'admin' 
}) => {
    const { isAuthenticated, user } = useAuth();

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has required role
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
