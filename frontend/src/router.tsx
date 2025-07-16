import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/login';
import AdminDashboard from './pages/admin/dashboard';
import AddSoldier from './pages/admin/add-soldier';
import SoldiersData from './pages/admin/soldiers-data';
import QuestionnairePage from './pages/admin/questionnaire';
import DailyEmotionPage from './pages/admin/daily-emotion';
import AdminSurveyPage from './pages/admin/survey';
import SoldierSurveyPage from './pages/soldier/survey';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // PROTECTED ADMIN ROUTES
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/add-soldier',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AddSoldier />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/soldiers-data',
    element: (
      <ProtectedRoute requiredRole="admin">
        <SoldiersData />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/questionnaire',
    element: (
      <ProtectedRoute requiredRole="admin">
        <QuestionnairePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/daily-emotion',
    element: (
      <ProtectedRoute requiredRole="admin">
        <DailyEmotionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/survey',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminSurveyPage />
      </ProtectedRoute>
    ),
  },
  // SOLDIER SURVEY ROUTE (No authentication required as it uses navigation state)
  {
    path: '/soldier/survey',
    element: <SoldierSurveyPage />,
  },
]);