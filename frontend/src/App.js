import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import TemplatesPage from './pages/TemplatesPage';
import PdfToolsPage from './pages/PdfToolsPage';
import PaymentPage from './pages/PaymentPage';
import SettingsPage from './pages/SettingsPage';
import PaperGenerator from './pages/PaperGenerator';
import AdminPage from './pages/AdminPage';
import NewPaperPage from './pages/NewPaperPage';
import './styles/index.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.emailVerified) return <Navigate to="/auth?unverified=1" replace />;
  return children;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/new-paper" element={<PrivateRoute><NewPaperPage /></PrivateRoute>} />
          <Route path="/editor" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
          <Route path="/editor/:paperId" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
          <Route path="/templates" element={<PrivateRoute><TemplatesPage /></PrivateRoute>} />
          <Route path="/pdf-tools" element={<PrivateRoute><PdfToolsPage /></PrivateRoute>} />
          <Route path="/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/generate" element={<PrivateRoute><PaperGenerator /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
