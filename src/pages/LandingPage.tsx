import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { Trophy, Users, Shield, ArrowRight, Flame, Calendar, Award } from 'lucide-react';

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
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Inscrições Abertas</span>;
      case 'registration_closed':
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Inscrições Encerradas</span>;
      case 'drawing':
        return <span className="bg-cs-orange/15 text-cs-orange border border-cs-orange/30 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">Sorteando Roleta</span>;
      case 'in_progress':
        return <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Em Andamento</span>;
      case 'completed':
        return <span className="bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Finalizado</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">Rascunho</span>;
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cs-card via-cs-surface to-slate-900 border border-cs-border p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cs-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cs-orange/10 border border-cs-orange/30 text-cs-orange text-xs font-bold uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-current" />
            Counter-Strike 2 Esports Hub
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white leading-none">
            CAMPEONATOS CS2 COM <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cs-orange via-amber-400 to-yellow-500">
              ROLETA CRIPTOGRÁFICA
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Inscreva-se individualmente. Nossa roleta animada balanceia e sorteia equipes completas de 5 jogadores, chaves de eliminação simples mata-mata e coroa o grande campeão.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="#tournaments-list"
              className="px-6 py-3.5 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-lg tracking-wider flex items-center gap-2 shadow-glow-orange transition-all transform hover:-translate-y-0.5"
            >
              Explorar Torneios
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Featured Tournaments Section */}
      <section id="tournaments-list" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-wide flex items-center gap-2">
              <Trophy className="w-7 h-7 text-cs-orange" />
              Torneios Disponíveis
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Conectado ao Neon PostgreSQL. Escolha um torneio para ver chaveamento, equipes ou sortear a roleta.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 font-semibold">
            Carregando torneios oficiais...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Nenhum torneio cadastrado no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(t => (
              <div
                key={t.id}
                className="glass-panel rounded-2xl p-6 flex flex-col justify-between transition-all hover:scale-[1.01] hover:border-cs-orange/50 shadow-card-glow"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    {getStatusBadge(t.status)}
                    <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                      MD{t.best_of}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-display text-white mb-2 tracking-wide">
                    {t.name}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {t.description || 'Campeonato oficial de CS2 5x5 no formato mata-mata.'}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-cs-border">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-cs-orange" />
                      Inscritos:
                    </span>
                    <span className="font-bold font-mono text-white text-sm">
                      {t.registrations_count || 0} jogadores
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="py-2 text-center text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      Ver Detalhes
                    </Link>
                    <Link
                      to={`/tournaments/${t.id}/bracket`}
                      className="py-2 text-center text-xs font-bold rounded-lg bg-cs-orange/20 hover:bg-cs-orange text-cs-orange hover:text-cs-dark border border-cs-orange/40 transition-colors"
                    >
                      Chaveamento
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
