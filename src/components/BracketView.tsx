import React, { useState } from 'react';
import { Trophy, Shield, CheckCircle2, Clock, Sparkles, ChevronRight, Award } from 'lucide-react';
import { MatchModal } from './MatchModal';
import { useAuth } from '../context/AuthContext';

interface BracketViewProps {
  rounds: { id: string; round_number: number; name: string }[];
  matches: any[];
  onRefresh?: () => void;
}

export function BracketView({ rounds, matches, onRefresh }: BracketViewProps) {
  const { isAdmin } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const matchesByRound = rounds.map(r => ({
    round: r,
    matches: matches.filter(m => m.round_id === r.id),
  }));

  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound ? matches.find(m => m.round_id === finalRound.id) : null;
  const championName = finalMatch?.winner_name || null;

  return (
    <div className="w-full space-y-8">
      {/* Grand Champion Illuminated Podium Banner */}
      {championName && (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-orange-950/60 border-2 border-amber-400/60 glow-gold flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden animate-pulse-slow">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shrink-0 p-4">
              <Trophy className="w-12 h-12 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs uppercase font-black text-amber-400 tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                GRANDE CAMPEÃO DO TORNEIO
              </div>
              <div className="text-3xl sm:text-4xl font-black font-display text-white mt-1">
                {championName}
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Vencedor invicto da série decisiva de Counter-Strike 2.
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <span className="px-6 py-2.5 rounded-full bg-amber-400 text-black font-black font-display text-sm uppercase tracking-wider shadow-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              Troféu Oficial CS2
            </span>
          </div>
        </div>
      )}

      {/* Bracket Tree Columns */}
      <div className="overflow-x-auto pb-6">
        <div className="flex items-stretch gap-8 min-w-max">
          {matchesByRound.map(({ round, matches: roundMatches }) => (
            <div key={round.id} className="w-80 flex flex-col">
              {/* Round Column Header */}
              <div className="mb-5 pb-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-display font-black text-xl text-white tracking-wide block">
                    {round.name}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Fase Eliminatória
                  </span>
                </div>
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {roundMatches.length} confrontos
                </span>
              </div>

              {/* Match Cards */}
              <div className="flex-1 flex flex-col justify-around gap-5">
                {roundMatches.map(match => {
                  const isCompleted = match.status === 'completed';
                  const isBye = match.is_bye;
                  const canEdit = isAdmin && !isBye && match.team_a_id && match.team_b_id;

                  return (
                    <div
                      key={match.id}
                      onClick={() => {
                        if (canEdit) setSelectedMatch(match);
                      }}
                      className={`p-4 rounded-2xl border transition-all duration-200 relative group ${
                        isBye
                          ? 'bg-slate-900/30 border-slate-800/80 opacity-70'
                          : match.winner_id
                          ? 'bg-[#0e131d] border-white/10 hover:border-cs-orange/60 shadow-lg'
                          : 'bg-[#0b0f17] border-white/10 hover:border-slate-500 shadow-md'
                      } ${canEdit ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl' : ''}`}
                    >
                      {/* Match Header Tag */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-2.5">
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded font-mono text-[10px] text-slate-300">
                          MD{match.best_of}
                        </span>
                        {isBye ? (
                          <span className="text-sky-400 bg-sky-950/60 border border-sky-500/20 px-2 py-0.5 rounded text-[10px]">
                            BYE (Avanço Direto)
                          </span>
                        ) : isCompleted ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Finalizado
                          </span>
                        ) : match.team_a_id && match.team_b_id ? (
                          <span className="text-amber-400 flex items-center gap-1 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock className="w-3 h-3" /> Aguardando Placar
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Aguardando Vencedor</span>
                        )}
                      </div>

                      {/* Team A Slot */}
                      <div
                        className={`flex items-center justify-between p-2.5 rounded-xl mb-2 transition-all ${
                          match.winner_id === match.team_a_id
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-white font-black'
                            : 'bg-slate-900/70 border border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {match.team_a_seed && (
                            <span className="text-[10px] font-mono font-bold text-amber-400 w-4">
                              #{match.team_a_seed}
                            </span>
                          )}
                          <span className="truncate text-xs font-semibold font-display tracking-wide">
                            {match.team_a_name || 'A definir'}
                          </span>
                        </div>
                        {match.winner_id === match.team_a_id && (
                          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>

                      {/* Team B Slot */}
                      <div
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                          match.winner_id === match.team_b_id
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-white font-black'
                            : 'bg-slate-900/70 border border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {match.team_b_seed && (
                            <span className="text-[10px] font-mono font-bold text-amber-400 w-4">
                              #{match.team_b_seed}
                            </span>
                          )}
                          <span className="truncate text-xs font-semibold font-display tracking-wide">
                            {isBye ? '(Sem oponente / BYE)' : match.team_b_name || 'A definir'}
                          </span>
                        </div>
                        {match.winner_id === match.team_b_id && (
                          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>

                      {/* Admin Quick Action Indicator */}
                      {canEdit && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-cs-orange text-center font-bold tracking-widest uppercase flex items-center justify-center gap-1 group-hover:text-amber-400 transition-colors">
                          <span>Editar Placar da Partida</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match Result Modal */}
      {selectedMatch && (
        <MatchModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
