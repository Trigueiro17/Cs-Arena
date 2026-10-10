import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { Shield, Users, Trophy, ArrowLeft, Star, UserCheck, Swords, Layers } from 'lucide-react';
import { GameMode, getGameModeLabel, getTeamSize } from '../lib/tournament-engine';

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
    return <div className="text-center py-20 text-slate-400">Carregando participantes...</div>;
  }

  const gameMode: GameMode = (tournament?.game_mode || '5v5') as GameMode;
  const teamSize = Number(tournament?.team_size) || 5;
  const is1v1 = teamSize === 1 || gameMode === '1v1';
  const modeLabel = getGameModeLabel(gameMode);

  return (
    <div className="space-y-8 pb-16">
      <Link
        to={`/tournaments/${id}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
      </Link>

      <div className="glass-panel rounded-2xl p-6 border border-cs-border">
        <div className="text-xs uppercase font-bold text-cs-orange tracking-wider flex items-center gap-1.5">
          {is1v1 ? <Swords className="w-4 h-4" /> : <Users className="w-4 h-4" />}
          {is1v1 ? 'Duelistas Oficiais 1x1' : `Elencos Oficiais (${modeLabel})`}
        </div>
        <h1 className="text-3xl font-black font-display text-white mt-1">
          {is1v1 ? `Duelistas de ${tournament?.name}` : `Equipes de ${tournament?.name}`}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {is1v1
            ? 'Todos os confrontos são disputados individualmente em duelos MD1.'
            : `Cada equipe ativa é composta por exatamente ${teamSize} jogadores.`}
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-bold font-display text-white">
            {is1v1 ? 'Nenhum duelista sorteado' : 'Nenhuma equipe formada'}
          </h2>
          <p className="text-xs text-slate-400">
            {is1v1
              ? 'A ordem dos duelistas será gerada assim que o sorteio oficial for realizado.'
              : 'As equipes serão geradas assim que o sorteio oficial for realizado.'}
          </p>
          <Link
            to={`/admin/tournaments/${id}/draw`}
            className="inline-block px-5 py-2.5 rounded-xl bg-cs-orange text-cs-dark font-black font-display text-sm tracking-wide shadow-glow-orange"
          >
            Realizar Sorteio
          </Link>
        </div>
      ) : is1v1 ? (
        /* 1v1 Duelists View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {teams.map(t => {
            const member = t.members?.[0] || {
              player_id: t.captain_id,
              nickname: t.name,
              avatar_url: t.captain_avatar,
              skill_rating: 1000,
              preferred_role: 'Duelista',
            };

            return (
              <div
                key={t.id}
                className="glass-panel rounded-2xl p-5 border border-cs-border hover:border-cs-orange/50 transition-all shadow-card-glow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-cs-border">
                    <span className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center font-black font-display text-sm">
                      #{t.seed}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10">
                      Rating: {member.skill_rating || 1000}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.nickname}`}
                      alt=""
                      className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 p-0.5"
                    />
                    <div className="truncate">
                      <h3 className="font-display font-black text-lg text-white truncate">
                        {member.nickname || t.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {member.preferred_role || 'Duelista'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Status na Chave:</span>
                  <span className="font-bold text-emerald-400 uppercase">Confirmado</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2v2 to 5v5 Teams View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => {
            const avgRating =
              team.members.length > 0
                ? Math.round(
                    team.members.reduce((acc: number, m: any) => acc + (m.skill_rating || 1000), 0) /
                      team.members.length
                  )
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
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <img
                            src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`}
                            alt=""
                            className="w-7 h-7 rounded-lg bg-slate-800 p-0.5 border border-slate-700"
                          />
                          <div className="truncate">
                            <span className="font-bold text-white block truncate">{m.nickname}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {m.preferred_role}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.is_captain && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Star className="w-3 h-3 fill-current" /> Cap
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-slate-400">
                            {m.skill_rating || 1000}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-cs-border text-xs text-slate-400 flex items-center justify-between">
                  <span>Integrantes:</span>
                  <span className="font-bold text-white">
                    {team.members.length} / {teamSize}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reserves List if any */}
      {reserves.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-cs-border space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <UserCheck className="w-4 h-4" /> Lista Oficial de Reservas Auditados ({reserves.length})
          </div>
          <p className="text-xs text-slate-400">
            Jogadores que aguardam disponibilidade para substituições autorizadas pela organização.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {reserves.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <img
                    src={r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.nickname}`}
                    alt=""
                    className="w-8 h-8 rounded-lg bg-slate-800 p-0.5 border border-slate-700"
                  />
                  <div className="truncate">
                    <span className="font-bold text-white block truncate">{r.nickname}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {r.preferred_role}
                    </span>
                  </div>
                </div>
                <span className="text-amber-400 font-mono font-bold">{r.skill_rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
