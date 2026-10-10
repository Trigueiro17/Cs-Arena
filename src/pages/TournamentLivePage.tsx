import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { BracketView } from '../components/BracketView';
import { RouletteWheel } from '../components/RouletteWheel';
import { Trophy, Tv, Maximize2, Minimize2, ArrowLeft, RefreshCw, GitFork, Play } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'bracket' | 'roulette'>('bracket');
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
    // Live polling for OBS browser source (every 8 seconds)
    const interval = setInterval(loadData, 8000);
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

  return (
    <div className={`min-h-screen bg-cs-dark text-slate-100 ${isFullscreen ? 'p-8' : 'space-y-6 pb-16'}`}>
      {/* OBS Overlay Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-cs-border">
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
        {viewMode === 'bracket' ? (
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
            candidates={registrations.map(r => ({
              id: r.player_id,
              nickname: r.nickname,
              avatarUrl: r.avatar_url,
              preferredRole: r.preferred_role,
            }))}
            steps={teams.flatMap(t =>
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
