import { createBrowserRouter } from 'react-router-dom';
import LoginPage from './pages/login';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/admin/dashboard';
import AddSoldier from './pages/admin/add-soldier';
import SoldiersData from './pages/admin/soldiers-data';
import QuestionnairePage from './pages/admin/create_questionnaire';
import AdminQuestionnaires from './pages/admin/questionnaires';
import AdminSettings from './pages/admin/settings';
import DailyEmotionPage from './pages/admin/daily-emotion';
import FaceModelManagement from './pages/admin/face-model-management';
import SoldierSurveyPage from './pages/soldier/survey';
import SoldierLoginPage from './pages/soldier/login';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/admin/create-questionnaire',
    element: (
      <ProtectedRoute requiredRole="admin">
        <QuestionnairePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <LandingPage />,
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
    path: '/admin/questionnaires',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminQuestionnaires />
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
    path: '/admin/settings',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminSettings />
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
    path: '/admin/face-model-management',
    element: (
      <ProtectedRoute requiredRole="admin">
        <FaceModelManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/system-monitor',
    element: (
      <ProtectedRoute requiredRole="admin">
        <FaceModelManagement />
      </ProtectedRoute>
    ),
  },
  // USER LOGIN & SURVEY ROUTES (No authentication required)
  {
    path: '/soldier/login',
    element: <SoldierLoginPage />,
  },
  {
    path: '/soldier/survey',
    element: <SoldierSurveyPage />,
  },
]);