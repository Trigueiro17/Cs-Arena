import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import {
  Trophy,
  Users,
  Shield,
  ArrowRight,
  Flame,
  Sparkles,
  Crosshair,
  Award,
  Zap,
  Compass,
  CheckCircle2,
  Swords,
  Layers,
} from 'lucide-react';
import { GameMode } from '../lib/tournament-engine';

const MAP_THEMES = [
  { name: 'Mirage', bg: 'from-amber-900/30 to-slate-900', border: 'border-amber-500/30' },
  { name: 'Inferno', bg: 'from-orange-950/40 to-slate-900', border: 'border-orange-500/30' },
  { name: 'Nuke', bg: 'from-cyan-950/40 to-slate-900', border: 'border-cyan-500/30' },
  { name: 'Dust II', bg: 'from-yellow-950/30 to-slate-900', border: 'border-yellow-500/30' },
  { name: 'Ancient', bg: 'from-emerald-950/30 to-slate-900', border: 'border-emerald-500/30' },
  { name: 'Anubis', bg: 'from-sky-950/30 to-slate-900', border: 'border-sky-500/30' },
];

export function LandingPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | GameMode>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getTournaments(
          selectedFilter !== 'all' ? { gameMode: selectedFilter } : undefined
        );
        setTournaments(data.tournaments || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration_open':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Inscrições Abertas
          </span>
        );
      case 'registration_closed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Inscrições Encerradas
          </span>
        );
      case 'drawing':
        return (
          <span className="inline-flex items-center gap-1.5 bg-cs-orange/20 text-cs-orange border border-cs-orange/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse glow-orange">
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
            Roleta em Andamento
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 bg-sky-500/15 text-sky-400 border border-sky-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Partidas Ao Vivo
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 text-purple-400" />
            Campeão Consagrado
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
            Rascunho
          </span>
        );
    }
  };

  const getGameModeBadge = (gameMode: string = '5v5') => {
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
    <div className="space-y-16 pb-20 relative z-10">
      {/* Hero Cinematic Section */}
      <section className="relative overflow-hidden rounded-3xl border border-cs-border shadow-2xl min-h-[460px] flex flex-col justify-end">
        {/* Background Arena Image with Multilayer Gradients */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: "url('/assets/cs2_arena_hero_banner.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/60 to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-8 sm:p-12 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cs-orange/20 border border-cs-orange/40 text-cs-orange text-xs font-black uppercase tracking-widest backdrop-blur-md">
            <Flame className="w-4 h-4 fill-current text-cs-orange animate-pulse" />
            Arena Oficial de Counter-Strike 2 • 1x1 a 5x5
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white leading-none">
            A ARENA SUPREMA <br />
            <span className="text-gradient-orange">DO COUNTER-STRIKE 2</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl font-normal">
            Campeonatos de CS2 em cinco modalidades: <strong className="text-white">1x1, 2x2, 3x3, 4x4 e 5x5</strong>. Inscrição individual, formação de times por roleta animada no servidor Neon e chaveamento mata-mata.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#tournaments-list"
              className="px-7 py-3.5 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-lg tracking-wide shadow-glow-orange transition-all flex items-center gap-2 transform active:scale-95"
            >
              Explorar Campeonatos
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </a>

            <Link
              to="/admin/tournaments/new"
              className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 font-bold font-display text-base border border-slate-700/80 transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              Criar Campeonato
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-red-500 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 shrink-0">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-white text-base">5 Modalidades</h4>
            <p className="text-xs text-slate-400 mt-0.5">Duelo 1x1, Duplas 2x2, Trios 3x3, Quartetos 4x4 e 5x5 tradicional.</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-amber-500 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-white text-base">Roleta Criptográfica</h4>
            <p className="text-xs text-slate-400 mt-0.5">Sorteio seguro com Fisher-Yates no backend Neon com som e confetes.</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-sky-500 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-white text-base">Chave Mata-Mata</h4>
            <p className="text-xs text-slate-400 mt-0.5">Eliminação simples MD1 com cálculo justo de BYEs e avanço automático.</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-purple-500 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-white text-base">Auditoria & Reservas</h4>
            <p className="text-xs text-slate-400 mt-0.5">Jogadores excedentes tornam-se reservas auditados transparentemente.</p>
          </div>
        </div>
      </section>

      {/* Featured Tournaments Section */}
      <section id="tournaments-list" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-cs-border pb-4">
          <div>
            <div className="text-xs uppercase font-extrabold text-cs-orange tracking-widest flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Temporada Oficial
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-display text-white tracking-wide mt-1">
              Torneios em Destaque
            </h2>
          </div>

          {/* Filter Chips by Game Mode */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-cs-orange text-cs-dark shadow-glow-orange'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            {(['1v1', '2v2', '3v3', '4v4', '5v5'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSelectedFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFilter === mode
                    ? 'bg-cs-orange text-cs-dark shadow-glow-orange'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === '1v1'
                  ? '1x1 Duelos'
                  : mode === '2v2'
                  ? '2x2 Duplas'
                  : mode === '3v3'
                  ? '3x3 Trios'
                  : mode === '4v4'
                  ? '4x4 Quartetos'
                  : '5x5 Equipes'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-cs-orange border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-slate-400 text-sm font-semibold">Carregando campeonatos do Neon...</div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-20 text-center glass-panel rounded-3xl p-12">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white font-display">Nenhum campeonato encontrado</h3>
            <p className="text-xs text-slate-400 mt-1">Experimente trocar o filtro ou crie um novo campeonato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t, index) => {
              const theme = MAP_THEMES[index % MAP_THEMES.length];
              const teamSize = Number(t.team_size) || 5;
              const is1v1 = teamSize === 1 || t.game_mode === '1v1';
              const totalRegs = t.registrations_count || 0;
              const teamsCount = is1v1 ? totalRegs : Math.floor(totalRegs / teamSize);
              const reservesCount = is1v1 ? 0 : totalRegs % teamSize;

              return (
                <div
                  key={t.id}
                  className={`glass-panel rounded-3xl p-6 flex flex-col justify-between border ${theme.border} hover:border-cs-orange transition-all duration-300 group`}
                >
                  <div className="space-y-4">
                    {/* Header: Status, Modality, and Series Tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getStatusBadge(t.status)}
                        {getGameModeBadge(t.game_mode)}
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                        MD{t.best_of || 1}
                      </span>
                    </div>

                    {/* Tournament Title */}
                    <div>
                      <h3 className="text-2xl font-black font-display text-white group-hover:text-cs-orange transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {t.description || 'Campeonato oficial de Counter-Strike 2 no formato mata-mata.'}
                      </p>
                    </div>

                    {/* Stats Badges */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 bg-slate-900/40 rounded-xl px-3">
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Inscritos</div>
                        <div className="text-base font-black font-mono text-white mt-0.5">
                          {totalRegs}
                        </div>
                      </div>
                      <div className="text-center border-x border-white/5">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          {is1v1 ? 'Duelistas' : 'Equipes'}
                        </div>
                        <div className="text-base font-black font-mono text-cs-orange mt-0.5">
                          {teamsCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Reservas</div>
                        <div className="text-base font-black font-mono text-amber-400 mt-0.5">
                          {reservesCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2.5 pt-4">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="py-2.5 text-center text-xs font-bold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all"
                    >
                      Ver Detalhes
                    </Link>
                    <Link
                      to={`/tournaments/${t.id}/bracket`}
                      className="py-2.5 text-center text-xs font-bold rounded-xl bg-gradient-to-r from-cs-orange/20 to-amber-500/20 hover:from-cs-orange hover:to-amber-500 text-cs-orange hover:text-cs-dark border border-cs-orange/40 transition-all font-display tracking-wider"
                    >
                      Chaveamento
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
