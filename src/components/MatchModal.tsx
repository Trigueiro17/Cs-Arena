import React, { useState } from 'react';
import { api } from '../lib/api';
import { X, Trophy, Plus, Trash2, CheckCircle } from 'lucide-react';

const CS2_MAP_POOL = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust II', 'Vertigo'];

interface MatchModalProps {
  match: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function MatchModal({ match, onClose, onSuccess }: MatchModalProps) {
  const bestOf = match.best_of || 1;
  const initialMaps = (match.maps && match.maps.length > 0)
    ? match.maps.map((m: any) => ({
        orderNumber: m.order_number,
        mapName: m.map_name,
        scoreA: m.score_a,
        scoreB: m.score_b,
      }))
    : [
        {
          orderNumber: 1,
          mapName: 'Mirage',
          scoreA: 13,
          scoreB: 11,
        },
      ];

  const [maps, setMaps] = useState(initialMaps);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addMap = () => {
    if (maps.length >= bestOf) return;
    const nextOrder = maps.length + 1;
    const usedMaps = maps.map((m: any) => m.mapName);
    const available = CS2_MAP_POOL.find(name => !usedMaps.includes(name)) || CS2_MAP_POOL[0];

    setMaps([...maps, { orderNumber: nextOrder, mapName: available, scoreA: 13, scoreB: 9 }]);
  };

  const removeMap = (index: number) => {
    if (maps.length <= 1) return;
    setMaps(maps.filter((_: any, i: number) => i !== index).map((m: any, i: number) => ({ ...m, orderNumber: i + 1 })));
  };

  const updateMap = (index: number, field: string, val: any) => {
    const updated = [...maps];
    updated[index] = { ...updated[index], [field]: val };
    setMaps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Validate no ties
    for (const m of maps) {
      if (Number(m.scoreA) === Number(m.scoreB)) {
        setErrorMessage(`O mapa ${m.orderNumber} (${m.mapName}) não pode terminar empatado no CS2.`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await api.submitMatchResult(match.id, maps);
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
          <div className="text-xs uppercase font-bold text-cs-orange tracking-wider">
            Painel de Arbitragem — MD{bestOf}
          </div>
          <h2 className="text-xl font-bold font-display text-white mt-1">
            {match.team_a_name || 'A definir'} vs {match.team_b_name || 'A definir'}
          </h2>
          <p className="text-xs text-slate-400">
            Informe os placares oficiais de cada mapa disputado.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {maps.map((m: any, index: number) => (
              <div key={index} className="p-3 rounded-xl bg-cs-surface border border-cs-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Mapa {m.orderNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={m.mapName}
                      onChange={(e) => updateMap(index, 'mapName', e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1"
                    >
                      {CS2_MAP_POOL.map(mapName => (
                        <option key={mapName} value={mapName}>
                          {mapName}
                        </option>
                      ))}
                    </select>
                    {maps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMap(index)}
                        className="text-slate-400 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 truncate">
                      {match.team_a_name || 'Time A'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={m.scoreA}
                      onChange={(e) => updateMap(index, 'scoreA', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-center font-bold font-mono text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 truncate">
                      {match.team_b_name || 'Time B'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={m.scoreB}
                      onChange={(e) => updateMap(index, 'scoreB', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-center font-bold font-mono text-white"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {maps.length < bestOf && (
            <button
              type="button"
              onClick={addMap}
              className="w-full py-2 border border-dashed border-slate-700 hover:border-cs-orange text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4 text-cs-orange" /> Adicionar Próximo Mapa da Série
            </button>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-cs-orange hover:bg-cs-orange-hover text-cs-dark flex items-center gap-1.5 shadow-glow-orange disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Confirmar Resultado e Avançar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
