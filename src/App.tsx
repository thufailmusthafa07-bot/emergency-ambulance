import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { EmergencyRequestsPage } from './pages/EmergencyRequestsPage';
import { DispatchCenterPage } from './pages/DispatchCenterPage';
import { AmbulancesPage } from './pages/AmbulancesPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { RoadNetworkPage } from './pages/RoadNetworkPage';
import { RouteOptimizationPage } from './pages/RouteOptimizationPage';
import { TrafficRoadsPage } from './pages/TrafficRoadsPage';
import { TripsPage } from './pages/TripsPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { UserManagementPage } from './pages/UserManagementPage';

const storedRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('nalam_nagar_user') || 'null');
    return String(user?.role || '').toUpperCase();
  } catch {
    return '';
  }
};

const isAuthorizedStaffRole = (role: string) => {
  const r = role.toUpperCase();
  return (
    r === 'ADMIN' ||
    r === 'ADMINISTRATOR' ||
    r === 'DISPATCHER' ||
    r === 'DISPATCH OPERATOR' ||
    r === 'OPERATOR' ||
    r === 'AMBULANCE_STAFF' ||
    r === 'AMBULANCE STAFF'
  );
};

const RoleDashboardRedirect: React.FC = () => {
  const role = storedRole();
  return <Navigate to={role === 'ADMIN' || role === 'ADMINISTRATOR' ? '/admin/dashboard' : '/dashboard'} replace />;
};

const ProtectedLayout: React.FC = () => {
  const [token, setToken] = React.useState(() => {
    const raw = localStorage.getItem('nalam_nagar_token');
    return raw && raw !== 'undefined' && raw !== 'null' ? raw : null;
  });

  React.useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
    };
    window.addEventListener('nalam:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('nalam:unauthorized', handleUnauthorized);
  }, []);

  if (!token) {
    return <Navigate to="/login" replace state={{ message: 'Session expired or required. Please log in.' }} />;
  }

  const role = storedRole();
  if (!isAuthorizedStaffRole(role)) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          message: 'Access restricted: This terminal is strictly reserved for Emergency Dispatchers.',
        }}
      />
    );
  }

  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  storedRole() === 'ADMIN' || storedRole() === 'ADMINISTRATOR'
    ? <>{children}</>
    : <Navigate to="/dashboard" replace />;

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<RoleDashboardRedirect />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/dashboard" element={<AdminOnly><DashboardPage /></AdminOnly>} />
        <Route path="/admin/users" element={<AdminOnly><UserManagementPage /></AdminOnly>} />
        <Route path="/emergency-requests" element={<EmergencyRequestsPage />} />
        <Route path="/dispatch" element={<DispatchCenterPage />} />
        <Route path="/ambulances" element={<AmbulancesPage />} />
        <Route path="/hospitals" element={<HospitalsPage />} />
        <Route path="/road-network" element={<RoadNetworkPage />} />
        <Route path="/route-optimization" element={<RouteOptimizationPage />} />
        <Route path="/traffic-roads" element={<TrafficRoadsPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/system-status" element={<SystemStatusPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={Boolean(localStorage.getItem('nalam_nagar_token') && isAuthorizedStaffRole(storedRole()))
        ? <RoleDashboardRedirect />
        : <Navigate to="/login" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
