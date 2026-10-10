import React from 'react';
import { RouterProvider, Route, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { SteamCallbackPage } from './pages/SteamCallbackPage';
import { Shield, Trophy, Database, Heart } from 'lucide-react';

function ProtectedAdminRoute({
  component: Component,
  params = {},
}: {
  component: React.ComponentType<any>;
  params?: Record<string, string>;
}) {
  const { user, isAdmin, isOrganizer, isLoading } = useAuth();
  const { navigate } = useRouter();

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-12 h-12 border-4 border-cs-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Verificando credenciais de acesso...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  if (!isAdmin && !isOrganizer) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="glass-panel p-8 rounded-3xl border border-red-500/30">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">Acesso Restrito</h2>
          <p className="text-xs text-slate-400 mb-6">
            Esta seção é restrita a Administradores e Organizadores. Seu perfil atual é <strong className="text-sky-400">{user.role}</strong>.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl bg-cs-orange text-cs-dark font-black text-xs uppercase shadow-glow-orange"
          >
            Voltar aos Campeonatos
          </button>
        </div>
      </div>
    );
  }

  return <Component params={params} />;
}

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
        <Route path="/auth/callback" component={SteamCallbackPage} />
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboardPage} />} />
        <Route path="/admin/tournaments/new" component={() => <ProtectedAdminRoute component={AdminNewTournamentPage} />} />
        <Route path="/admin/tournaments/:id/registrations" component={({ params }: { params: Record<string, string> }) => <ProtectedAdminRoute component={AdminRegistrationsPage} params={params} />} />
        <Route path="/admin/tournaments/:id/draw" component={({ params }: { params: Record<string, string> }) => <ProtectedAdminRoute component={TournamentDrawPage} params={params} />} />
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
