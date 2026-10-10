import React, { useState } from 'react';
import { api } from '../lib/api';
import { X, Trophy, CheckCircle, MapPin, Link2, AlertCircle } from 'lucide-react';
import { GameMode, getRecommendedMaps } from '../lib/tournament-engine';

interface MatchModalProps {
  match: any;
  tournamentGameMode?: GameMode;
  onClose: () => void;
  onSuccess: () => void;
}

export function MatchModal({ match, tournamentGameMode, onClose, onSuccess }: MatchModalProps) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const partAName = match.player_a_name || match.team_a_name || 'Participante A';
  const partBName = match.player_b_name || match.team_b_name || 'Participante B';

  const effectiveMapName = isCustom && customMap.trim() ? customMap.trim() : mapName;

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
            Arbitragem Oficial • MD1 Eliminatório
          </div>
          <h2 className="text-xl font-bold font-display text-white mt-1 truncate">
            {partAName} <span className="text-slate-500 font-normal">vs</span> {partBName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina o mapa oficial da partida e registre os rounds oficiais da disputa.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Map Selection */}
          <div className="p-4 rounded-xl bg-cs-surface border border-cs-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cs-orange" />
                Mapa Disputado *
              </label>
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className="text-[11px] text-cs-cyan hover:underline font-mono"
              >
                {isCustom ? 'Escolher do pool' : 'Outro mapa / Custom'}
              </button>
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
      </div>
    </div>
  );
}
