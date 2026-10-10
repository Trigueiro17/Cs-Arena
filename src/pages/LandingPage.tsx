import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { Trophy, Users, Shield, ArrowRight, Flame, Sparkles, Crosshair, Award, Zap, Compass, CheckCircle2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

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
            Campeonato Oficial de Counter-Strike 2
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white leading-none">
            A ARENA SUPREMA <br />
            <span className="text-gradient-orange">
              ROLETA & MATA-MATA 5X5
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
            Inscreva-se individualmente. Nossa <strong className="text-white">roleta criptograficamente segura</strong> monta equipes de 5 jogadores em tempo real, sorteia o chaveamento de eliminação simples e coroa o esquadrão campeão.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#tournaments-list"
              className="btn-shimmer px-8 py-4 rounded-xl bg-gradient-to-r from-cs-orange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-cs-dark font-black font-display text-lg tracking-wider flex items-center gap-2.5 glow-orange transition-all transform active:scale-95"
            >
              <Trophy className="w-5 h-5 text-cs-dark stroke-[2.5]" />
              Ver Torneios Disponíveis
              <ArrowRight className="w-5 h-5" />
            </a>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Neon PostgreSQL Serverless Ativo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-cs-orange flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-cs-orange/15 text-cs-orange shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-white text-base">Inscrição Individual</h4>
            <p className="text-xs text-slate-400 mt-0.5">Cadastre seu nickname e role preferido (AWP, Entry, IGL, Support).</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-amber-500 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-white text-base">Roleta Criptográfica</h4>
            <p className="text-xs text-slate-400 mt-0.5">Sorteio seguro com Fisher-Yates e Web Audio API sem manipular resultados.</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-sky-500 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-black text-white text-base">Chave Mata-Mata</h4>
            <p className="text-xs text-slate-400 mt-0.5">Eliminação simples MD1/MD3 com cálculo inteligente de BYEs automáticos.</p>
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
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Selecione qualquer campeonato para ver chaves, elencos formados ou girar a roleta ao vivo.
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-cs-orange border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-slate-400 text-sm font-semibold">Carregando campeonatos do Neon...</div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-20 text-center glass-panel rounded-3xl p-12">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white font-display">Nenhum campeonato cadastrado ainda</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t, index) => {
              const theme = MAP_THEMES[index % MAP_THEMES.length];
              const teamCount = Math.floor((t.registrations_count || 0) / 5);
              const reservesCount = (t.registrations_count || 0) % 5;

              return (
                <div
                  key={t.id}
                  className={`glass-panel rounded-3xl p-6 flex flex-col justify-between border ${theme.border} hover:border-cs-orange transition-all duration-300 group`}
                >
                  <div className="space-y-4">
                    {/* Header: Status and Series Tag */}
                    <div className="flex items-center justify-between">
                      {getStatusBadge(t.status)}
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                        MD{t.best_of}
                      </span>
                    </div>

                    {/* Tournament Title */}
                    <div>
                      <h3 className="text-2xl font-black font-display text-white group-hover:text-cs-orange transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {t.description || 'Campeonato oficial de CS2 5x5 no formato mata-mata.'}
                      </p>
                    </div>

                    {/* Stats Badges */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 bg-slate-900/40 rounded-xl px-3">
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Inscritos</div>
                        <div className="text-base font-black font-mono text-white mt-0.5">
                          {t.registrations_count || 0}
                        </div>
                      </div>
                      <div className="text-center border-x border-white/5">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Equipes</div>
                        <div className="text-base font-black font-mono text-cs-orange mt-0.5">
                          {teamCount}
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
