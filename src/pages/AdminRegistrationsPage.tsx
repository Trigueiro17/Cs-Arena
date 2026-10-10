import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Users, Search, Shield, Filter, UserCheck } from 'lucide-react';

export function AdminRegistrationsPage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const { isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [tournament, setTournament] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'reserve'>('all');
  const [loading, setLoading] = useState(true);

  if (!isAdmin) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Carregando inscrições...</div>;
  }

  const filtered = registrations.filter(r => {
    const matchesSearch = r.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fullTeams = Math.floor(registrations.length / 5);
  const reserves = registrations.length % 5;

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
            <div className="text-xs uppercase font-bold text-cs-orange tracking-wider">
              Painel de Inscrições
            </div>
            <h1 className="text-3xl font-black font-display text-white mt-1">
              Inscritos em {tournament?.name}
            </h1>
            <p className="text-xs text-slate-400">
              Total de {registrations.length} jogadores inscritos • {fullTeams} equipes completas de 5 • {reserves} reservas
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
          </select>
        </div>
      </div>

      {/* Registrations List */}
      <div className="glass-panel rounded-2xl border border-cs-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3 px-6">Jogador</th>
                <th className="py-3 px-6">Função</th>
                <th className="py-3 px-6">Skill Rating</th>
                <th className="py-3 px-6">Steam ID</th>
                <th className="py-3 px-6">Status</th>
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
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {r.status === 'reserve' ? 'Reserva' : 'Confirmado'}
                    </span>
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
