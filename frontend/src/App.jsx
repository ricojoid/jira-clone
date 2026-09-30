import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import BacklogPage from './pages/BacklogPage';
import SprintsPage from './pages/SprintsPage';
import SettingsPage from './pages/SettingsPage';
import AdminUserManagementPage from './pages/AdminUserManagementPage';
import MoMPage from './pages/MoMPage';
import CreateEditMoMPage from './pages/CreateEditMoMPage';
import MoMDetailPage from './pages/MoMDetailPage';
import AgendaPage from './pages/AgendaPage';

function App() {
  return (
    <MotionConfig reducedMotion="user">
    <ThemeModeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '14px',
            background: 'rgba(24, 24, 27, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '10px 14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.35)',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/board/:projectId" element={<BoardPage />} />
              <Route path="/issues/:projectId" element={<IssuesPage />} />
              <Route path="/issue/:issueId" element={<IssueDetailPage />} />
              <Route path="/backlog/:projectId" element={<BacklogPage />} />
              <Route path="/sprints/:projectId" element={<SprintsPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/agenda/:projectId" element={<AgendaPage />} />
              <Route path="/mom" element={<MoMPage />} />
              <Route path="/mom/project/:projectId" element={<MoMPage />} />
              <Route path="/mom/new" element={<CreateEditMoMPage />} />
              <Route path="/mom/new/:projectId" element={<CreateEditMoMPage />} />
              <Route path="/mom/view/:momId" element={<MoMDetailPage />} />
              <Route path="/mom/edit/:momId" element={<CreateEditMoMPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/users" element={<AdminUserManagementPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeModeProvider>
    </MotionConfig>
  );
}

export default App;
