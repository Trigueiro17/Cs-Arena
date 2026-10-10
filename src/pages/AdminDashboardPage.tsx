import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  PlusCircle,
  Trophy,
  Users,
  GitFork,
  Play,
  Database,
  CheckCircle2,
  Swords,
  Layers,
  Filter,
} from 'lucide-react';
import { GameMode } from '../lib/tournament-engine';

export function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedModeFilter, setSelectedModeFilter] = useState<'all' | GameMode>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
      return;
    }

    async function load() {
      try {
        const data = await api.getTournaments(
          selectedModeFilter !== 'all' ? { gameMode: selectedModeFilter } : undefined
        );
        setTournaments(data.tournaments || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin, selectedModeFilter]);

  if (!isAdmin) return null;

  const getModeBadge = (gameMode: string = '5v5') => {
    switch (gameMode) {
      case '1v1':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
            1x1 Duelo
          </span>
        );
      case '2v2':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
            2x2 Duplas
          </span>
        );
      case '3v3':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
            3x3 Trios
          </span>
        );
      case '4v4':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            4x4 Quartetos
          </span>
        );
      case '5v5':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            5x5 Equipes
          </span>
        );
    }
  };

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
            Sistema unificado para modalidades 1x1, 2x2, 3x3, 4x4 e 5x5 no Neon PostgreSQL Serverless.
          </p>
        </div>

        <Link
          to="/admin/tournaments/new"
          className="px-5 py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-base flex items-center gap-2 shadow-glow-orange transition-all shrink-0"
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
          <div className="text-[11px] text-slate-400 mt-1">
            {selectedModeFilter === 'all' ? 'Todas as modalidades' : `Filtrado por ${selectedModeFilter}`}
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
          <div className="text-[11px] text-slate-400 mt-1">Schema isolado cs_arena</div>
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

      {/* Tournaments Management Table & Filter Tabs */}
      <div className="glass-panel rounded-2xl border border-cs-border overflow-hidden space-y-4">
        <div className="p-6 border-b border-cs-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-white">
              Torneios Cadastrados
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtre por modalidade para gerenciar equipes, sorteios e partidas.
            </p>
          </div>

          {/* Mode Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            {(['all', '1v1', '2v2', '3v3', '4v4', '5v5'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSelectedModeFilter(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedModeFilter === mode
                    ? 'bg-cs-orange text-cs-dark shadow-glow-orange'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'all' ? 'Todos' : mode}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando painel...</div>
        ) : tournaments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm">Nenhum torneio encontrado com o filtro selecionado.</p>
            <Link
              to="/admin/tournaments/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cs-orange text-cs-dark font-bold text-xs"
            >
              <PlusCircle className="w-4 h-4" /> Criar Primeiro Torneio
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-6">Nome do Torneio</th>
                  <th className="py-3 px-6">Modalidade</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Inscritos</th>
                  <th className="py-3 px-6 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tournaments.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-white">
                      <Link to={`/tournaments/${t.id}`} className="hover:text-cs-orange flex items-center gap-2">
                        {t.name}
                      </Link>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        /{t.slug}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {getModeBadge(t.game_mode)}
                        <span className="font-mono text-xs text-slate-400">
                          MD{t.best_of || 1}
                        </span>
                      </div>
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
