import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { Shield, PlusCircle, Trophy, Users, GitFork, Play, Database, CheckCircle2 } from 'lucide-react';

export function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
      return;
    }

    async function load() {
      try {
        const data = await api.getTournaments();
        setTournaments(data.tournaments || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-8 pb-16">
      {/* Admin Top Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cs-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-cs-orange tracking-wider">
            <Shield className="w-4 h-4" /> Painel de Controle Administrativo
          </div>
          <h1 className="text-3xl font-black font-display text-white mt-1">
            Gestão de Campeonatos CS ARENA
          </h1>
          <p className="text-xs text-slate-400">
            Conectado ao Neon PostgreSQL Serverless. Todas as ações administrativas são auditadas.
          </p>
        </div>

        <Link
          to="/admin/tournaments/new"
          className="px-5 py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-base flex items-center gap-2 shadow-glow-orange transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          Criar Novo Torneio
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-cs-card border border-cs-border">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total de Torneios</span>
            <Trophy className="w-5 h-5 text-cs-orange" />
          </div>
          <div className="text-3xl font-black font-display text-white">
            {tournaments.length}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-cs-card border border-cs-border">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Banco de Dados</span>
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400 flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-5 h-5" /> Neon PostgreSQL Conectado
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-cs-card border border-cs-border">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Operador Atual</span>
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white truncate mt-1">
            {user?.name}
          </div>
          <div className="text-xs text-slate-400">{user?.email}</div>
        </div>
      </div>

      {/* Tournaments Management Table */}
      <div className="glass-panel rounded-2xl border border-cs-border overflow-hidden">
        <div className="p-6 border-b border-cs-border flex items-center justify-between">
          <h2 className="text-xl font-bold font-display text-white">
            Torneios Cadastrados
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {tournaments.length} registros
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando painel...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-6">Nome do Torneio</th>
                  <th className="py-3 px-6">Formato</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Inscritos</th>
                  <th className="py-3 px-6 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tournaments.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-white">
                      <Link to={`/tournaments/${t.id}`} className="hover:text-cs-orange">
                        {t.name}
                      </Link>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">
                      MD{t.best_of} • 5x5 Mata-mata
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-cs-orange">
                      {t.registrations_count || 0}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Link
                        to={`/admin/tournaments/${t.id}/draw`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/40 hover:to-orange-500/40 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Roleta
                      </Link>
                      <Link
                        to={`/tournaments/${t.id}/bracket`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all"
                      >
                        <GitFork className="w-3.5 h-3.5" /> Chave
                      </Link>
                      <Link
                        to={`/admin/tournaments/${t.id}/registrations`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                      >
                        Inscrições
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
