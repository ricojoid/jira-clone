import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

function App() {
  return (
    <ThemeModeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#18181b',
            color: '#ffffff',
            fontSize: '0.875rem',
          },
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
  );
}

export default App;
