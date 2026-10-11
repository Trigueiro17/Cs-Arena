import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { BracketView } from '../components/BracketView';
import { RouletteWheel } from '../components/RouletteWheel';
import {
  Trophy,
  Tv,
  Maximize2,
  Minimize2,
  ArrowLeft,
  RefreshCw,
  GitFork,
  Play,
  Radio,
  Crosshair,
  Flame,
  Shield,
  Layers,
} from 'lucide-react';
import { GameMode, getGameModeLabel } from '../lib/tournament-engine';

export function TournamentLivePage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const [tournament, setTournament] = useState<any | null>(null);
  const [bracketData, setBracketData] = useState<{ rounds: any[]; matches: any[] }>({
    rounds: [],
    matches: [],
  });
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'bracket' | 'roulette' | 'hud'>('bracket');
  const [selectedHudMatchId, setSelectedHudMatchId] = useState<string | null>(null);
  const [transparentBg, setTransparentBg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [tRes, bRes, rRes, tmRes] = await Promise.all([
        api.getTournament(id),
        api.getBracket(id).catch(() => ({ rounds: [], matches: [] })),
        api.getRegistrations(id),
        api.getTeams(id).catch(() => ({ teams: [] })),
      ]);
      setTournament(tRes.tournament);
      setBracketData({ rounds: bRes.rounds || [], matches: bRes.matches || [] });
      setRegistrations(rRes.registrations || []);
      setTeams(tmRes.teams || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Live polling for OBS browser source (every 4 seconds for real-time scores)
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Carregando feed de transmissão...</div>;
  }

  const gameMode: GameMode = (tournament?.game_mode || '5v5') as GameMode;
  const modeLabel = getGameModeLabel(gameMode);

  // Active match for HUD overlay
  const playableMatches = bracketData.matches.filter(
    (m) => !m.is_bye && (m.player_a_id || m.team_a_id) && (m.player_b_id || m.team_b_id)
  );

  const liveMatch =
    (selectedHudMatchId && playableMatches.find((m) => m.id === selectedHudMatchId)) ||
    playableMatches.find(
      (m) =>
        m.status === 'in_progress' ||
        m.live_phase === 'live' ||
        m.live_score_a > 0 ||
        m.live_score_b > 0
    ) ||
    playableMatches[0] ||
    null;

  const hudPartAName = liveMatch?.player_a_name || liveMatch?.team_a_name || 'Duelista A';
  const hudPartBName = liveMatch?.player_b_name || liveMatch?.team_b_name || 'Duelista B';
  const hudScoreA = liveMatch?.live_score_a ?? 0;
  const hudScoreB = liveMatch?.live_score_b ?? 0;
  const hudMap = liveMatch?.map_name || 'CS2 MAP';

  return (
    <div
      className={`min-h-screen ${
        transparentBg ? 'bg-transparent text-slate-100' : 'bg-cs-dark text-slate-100'
      } ${isFullscreen ? 'p-8' : 'space-y-6 pb-16'}`}
    >
      {/* OBS Overlay Top Bar */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-cs-border gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/tournaments/${id}`}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-black uppercase text-red-500 tracking-wider">
              AO VIVO • OBS CLEAN FEED
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cs-orange/20 text-cs-orange border border-cs-orange/30">
            {modeLabel}
          </span>
          <h1 className="font-display font-black text-xl text-white tracking-wide">
            {tournament?.name}
          </h1>
        </div>

        {/* View Switcher for Stream Producer */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setViewMode('hud')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === 'hud' ? 'bg-cs-orange text-cs-dark' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> Placar HUD
            </button>
            <button
              onClick={() => setViewMode('bracket')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === 'bracket' ? 'bg-cs-orange text-cs-dark' : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" /> Chaveamento
            </button>
            <button
              onClick={() => setViewMode('roulette')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === 'roulette' ? 'bg-cs-orange text-cs-dark' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Roleta
            </button>
          </div>

          <button
            onClick={() => setTransparentBg(!transparentBg)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
              transparentBg
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-white/5 hover:text-white'
            }`}
            title="Alternar Fundo Transparente para OBS Studio"
          >
            Fundo Transparente
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-cs-cyan" />}
          </button>
        </div>
      </div>

      {/* Main Broadcast Scene */}
      <div className="pt-4">
        {/* VIEW 1: HUD BROADCAST OVERLAY */}
        {viewMode === 'hud' ? (
          !liveMatch ? (
            <div className="glass-panel rounded-2xl p-12 text-center max-w-md mx-auto">
              <Crosshair className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-white font-display">Nenhum confronto ativo</div>
              <div className="text-xs text-slate-400 mt-1">Gere o chaveamento para exibir o placar no HUD.</div>
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl mx-auto">
              {/* Match Selector Dropdown for Streamer / Producer */}
              {playableMatches.length > 1 && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Confronto no HUD:</span>
                  <select
                    value={liveMatch.id}
                    onChange={(e) => setSelectedHudMatchId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 font-mono focus:border-cs-orange focus:outline-none"
                  >
                    {playableMatches.map((m) => {
                      const nameA = m.player_a_name || m.team_a_name || 'A';
                      const nameB = m.player_b_name || m.team_b_name || 'B';
                      return (
                        <option key={m.id} value={m.id}>
                          {m.round_name}: {nameA} vs {nameB} ({m.live_score_a ?? 0}x{m.live_score_b ?? 0})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Broadcast Esports HUD Scoreboard Widget */}
              <div className="rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-950 to-orange-950/80 border-2 border-white/15 p-6 shadow-2xl relative overflow-hidden">
                {/* Glow Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-amber-400 to-orange-500" />

                {/* Top Info Bar */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-red-400 font-black uppercase tracking-wider">
                      {liveMatch.status === 'completed'
                        ? 'FINALIZADO'
                        : liveMatch.live_phase === 'live' || hudScoreA > 0 || hudScoreB > 0
                        ? 'AO VIVO NO CS2'
                        : 'AGUARDANDO CONFRONTO'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-cs-orange" />
                      MAPA: {hudMap.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/40 text-slate-300">
                      MD{liveMatch.best_of || 1}
                    </span>
                  </div>
                </div>

                {/* Scoreboard Dual Team Duel Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                  {/* Participant A (Blue / CT) */}
                  <div className="flex items-center gap-4 justify-start">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-blue-500/40 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
                      {liveMatch.player_a_avatar ? (
                        <img src={liveMatch.player_a_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shield className="w-8 h-8 text-blue-400" />
                      )}
                    </div>
                    <div className="truncate">
                      <span className="text-[10px] uppercase font-bold text-blue-400 font-mono tracking-wider block">
                        DUELISTA #1
                      </span>
                      <span className="text-2xl font-black font-display text-white tracking-wide truncate block">
                        {hudPartAName}
                      </span>
                    </div>
                  </div>

                  {/* Center Score Numbers */}
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-4 font-mono font-black text-6xl text-white">
                      <span className="w-20 text-right text-blue-400 drop-shadow-md">{hudScoreA}</span>
                      <span className="text-slate-600 text-4xl">:</span>
                      <span className="w-20 text-left text-orange-400 drop-shadow-md">{hudScoreB}</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                      {liveMatch.round_name || 'Fase Eliminatória'}
                    </div>
                  </div>

                  {/* Participant B (Orange / T) */}
                  <div className="flex items-center gap-4 justify-end text-right">
                    <div className="truncate">
                      <span className="text-[10px] uppercase font-bold text-orange-400 font-mono tracking-wider block">
                        DUELISTA #2
                      </span>
                      <span className="text-2xl font-black font-display text-white tracking-wide truncate block">
                        {hudPartBName}
                      </span>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-orange-500/40 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
                      {liveMatch.player_b_avatar ? (
                        <img src={liveMatch.player_b_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shield className="w-8 h-8 text-orange-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Server Status Sub-bar */}
                {liveMatch.server_ip && (
                  <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                    <span>Servidor Conectado:</span>
                    <span className="text-white font-bold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                      {liveMatch.server_ip}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        ) : viewMode === 'bracket' ? (
          bracketData.rounds.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center max-w-md mx-auto">
              <GitFork className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-white font-display">Aguardando sorteio da chave</div>
              <div className="text-xs text-slate-400 mt-1">O chaveamento ao vivo será exibido aqui assim que gerado.</div>
            </div>
          ) : (
            <BracketView
              rounds={bracketData.rounds}
              matches={bracketData.matches}
              tournament={tournament}
              onRefresh={loadData}
            />
          )
        ) : (
          <RouletteWheel
            candidates={registrations.map((r) => ({
              id: r.player_id,
              nickname: r.nickname,
              avatarUrl: r.avatar_url,
              preferredRole: r.preferred_role,
            }))}
            steps={teams.flatMap((t) =>
              (t.members && t.members.length > 0
                ? t.members
                : [{ player_id: t.captain_id, nickname: t.name, avatar_url: t.captain_avatar, is_captain: true }]
              ).map((m: any, idx: number) => ({
                order: idx + 1,
                playerId: m.player_id,
                playerNickname: m.nickname,
                avatarUrl: m.avatar_url,
                teamName: t.name,
                teamSeed: t.seed,
                isCaptain: m.is_captain,
              }))
            )}
            isLiveMode={true}
          />
        )}
      </div>
    </div>
  );
}
