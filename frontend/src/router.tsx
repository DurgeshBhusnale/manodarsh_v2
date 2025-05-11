import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/login';
import SoldierDashboard from './pages/soldier/dashboard';
import AdminDashboard from './pages/admin/dashboard';
import AddSoldier from './pages/admin/add-soldier';
import SoldiersData from './pages/admin/soldiers-data';
import QuestionnairePage from './pages/admin/questionnaire';
import DailyEmotionPage from './pages/admin/daily-emotion';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/soldier/dashboard',
    element: <SoldierDashboard />,
  },
  {
    path: '/admin/dashboard',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/add-soldier',
    element: <AddSoldier />,
  },
  {
    path: '/admin/soldiers-data',
    element: <SoldiersData />,
  },
  {
    path: '/admin/questionnaire',
    element: <QuestionnairePage />,
  },
  {
    path: '/admin/daily-emotion',
    element: <DailyEmotionPage />,
  },
]);