import React from 'react';
import { RouterProvider, Route, useRouter } from './lib/router';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { TournamentRegisterPage } from './pages/TournamentRegisterPage';
import { TournamentTeamsPage } from './pages/TournamentTeamsPage';
import { TournamentBracketPage } from './pages/TournamentBracketPage';
import { TournamentDrawPage } from './pages/TournamentDrawPage';
import { TournamentLivePage } from './pages/TournamentLivePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminNewTournamentPage } from './pages/AdminNewTournamentPage';
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage';
import { Shield, Trophy, Database, Heart } from 'lucide-react';

function AppLayout() {
  const { path } = useRouter();
  const isLiveStream = path.endsWith('/live');

  return (
    <div className="min-h-screen bg-cs-dark text-slate-100 flex flex-col font-sans selection:bg-cs-orange selection:text-cs-dark">
      {/* Do not render standard header/footer on OBS clean live feed */}
      {!isLiveStream && <Navbar />}

      <main className={`flex-1 ${!isLiveStream ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full' : ''}`}>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/admin" component={AdminDashboardPage} />
        <Route path="/admin/tournaments/new" component={AdminNewTournamentPage} />
        <Route path="/admin/tournaments/:id/registrations" component={AdminRegistrationsPage} />
        <Route path="/admin/tournaments/:id/draw" component={TournamentDrawPage} />
        <Route path="/tournaments/:id" component={TournamentDetailPage} />
        <Route path="/tournaments/:id/register" component={TournamentRegisterPage} />
        <Route path="/tournaments/:id/teams" component={TournamentTeamsPage} />
        <Route path="/tournaments/:id/bracket" component={TournamentBracketPage} />
        <Route path="/tournaments/:id/draw" component={TournamentDrawPage} />
        <Route path="/tournaments/:id/live" component={TournamentLivePage} />
      </main>

      {!isLiveStream && (
        <footer className="bg-cs-card border-t border-cs-border py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-cs-orange flex items-center justify-center text-cs-dark font-black">
                CS
              </div>
              <span className="font-display font-bold text-white text-sm">CS ARENA</span>
              <span>— Plataforma de Torneios Counter-Strike 2</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                <Database className="w-3.5 h-3.5" /> Neon PostgreSQL
              </span>
              <span>•</span>
              <span>Vite + React + TypeScript</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
