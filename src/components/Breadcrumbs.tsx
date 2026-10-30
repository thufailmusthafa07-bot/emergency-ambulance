import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || location.pathname === '/login' || location.pathname === '/signup') return null;

  const routeNameMap: Record<string, string> = {
    dashboard: 'Dashboard',
    'emergency-requests': 'Emergency Requests',
    dispatch: 'Dispatch Center',
    ambulances: 'Ambulances Fleet',
    hospitals: 'Hospitals Network',
    'road-network': 'Road Network',
    'route-optimization': 'Route Optimization',
    'traffic-roads': 'Traffic & Road Control',
    trips: 'Trip Tracking',
    'system-status': 'System Monitoring',
    about: 'About Project',
    settings: 'Settings',
  };

  return (
    <nav className="flex items-center text-xs text-slate-400 mb-2 px-1" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1.5 md:space-x-2 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
        <li className="inline-flex items-center">
          <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-cyan-400 transition-colors">
            <Home className="w-3.5 h-3.5 mr-1.5 text-cyan-500" />
            <span className="font-mono">Central</span>
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const displayName = routeNameMap[value] || value;

          return (
            <li key={to}>
              <div className="flex items-center">
                <ChevronRight className="w-3 h-3 text-slate-600 mx-1" />
                {isLast ? (
                  <span className="font-bold text-white tracking-wide">{displayName}</span>
                ) : (
                  <Link to={to} className="text-slate-400 hover:text-cyan-400 transition-colors">
                    {displayName}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
