import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Users, Search, Shield, Filter, UserCheck, XCircle, Swords } from 'lucide-react';
import { GameMode, getGameModeLabel } from '../lib/tournament-engine';

export function AdminRegistrationsPage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const { isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [tournament, setTournament] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'reserve' | 'withdrawn'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  if (!isAdmin) {
    navigate('/login');
    return null;
  }

  const loadData = async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        api.getTournament(id),
        api.getRegistrations(id),
      ]);
      setTournament(tRes.tournament);
      setRegistrations(rRes.registrations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCancelRegistration = async (playerId: string, nickname: string) => {
    if (!confirm(`Deseja cancelar e retirar a inscrição do jogador ${nickname}?`)) return;
    setActionLoading(true);
    try {
      await api.cancelRegistration(id, playerId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar inscrição');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Carregando inscrições...</div>;
  }

  const gameMode: GameMode = (tournament?.game_mode || '5v5') as GameMode;
  const teamSize = Number(tournament?.team_size) || 5;
  const is1v1 = teamSize === 1 || gameMode === '1v1';
  const modeLabel = getGameModeLabel(gameMode);

  const filtered = registrations.filter(r => {
    const matchesSearch = r.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeRegistrations = registrations.filter(r => r.status !== 'withdrawn');
  const fullTeams = is1v1 ? activeRegistrations.length : Math.floor(activeRegistrations.length / teamSize);
  const reserves = is1v1 ? 0 : activeRegistrations.length % teamSize;

  return (
    <div className="space-y-6 pb-16">
      <Link
        to={`/tournaments/${id}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
      </Link>

      <div className="glass-panel rounded-2xl p-6 border border-cs-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold text-cs-orange tracking-wider flex items-center gap-1.5">
              {is1v1 ? <Swords className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              Painel de Inscrições • {modeLabel}
            </div>
            <h1 className="text-3xl font-black font-display text-white mt-1">
              Inscritos em {tournament?.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {is1v1
                ? `Total de ${activeRegistrations.length} duelistas inscritos para chave individual mata-mata.`
                : `Total de ${activeRegistrations.length} jogadores ativos • ${fullTeams} equipes completas de ${teamSize} • ${reserves} reservas`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nickname..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cs-orange"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmados</option>
            <option value="reserve">Reservas</option>
            <option value="withdrawn">Cancelados / Desistentes</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="glass-panel rounded-2xl border border-cs-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3 px-6">Jogador</th>
                <th className="py-3 px-6">Função</th>
                <th className="py-3 px-6">Skill Rating</th>
                <th className="py-3 px-6">Steam ID</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(r => (
                <tr key={r.registration_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-6 font-bold text-white flex items-center gap-3">
                    <img
                      src={r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.nickname}`}
                      alt=""
                      className="w-8 h-8 rounded-lg bg-slate-800 p-0.5"
                    />
                    <span>{r.nickname}</span>
                  </td>
                  <td className="py-3 px-6 font-mono text-slate-300">
                    {r.preferred_role}
                  </td>
                  <td className="py-3 px-6 font-mono font-bold text-amber-400">
                    {r.skill_rating}
                  </td>
                  <td className="py-3 px-6 font-mono text-slate-500">
                    {r.steam_id || 'Não informado'}
                  </td>
                  <td className="py-3 px-6">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'reserve'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : r.status === 'withdrawn'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {r.status === 'reserve'
                        ? 'Reserva'
                        : r.status === 'withdrawn'
                        ? 'Cancelado'
                        : 'Confirmado'}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    {r.status !== 'withdrawn' && (
                      <button
                        onClick={() => handleCancelRegistration(r.player_id, r.nickname)}
                        disabled={actionLoading}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Cancelar inscrição"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
