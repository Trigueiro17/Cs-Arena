import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { BracketView } from '../components/BracketView';
import { GitFork, Trophy, ArrowLeft, RefreshCw, Tv, Crosshair } from 'lucide-react';
import { getGameModeLabel } from '../lib/tournament-engine';

export function TournamentBracketPage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const [tournament, setTournament] = useState<any | null>(null);
  const [bracketData, setBracketData] = useState<{ rounds: any[]; matches: any[] }>({
    rounds: [],
    matches: [],
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        api.getTournament(id),
        api.getBracket(id),
      ]);
      setTournament(tRes.tournament);
      setBracketData({
        rounds: bRes.rounds || [],
        matches: bRes.matches || [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Carregando chaveamento...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          to={`/tournaments/${id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Atualizar chaveamento"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to={`/tournaments/${id}/live`}
            className="px-3 py-1.5 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-700/50 text-xs font-bold hover:bg-purple-900/60 transition-colors flex items-center gap-1.5"
          >
            <Tv className="w-4 h-4" /> Modo OBS
          </Link>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-cs-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold text-cs-orange tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              Chave Oficial Mata-Mata (Eliminação Simples)
            </div>
            <h1 className="text-3xl font-black font-display text-white mt-1">
              {tournament?.name}
            </h1>
            <p className="text-xs text-slate-400">
              Formato MD{tournament?.best_of} • Vencedores avançam automaticamente para a próxima fase até a Grande Final.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cs-orange" />
              {tournament?.game_mode ? getGameModeLabel(tournament.game_mode) : 'Counter-Strike 2'}
            </span>
          </div>
        </div>
      </div>

      {bracketData.rounds.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <GitFork className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-bold font-display text-white">Chaveamento ainda não gerado</h2>
          <p className="text-xs text-slate-400">
            O chaveamento deste campeonato será criado após o sorteio das equipes na roleta.
          </p>
          <Link
            to={`/admin/tournaments/${id}/draw`}
            className="inline-block px-5 py-2.5 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-sm tracking-wide shadow-glow-orange"
          >
            Ir para Roleta & Sorteio
          </Link>
        </div>
      ) : (
        <BracketView
          rounds={bracketData.rounds}
          matches={bracketData.matches}
          tournament={tournament}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
