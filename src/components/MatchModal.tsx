import React, { useState } from 'react';
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
} from 'lucide-react';
import { GameMode, getRecommendedMaps } from '../lib/tournament-engine';

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

  const initialScoreA = match.maps && match.maps[0] ? match.maps[0].score_a : 13;
  const initialScoreB = match.maps && match.maps[0] ? match.maps[0].score_b : 11;
  const initialEvidence = match.evidence_url || '';

  const [mapName, setMapName] = useState(initialMapName);
  const [customMap, setCustomMap] = useState('');
  const [isCustom, setIsCustom] = useState(!recommendedMaps.includes(initialMapName));
  const [scoreA, setScoreA] = useState<number>(initialScoreA);
  const [scoreB, setScoreB] = useState<number>(initialScoreB);
  const [evidenceUrl, setEvidenceUrl] = useState(initialEvidence);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMap, setIsSavingMap] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const partAName = match.player_a_name || match.team_a_name || 'Participante A';
  const partBName = match.player_b_name || match.team_b_name || 'Participante B';

  const effectiveMapName = isCustom && customMap.trim() ? customMap.trim() : mapName;

  const handleShuffleMap = () => {
    const others = recommendedMaps.filter((m) => m !== mapName);
    const pool = others.length > 0 ? others : recommendedMaps;
    const picked = pool[Math.floor(Math.random() * pool.length)] || recommendedMaps[0];
    setMapName(picked);
    setIsCustom(false);
    setSuccessNotice(`Novo mapa sorteado: ${picked}`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleSaveMapOnly = async () => {
    if (!effectiveMapName) {
      setErrorMessage('Selecione ou informe um mapa.');
      return;
    }
    setIsSavingMap(true);
    setErrorMessage(null);
    try {
      await api.updateMatchMap(match.id, effectiveMapName);
      setSuccessNotice(`Mapa oficial salvo como: ${effectiveMapName}`);
      match.map_name = effectiveMapName;
      onSuccess();
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar mapa.');
    } finally {
      setIsSavingMap(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Validate no ties
    if (Number(scoreA) === Number(scoreB)) {
      setErrorMessage('Partidas de Counter-Strike 2 não podem terminar empatadas. Deve haver um vencedor.');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cs-card border border-cs-border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="text-xs uppercase font-bold text-cs-orange tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            {readOnly ? 'Detalhes do Confronto' : 'Arbitragem Oficial'} • MD{match.best_of || 1} Eliminatório
          </div>
          <h2 className="text-xl font-bold font-display text-white mt-1 truncate">
            {partAName} <span className="text-slate-500 font-normal">vs</span> {partBName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {readOnly
              ? 'Consulte o mapa oficial e status do confronto.'
              : 'Defina o mapa oficial da partida e registre os rounds oficiais da disputa.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Read-Only View for Spectators / Players */}
        {readOnly ? (
          <div className="space-y-4">
            {/* Map Spotlight */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-slate-900 border border-orange-500/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cs-orange" />
                Mapa Oficial da Partida
              </span>
              <div className="text-lg font-mono font-black text-amber-300">
                {effectiveMapName}
              </div>
              <span className="text-[11px] text-slate-400 block">
                Modalidade: {gameMode.toUpperCase()} CS2
              </span>
            </div>

            {/* Match Status & Scores */}
            <div className="p-4 rounded-xl bg-cs-surface border border-cs-border space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Status do Confronto
              </span>
              {match.status === 'completed' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-mono font-bold text-white bg-slate-900 p-2.5 rounded-lg border border-white/5">
                    <span>{partAName}</span>
                    <span className="text-amber-400">{initialScoreA} x {initialScoreB}</span>
                    <span>{partBName}</span>
                  </div>
                  <div className="text-center text-xs text-emerald-400 font-bold">
                    Vencedor: {match.winner_player_name || match.winner_name || 'Definido'}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-400 font-mono py-2 bg-amber-500/10 rounded-lg text-center border border-amber-500/20">
                  Partida aguardando início / registro pela arbitragem.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          /* Admin Form with Map Selection, Shuffle & Scores */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Map Selection */}
            <div className="p-4 rounded-xl bg-cs-surface border border-cs-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-cs-orange" />
                  Mapa Disputado *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleShuffleMap}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    title="Sortear outro mapa do pool"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Sortear Outro
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustom(!isCustom)}
                    className="text-[11px] text-cs-cyan hover:underline font-mono"
                  >
                    {isCustom ? 'Escolher do pool' : 'Outro / Custom'}
                  </button>
                </div>
              </div>

              {isCustom ? (
                <input
                  type="text"
                  value={customMap}
                  onChange={(e) => setCustomMap(e.target.value)}
                  placeholder="Ex: aim_map, aim_redline, workshop_map"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cs-orange font-mono"
                />
              ) : (
                <select
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cs-orange font-mono"
                >
                  {recommendedMaps.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}

              {/* Quick Save Map Button (saves map even if score isn't ready) */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">
                  Pool recomendado para modalidade {gameMode.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={handleSaveMapOnly}
                  disabled={isSavingMap}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-white/5 transition-colors"
                >
                  <Save className="w-3 h-3 text-amber-400" />
                  {isSavingMap ? 'Salvando...' : 'Salvar Apenas Mapa'}
                </button>
              </div>
            </div>

            {/* Scores Row */}
            <div className="p-4 rounded-xl bg-cs-surface border border-cs-border space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Placar Oficial (MD1)
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center font-black font-mono text-xl text-white focus:outline-none focus:border-cs-orange"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center font-black font-mono text-xl text-white focus:outline-none focus:border-cs-orange"
                    required
                  />
                </div>
              </div>

              {/* Winner live preview */}
              <div className="text-center pt-2">
                {scoreA !== scoreB ? (
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    Vencedor: {scoreA > scoreB ? partAName : partBName}
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 font-mono">
                    Placar empatado (informe o vencedor da prorrogação)
                  </span>
                )}
              </div>
            </div>

            {/* Evidence URL (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                Link da Evidência / Screenshot (Opcional)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://imgur.com/... ou link da demo"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cs-orange font-mono"
              />
            </div>

            {/* Action Buttons */}
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
