import React, { useState } from 'react';
import { Trophy, Shield, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
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

  // Group matches by round_id
  const matchesByRound = rounds.map(r => ({
    round: r,
    matches: matches.filter(m => m.round_id === r.id),
  }));

  // Find tournament champion if final is completed
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound ? matches.find(m => m.round_id === finalRound.id) : null;
  const championName = finalMatch?.winner_name || null;

  return (
    <div className="w-full space-y-6">
      {/* Champion Highlight Banner */}
      {championName && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/40 shadow-glow-orange flex items-center justify-between animate-pulse-slow">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="w-9 h-9 text-black" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold text-amber-400 tracking-widest">
                Grande Campeão do Torneio
              </div>
              <div className="text-3xl font-black font-display text-white">
                {championName}
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="px-4 py-1.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-400/30">
              Troféu Conquistado
            </span>
          </div>
        </div>
      )}

      {/* Bracket Rounds Columns */}
      <div className="overflow-x-auto pb-6">
        <div className="flex items-stretch gap-6 min-w-max">
          {matchesByRound.map(({ round, matches: roundMatches }) => (
            <div key={round.id} className="w-72 flex flex-col">
              {/* Round Column Header */}
              <div className="mb-4 pb-2 border-b border-cs-border flex items-center justify-between">
                <span className="font-display font-bold text-lg text-white tracking-wide">
                  {round.name}
                </span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                  {roundMatches.length} jogos
                </span>
              </div>

              {/* Match Cards */}
              <div className="flex-1 flex flex-col justify-around gap-4">
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
                      className={`p-3.5 rounded-xl border transition-all ${
                        isBye
                          ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                          : match.winner_id
                          ? 'bg-cs-card border-cs-border hover:border-cs-orange/50 shadow-md'
                          : 'bg-cs-surface border-cs-border hover:border-slate-600'
                      } ${canEdit ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                    >
                      {/* Match Header Tag */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold mb-2">
                        <span>MD{match.best_of}</span>
                        {isBye ? (
                          <span className="text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded">
                            BYE (Avanço)
                          </span>
                        ) : isCompleted ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </span>
                        ) : match.team_a_id && match.team_b_id ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Aguardando
                          </span>
                        ) : (
                          <span className="text-slate-500">A Definir</span>
                        )}
                      </div>

                      {/* Team A Slot */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg mb-1.5 transition-colors ${
                          match.winner_id === match.team_a_id
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-white font-bold'
                            : 'bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {match.team_a_seed && (
                            <span className="text-[10px] font-mono text-slate-400 w-4">
                              #{match.team_a_seed}
                            </span>
                          )}
                          <span className="truncate text-xs">
                            {match.team_a_name || 'A definir'}
                          </span>
                        </div>
                        {match.winner_id === match.team_a_id && (
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>

                      {/* Team B Slot */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          match.winner_id === match.team_b_id
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-white font-bold'
                            : 'bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {match.team_b_seed && (
                            <span className="text-[10px] font-mono text-slate-400 w-4">
                              #{match.team_b_seed}
                            </span>
                          )}
                          <span className="truncate text-xs">
                            {isBye ? '(Sem oponente / BYE)' : match.team_b_name || 'A definir'}
                          </span>
                        </div>
                        {match.winner_id === match.team_b_id && (
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>

                      {canEdit && (
                        <div className="mt-2 text-[10px] text-cs-orange text-center font-bold tracking-wider uppercase pt-1 border-t border-slate-800">
                          Clique para editar placar
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
