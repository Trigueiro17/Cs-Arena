import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { Shield, Users, Trophy, ArrowLeft, Star, UserCheck } from 'lucide-react';

export function TournamentTeamsPage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const [tournament, setTournament] = useState<any | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [reserves, setReserves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, tmRes] = await Promise.all([
          api.getTournament(id),
          api.getTeams(id),
        ]);
        setTournament(tRes.tournament);
        setTeams(tmRes.teams || []);
        setReserves(tmRes.reserves || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Carregando equipes...</div>;
  }

  return (
    <div className="space-y-8 pb-16">
      <Link
        to={`/tournaments/${id}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
      </Link>

      <div className="glass-panel rounded-2xl p-6 border border-cs-border">
        <div className="text-xs uppercase font-bold text-cs-orange tracking-wider">
          Elencos Oficiais 5x5
        </div>
        <h1 className="text-3xl font-black font-display text-white mt-1">
          Equipes de {tournament?.name}
        </h1>
        <p className="text-xs text-slate-400">
          Cada equipe ativa é composta por exatamente cinco jogadores.
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-bold font-display text-white">Nenhuma equipe formada</h2>
          <p className="text-xs text-slate-400">
            As equipes serão geradas assim que o sorteio oficial for realizado.
          </p>
          <Link
            to={`/admin/tournaments/${id}/draw`}
            className="inline-block px-5 py-2.5 rounded-xl bg-cs-orange text-cs-dark font-black font-display text-sm tracking-wide shadow-glow-orange"
          >
            Realizar Sorteio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => {
            const avgRating = team.members.length > 0
              ? Math.round(team.members.reduce((acc: number, m: any) => acc + (m.skill_rating || 1000), 0) / team.members.length)
              : 0;

            return (
              <div
                key={team.id}
                className="glass-panel rounded-2xl p-6 border border-cs-border flex flex-col justify-between hover:border-cs-orange/40 transition-colors shadow-card-glow"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-cs-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cs-orange/15 text-cs-orange flex items-center justify-center font-black font-display text-sm">
                        #{team.seed}
                      </div>
                      <h3 className="font-display font-black text-xl text-white tracking-wide">
                        {team.name}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      Média: <strong className="text-amber-400">{avgRating}</strong>
                    </span>
                  </div>

                  {/* Members list */}
                  <div className="space-y-2.5">
                    {team.members.map((m: any) => (
                      <div
                        key={m.player_id}
                        className={`p-2 rounded-lg flex items-center justify-between text-xs ${
                          m.is_captain
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
                            : 'bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <img
                            src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`}
                            alt=""
                            className="w-7 h-7 rounded bg-slate-800 p-0.5"
                          />
                          <span className="font-bold truncate">{m.nickname}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {m.preferred_role}
                          </span>
                          {m.is_captain && (
                            <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black tracking-wider">
                              CAPITÃO
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-right">
                  <span className="text-[11px] text-slate-400">
                    Status: <strong className="text-white uppercase">{team.status}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reserves Section */}
      {reserves.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-cs-border space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold font-display text-white">
              Jogadores Reservas ({reserves.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Conforme a regra do torneio, jogadores excedentes que não formaram um time completo de 5 permanecem como suplentes prioritários auditados.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {reserves.map(r => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center gap-3"
              >
                <img
                  src={r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.nickname}`}
                  alt=""
                  className="w-10 h-10 rounded-lg bg-slate-800 p-0.5 border border-slate-700"
                />
                <div className="truncate">
                  <div className="font-bold text-white text-sm truncate">{r.nickname}</div>
                  <div className="text-[10px] text-amber-400 font-mono">
                    Rating: {r.skill_rating} • {r.preferred_role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
