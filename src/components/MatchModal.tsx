import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  X,
  Trophy,
  CheckCircle,
  MapPin,
  Link2,
  AlertCircle,
  Dices,
  Save,
  Crosshair,
  Sparkles,
  Gamepad2,
  Terminal,
  Copy,
  Download,
  ExternalLink,
  Play,
  Pause,
  Radio,
  Flame,
} from 'lucide-react';
import { GameMode, getRecommendedMaps, getCs2MapCommand } from '../lib/tournament-engine';

interface MatchModalProps {
  match: any;
  tournamentGameMode?: GameMode;
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MatchModal({
  match,
  tournamentGameMode,
  readOnly = false,
  onClose,
  onSuccess,
}: MatchModalProps) {
  const gameMode: GameMode = tournamentGameMode || match.game_mode || '5v5';
  const recommendedMaps = getRecommendedMaps(gameMode);

  const initialMapName =
    match.map_name ||
    (match.maps && match.maps[0]?.map_name) ||
    recommendedMaps[0] ||
    'Mirage';

  const [activeTab, setActiveTab] = useState<'live' | 'connect' | 'gsi' | 'finalize'>('live');

  // Map state
  const [mapName, setMapName] = useState(initialMapName);
  const [customMap, setCustomMap] = useState('');
  const [isCustom, setIsCustom] = useState(!recommendedMaps.includes(initialMapName));
  const [isSavingMap, setIsSavingMap] = useState(false);

  // Live Score state
  const [liveScoreA, setLiveScoreA] = useState<number>(match.live_score_a ?? 0);
  const [liveScoreB, setLiveScoreB] = useState<number>(match.live_score_b ?? 0);
  const [livePhase, setLivePhase] = useState<string>(match.live_phase ?? 'scheduled');
  const [isUpdatingLive, setIsUpdatingLive] = useState(false);

  // Server state
  const [serverIp, setServerIp] = useState<string>(match.server_ip || '');
  const [serverPassword, setServerPassword] = useState<string>(match.server_password || '');
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [showServerGuide, setShowServerGuide] = useState(false);

  // Finalize Manual state
  const [scoreA, setScoreA] = useState<number>(
    match.status === 'completed' && match.maps?.[0]
      ? match.maps[0].score_a
      : match.live_score_a > 0
      ? match.live_score_a
      : 13
  );
  const [scoreB, setScoreB] = useState<number>(
    match.status === 'completed' && match.maps?.[0]
      ? match.maps[0].score_b
      : match.live_score_b > 0
      ? match.live_score_b
      : 11
  );
  const [evidenceUrl, setEvidenceUrl] = useState(match.evidence_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback notifications
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const partAName = match.player_a_name || match.team_a_name || 'Participante A';
  const partBName = match.player_b_name || match.team_b_name || 'Participante B';
  const effectiveMapName = isCustom && customMap.trim() ? customMap.trim() : mapName;

  // Poll live match data every 4 seconds when live tab is active
  useEffect(() => {
    let interval: any = null;
    const pollLive = async () => {
      try {
        const data = await api.getLiveMatch(match.id);
        if (data) {
          setLiveScoreA(data.liveScoreA ?? 0);
          setLiveScoreB(data.liveScoreB ?? 0);
          setLivePhase(data.livePhase ?? 'scheduled');
          if (data.mapName && !isCustom) {
            setMapName(data.mapName);
          }
          if (data.serverIp) setServerIp(data.serverIp);
          if (data.serverPassword) setServerPassword(data.serverPassword);
        }
      } catch (err) {
        // Silent poll error
      }
    };

    pollLive();
    interval = setInterval(pollLive, 4000);
    return () => clearInterval(interval);
  }, [match.id, isCustom]);

  const notify = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    notify(`Comando copiado: ${label}`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const engineMapName = getCs2MapCommand(effectiveMapName);

  // Launch CS2 via Steam URL Protocol
  const handleLaunchCS2Local = () => {
    // Steam protocol to launch CS2 directly on map
    const steamUrl = `steam://rungame/730/76561202255233023/+map ${engineMapName}`;
    window.location.href = steamUrl;
    notify(`Iniciando Counter-Strike 2 no mapa ${engineMapName}...`);
  };

  const handleLaunchCS2Connect = () => {
    if (!serverIp.trim()) {
      setErrorMessage('Informe o IP:Porta do servidor para conectar.');
      return;
    }
    const cleanIp = serverIp.trim();
    const cleanPwd = serverPassword.trim();
    const steamUrl = `steam://connect/${cleanIp}${cleanPwd ? `?password=${cleanPwd}` : ''}`;
    window.location.href = steamUrl;
    notify(`Conectando ao servidor CS2 (${cleanIp})...`);
  };

  const consoleCommand = serverIp.trim()
    ? `connect ${serverIp.trim()}${serverPassword.trim() ? `; password ${serverPassword.trim()}` : ''}`
    : `map ${engineMapName}`;

  // Shuffle map from pool
  const handleShuffleMap = () => {
    const others = recommendedMaps.filter((m) => m !== mapName);
    const pool = others.length > 0 ? others : recommendedMaps;
    const picked = pool[Math.floor(Math.random() * pool.length)] || recommendedMaps[0];
    setMapName(picked);
    setIsCustom(false);
    notify(`Novo mapa sorteado: ${picked}`);
  };

  // Save Map Only
  const handleSaveMapOnly = async () => {
    if (!effectiveMapName) {
      setErrorMessage('Selecione ou informe um mapa.');
      return;
    }
    setIsSavingMap(true);
    setErrorMessage(null);
    try {
      await api.updateMatchMap(match.id, effectiveMapName);
      match.map_name = effectiveMapName;
      notify(`Mapa oficial salvo como: ${effectiveMapName}`);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar mapa.');
    } finally {
      setIsSavingMap(false);
    }
  };

  // Save Server Config
  const handleSaveServer = async () => {
    setIsSavingServer(true);
    setErrorMessage(null);
    try {
      await api.updateMatchServer(match.id, serverIp, serverPassword);
      match.server_ip = serverIp;
      match.server_password = serverPassword;
      notify('Servidor da partida configurado com sucesso!');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar servidor.');
    } finally {
      setIsSavingServer(false);
    }
  };

  // Live Score Adjustment (+1 / -1)
  const handleAdjustLiveScore = async (deltaA: number, deltaB: number) => {
    if (readOnly) return;
    const nextA = Math.max(0, liveScoreA + deltaA);
    const nextB = Math.max(0, liveScoreB + deltaB);
    setLiveScoreA(nextA);
    setLiveScoreB(nextB);
    setIsUpdatingLive(true);
    try {
      await api.updateLiveScore(match.id, {
        scoreA: nextA,
        scoreB: nextB,
        phase: 'live',
      });
      match.live_score_a = nextA;
      match.live_score_b = nextB;
      match.live_phase = 'live';
      match.status = 'in_progress';
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao sincronizar placar ao vivo.');
    } finally {
      setIsUpdatingLive(false);
    }
  };

  const handleToggleLivePhase = async (newPhase: 'live' | 'paused') => {
    setIsUpdatingLive(true);
    try {
      await api.updateLiveScore(match.id, {
        scoreA: liveScoreA,
        scoreB: liveScoreB,
        phase: newPhase,
      });
      setLivePhase(newPhase);
      match.live_phase = newPhase;
      notify(newPhase === 'live' ? 'Partida marcada como AO VIVO!' : 'Partida pausada.');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar status.');
    } finally {
      setIsUpdatingLive(false);
    }
  };

  // Finalize Match with Live Score
  const handleFinalizeWithLiveScore = async () => {
    if (liveScoreA === liveScoreB) {
      setErrorMessage('Partidas de CS2 não podem terminar empatadas. Registre o round de desempate.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    const mapsPayload = [
      {
        orderNumber: 1,
        mapName: effectiveMapName,
        scoreA: liveScoreA,
        scoreB: liveScoreB,
      },
    ];
    try {
      await api.submitMatchResult(match.id, mapsPayload, evidenceUrl.trim() || undefined);
      notify('Partida finalizada e vencedor avançado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao finalizar partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Scoreboard Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (Number(scoreA) === Number(scoreB)) {
      setErrorMessage('Partidas de Counter-Strike 2 não podem terminar empatadas.');
      setIsSubmitting(false);
      return;
    }
    if (!effectiveMapName) {
      setErrorMessage('Selecione ou informe o mapa disputado.');
      setIsSubmitting(false);
      return;
    }

    const mapsPayload = [
      {
        orderNumber: 1,
        mapName: effectiveMapName,
        scoreA: Number(scoreA),
        scoreB: Number(scoreB),
      },
    ];

    try {
      await api.submitMatchResult(match.id, mapsPayload, evidenceUrl.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar resultado da partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download GSI CFG
  const handleDownloadGSI = () => {
    const origin = window.location.origin;
    const cfgContent = `"CS Arena GSI v1.0"
{
 "uri" "${origin}/api/matches/${match.id}/gsi"
 "timeout" "5.0"
 "buffer"  "0.1"
 "throttle" "0.5"
 "heartbeat" "15.0"
 "data"
 {
   "provider"            "1"
   "map"                 "1"
   "round"               "1"
   "player_id"           "1"
   "allplayers_id"       "1"
   "allplayers_match_stats" "1"
 }
}`;
    const blob = new Blob([cfgContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamestate_integration_csarena_${match.id.slice(0, 8)}.cfg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Arquivo gamestate_integration baixado com sucesso!');
  };

  const isLiveActive = livePhase === 'live' || liveScoreA > 0 || liveScoreB > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f17] border border-cs-border rounded-2xl w-full max-w-xl shadow-2xl relative overflow-hidden my-6">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-500" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase font-black text-cs-orange tracking-widest flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-cs-orange" />
              <span>Confronto Oficial • MD{match.best_of || 1}</span>
            </div>

            {isLiveActive ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                AO VIVO NO CS2
              </span>
            ) : match.status === 'completed' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Finalizado
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-white/10">
                Aguardando Início
              </span>
            )}
          </div>

          <h2 className="text-2xl font-black font-display text-white mt-1.5 truncate">
            {partAName} <span className="text-slate-500 font-normal text-lg">vs</span> {partBName}
          </h2>

          <div className="flex items-center gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-[11px] font-mono font-black text-amber-300 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cs-orange" />
              MAPA: {effectiveMapName}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Modalidade: {gameMode.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 flex items-center gap-1 border-b border-white/5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === 'live'
                ? 'border-cs-orange text-cs-orange bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Placar Ao Vivo
          </button>

          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === 'connect'
                ? 'border-cs-orange text-cs-orange bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Abrir CS2 & Conectar
          </button>

          <button
            onClick={() => setActiveTab('gsi')}
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === 'gsi'
                ? 'border-cs-orange text-cs-orange bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            GSI Automático
          </button>

          {!readOnly && (
            <button
              onClick={() => setActiveTab('finalize')}
              className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'finalize'
                  ? 'border-cs-orange text-cs-orange bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Finalizar Manual
            </button>
          )}
        </div>

        {/* TAB 1: PLACAR AO VIVO */}
        {activeTab === 'live' && (
          <div className="p-6 space-y-6">
            {/* Big Live Scoreboard Display */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-[#0e1420] border border-white/10 shadow-inner">
              <div className="text-center text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                PLACAR OFICIAL EM TEMPO REAL • CS2 MD1
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                {/* Participant A */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                    {match.player_a_avatar ? (
                      <img src={match.player_a_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-black text-lg text-slate-400">#1</span>
                    )}
                  </div>
                  <div className="font-black text-sm text-white truncate max-w-[120px] mx-auto font-display">
                    {partAName}
                  </div>

                  {!readOnly && (
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustLiveScore(-1, 0)}
                        disabled={isUpdatingLive || liveScoreA <= 0}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs transition-colors disabled:opacity-40"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustLiveScore(1, 0)}
                        disabled={isUpdatingLive}
                        className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black text-xs transition-colors"
                      >
                        +1
                      </button>
                    </div>
                  )}
                </div>

                {/* Score Numbers */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-3 font-mono font-black text-4xl text-white">
                    <span className="w-14 text-right text-amber-300">{liveScoreA}</span>
                    <span className="text-slate-600">:</span>
                    <span className="w-14 text-left text-amber-300">{liveScoreB}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">
                    {liveScoreA > liveScoreB
                      ? `${partAName} Lidera`
                      : liveScoreB > liveScoreA
                      ? `${partBName} Lidera`
                      : 'Empate Técnico'}
                  </span>
                </div>

                {/* Participant B */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                    {match.player_b_avatar ? (
                      <img src={match.player_b_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-black text-lg text-slate-400">#2</span>
                    )}
                  </div>
                  <div className="font-black text-sm text-white truncate max-w-[120px] mx-auto font-display">
                    {partBName}
                  </div>

                  {!readOnly && (
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustLiveScore(0, -1)}
                        disabled={isUpdatingLive || liveScoreB <= 0}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs transition-colors disabled:opacity-40"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustLiveScore(0, 1)}
                        disabled={isUpdatingLive}
                        className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black text-xs transition-colors"
                      >
                        +1
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions for Live Match */}
            {!readOnly && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {livePhase !== 'live' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleLivePhase('live')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Marcar Partida AO VIVO
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleLivePhase('paused')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pausar Partida
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalizeWithLiveScore}
                    disabled={isSubmitting || liveScoreA === liveScoreB}
                    className="px-4 py-2 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black text-xs flex items-center gap-1.5 shadow-glow-orange disabled:opacity-50 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Finalizar com Este Placar
                  </button>
                </div>
              </div>
            )}

            {/* Quick Launch Shortcuts */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Acesso Rápido ao CS2
                </span>
                <span className="text-xs text-white font-mono font-bold">
                  {serverIp ? `Servidor: ${serverIp}` : `Mapa Local: ${effectiveMapName}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchCS2Local}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-amber-300 border border-orange-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  Abrir CS2 (+map)
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(consoleCommand, 'Console CS2')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Copiar Console (~)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ABRIR CS2 & CONEXÃO DE SERVIDOR */}
        {activeTab === 'connect' && (
          <div className="p-6 space-y-5">
            {/* Direct Launch Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleLaunchCS2Local}
                className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-slate-900 border border-orange-500/30 text-left hover:border-amber-400 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-cs-orange mb-2 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div className="font-black text-sm text-white">Abrir CS2 no Mapa</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Inicia o Counter-Strike 2 no PC carregando o mapa <b>{effectiveMapName}</b>.
                </p>
                <span className="text-[10px] text-amber-400 font-mono font-bold mt-2 inline-flex items-center gap-1">
                  steam://rungame/730... <ExternalLink className="w-3 h-3" />
                </span>
              </button>

              <button
                type="button"
                onClick={handleLaunchCS2Connect}
                disabled={!serverIp.trim()}
                className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-slate-900 border border-cyan-500/30 text-left hover:border-cyan-400 transition-all group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cs-cyan mb-2 group-hover:scale-110 transition-transform">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="font-black text-sm text-white">Conectar ao Servidor</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Conecta diretamente ao servidor dedicado via protocolo Steam.
                </p>
                <span className="text-[10px] text-cyan-400 font-mono font-bold mt-2 inline-flex items-center gap-1">
                  {serverIp ? `steam://connect/${serverIp}` : 'Configure o IP abaixo'}
                </span>
              </button>
            </div>

            {/* Console Command Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cs-orange" />
                  Comando para o Console do CS2 (tecla ~)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(consoleCommand, consoleCommand)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copiar Comando
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-black/60 font-mono text-xs text-amber-300 border border-white/5 break-all select-all flex items-center justify-between">
                <span>{consoleCommand}</span>
                <span className="text-[10px] text-slate-500 font-mono">Source 2 Engine</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Pressione a tecla <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold border border-white/10">~</kbd> no CS2 e cole o comando oficial acima para carregar o mapa.
              </p>
            </div>

            {/* Server Configuration Form (Admin Only) */}
            {!readOnly && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Configurar Servidor Dedicado / MatchZy (Opcional)
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveServer}
                    disabled={isSavingServer}
                    className="px-3 py-1 rounded-lg bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    {isSavingServer ? 'Salvando...' : 'Salvar Servidor'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      IP e Porta do Servidor
                    </label>
                    <input
                      type="text"
                      value={serverIp}
                      onChange={(e) => setServerIp(e.target.value)}
                      placeholder="Ex: 192.168.1.100:27015 ou cs2.servidor.com:27015"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cs-orange focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Senha do Servidor (se houver)
                    </label>
                    <input
                      type="text"
                      value={serverPassword}
                      onChange={(e) => setServerPassword(e.target.value)}
                      placeholder="Senha da partida"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cs-orange focus:outline-none"
                    />
                  </div>
                </div>

                {/* Expandable Server Hosting Guide */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowServerGuide(!showServerGuide)}
                    className="text-[11px] text-cs-cyan hover:underline font-bold flex items-center gap-1"
                  >
                    💡 {showServerGuide ? 'Ocultar guia de servidor' : 'Como criar e conectar o servidor de CS2?'}
                  </button>

                  {showServerGuide && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-300 space-y-3">
                      <div>
                        <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                          <span>Opção 1: Jogar no seu PC sem custos (Radmin VPN ou Hamachi)</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          1. Você e o adversário entram na mesma rede no <b>Radmin VPN</b> (ou Hamachi).<br />
                          2. No seu CS2, abra o console (<kbd className="font-mono text-amber-300">~</kbd>) e digite: <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">sv_lan 0; map {engineMapName}</code><br />
                          3. Copie o seu IP do Radmin (ex: <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">26.120.45.10:27015</code>), cole no campo acima e clique em <b>Salvar Servidor</b>.<br />
                          4. Agora basta clicar em <b>Conectar ao Servidor</b> que a Steam abre e conecta os duelistas direto!
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <div className="font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
                          <span>Opção 2: Servidor Dedicado em Nuvem (Dathost / VPS / MatchZy)</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          1. Crie ou utilize um servidor dedicado de CS2 (ex: Dathost, GamersClub ou VPS).<br />
                          2. Cole o <b>IP:Porta</b> e a <b>Senha</b> nos campos acima e clique em <b>Salvar Servidor</b>.<br />
                          3. Os jogadores clicam em <b>Conectar ao Servidor</b> e entram na partida instantaneamente!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Management Form */}
            {!readOnly && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-cs-orange" />
                    Alterar / Sortear Mapa
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShuffleMap}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      Sortear Outro
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustom(!isCustom)}
                      className="text-[11px] text-cs-cyan hover:underline font-mono"
                    >
                      {isCustom ? 'Pool Oficial' : 'Custom'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isCustom ? (
                    <input
                      type="text"
                      value={customMap}
                      onChange={(e) => setCustomMap(e.target.value)}
                      placeholder="Ex: aim_redline, aim_map"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cs-orange focus:outline-none"
                    />
                  ) : (
                    <select
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cs-orange focus:outline-none"
                    >
                      {recommendedMaps.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveMapOnly}
                    disabled={isSavingMap}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 border border-white/5 transition-colors"
                  >
                    <Save className="w-3 h-3 text-amber-400" />
                    {isSavingMap ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GSI AUTOMÁTICO DO CS2 */}
        {activeTab === 'gsi' && (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-slate-900 border border-orange-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cs-orange" />
                <span className="font-bold text-sm text-white">
                  Placar 100% Automático via Valve CS2 GSI
                </span>
              </div>
              <p className="text-xs text-slate-300">
                O Counter-Strike 2 possui uma integração oficial (Game State Integration). Ao instalar o arquivo de configuração, o próprio CS2 enviará o placar, rounds ganhos e status da partida diretamente para o CS Arena sem você precisar digitar nada!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Instruções de Instalação (1 Passo)
              </span>

              <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside">
                <li>
                  Clique no botão abaixo para baixar o arquivo <b>gamestate_integration_csarena.cfg</b>.
                </li>
                <li>
                  Copie o arquivo para a pasta de configurações do seu Counter-Strike 2:
                  <div className="mt-1 p-2 rounded-lg bg-black/60 font-mono text-[11px] text-amber-300 border border-white/5 select-all">
                    Counter-Strike Global Offensive/game/csgo/cfg/
                  </div>
                </li>
                <li>
                  Abra o CS2 e jogue a partida normalmente. Cada round vencido atualizará o placar do site em tempo real!
                </li>
              </ol>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadGSI}
                  className="px-4 py-2.5 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black text-xs flex items-center gap-2 shadow-glow-orange transition-all"
                >
                  <Download className="w-4 h-4" />
                  Baixar gamestate_integration_csarena.cfg
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] font-mono text-slate-400">
              Endpoint GSI ativo: <span className="text-emerald-400">/api/matches/{match.id}/gsi</span>
            </div>
          </div>
        )}

        {/* TAB 4: FINALIZAR MANUAL (ARBITRAGEM TRADICIONAL) */}
        {activeTab === 'finalize' && !readOnly && (
          <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Placar Oficial da Partida (MD1)
              </span>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold block truncate">
                    {partAName}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center font-black font-mono text-xl text-white focus:outline-none focus:border-cs-orange"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold block truncate">
                    {partBName}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center font-black font-mono text-xl text-white focus:outline-none focus:border-cs-orange"
                    required
                  />
                </div>
              </div>

              <div className="text-center pt-1">
                {scoreA !== scoreB ? (
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    Vencedor declarado: {scoreA > scoreB ? partAName : partBName}
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 font-mono">
                    Placar empatado (informe o vencedor da prorrogação)
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                Link da Evidência / Screenshot / Demo (Opcional)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://imgur.com/... ou link da demo"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cs-orange font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || scoreA === scoreB}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark flex items-center gap-1.5 shadow-glow-orange disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {isSubmitting ? 'Salvando...' : 'Confirmar Resultado e Avançar Vencedor'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
