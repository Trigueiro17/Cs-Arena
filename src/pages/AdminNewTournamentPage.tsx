import React, { useState } from 'react';
import { api } from '../lib/api';
import { useRouter, Link } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  PlusCircle,
  ArrowLeft,
  Users,
  Swords,
  Shield,
  Layers,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  GameMode,
  getTeamSize,
  getGameModeLabel,
  getDefaultTournamentRules,
  getRecommendedMaps,
} from '../lib/tournament-engine';

interface GameModeOption {
  mode: GameMode;
  label: string;
  subtitle: string;
  teamSize: number;
  minPlayers: number;
  icon: typeof Swords;
  badgeColor: string;
}

const GAME_MODES: GameModeOption[] = [
  {
    mode: '1v1',
    label: '1x1 Duelo',
    subtitle: 'Duelo individual 1 vs 1',
    teamSize: 1,
    minPlayers: 2,
    icon: Swords,
    badgeColor: 'border-red-500/40 text-red-400 bg-red-500/10',
  },
  {
    mode: '2v2',
    label: '2x2 Duplas',
    subtitle: 'Modo Wingman / Duplas táticas',
    teamSize: 2,
    minPlayers: 4,
    icon: Users,
    badgeColor: 'border-sky-500/40 text-sky-400 bg-sky-500/10',
  },
  {
    mode: '3v3',
    label: '3x3 Trios',
    subtitle: 'Trios de alta intensidade tática',
    teamSize: 3,
    minPlayers: 6,
    icon: Layers,
    badgeColor: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  },
  {
    mode: '4v4',
    label: '4x4 Quartetos',
    subtitle: 'Quartetos de combate competitivo',
    teamSize: 4,
    minPlayers: 8,
    icon: Shield,
    badgeColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
  {
    mode: '5v5',
    label: '5x5 Equipes',
    subtitle: 'Formato tradicional competitivo Major',
    teamSize: 5,
    minPlayers: 10,
    icon: Trophy,
    badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
];

export function AdminNewTournamentPage() {
  const { isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [gameMode, setGameMode] = useState<GameMode>('5v5');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState(() => getDefaultTournamentRules('5v5'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    navigate('/login');
    return null;
  }

  const handleGameModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setRules(getDefaultTournamentRules(mode));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const teamSize = getTeamSize(gameMode);

    try {
      await api.createTournament({
        name,
        slug,
        description,
        gameMode,
        teamSize,
        bestOf: 1, // MD1
        thirdPlaceEnabled: false,
        mapSelection: 'admin',
        rules,
      });
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar campeonato');
    } finally {
      setLoading(false);
    }
  };

  const activeModeConfig = GAME_MODES.find(m => m.mode === gameMode)!;
  const recommendedMaps = getRecommendedMaps(gameMode);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-16">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Painel Admin
      </Link>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cs-border shadow-2xl">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-cs-orange/15 text-cs-orange flex items-center justify-center mb-3">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black font-display text-white">
            Criar Novo Campeonato CS2
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Selecione uma das 5 modalidades. O mecanismo compartilhado calculará regras, equipes, roleta e chaveamento eliminatório.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Game Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Modalidade do Campeonato *</span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">
                mínimo de {activeModeConfig.minPlayers} jogadores
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {GAME_MODES.map((item) => {
                const Icon = item.icon;
                const isSelected = gameMode === item.mode;

                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleGameModeSelect(item.mode)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cs-orange/15 border-cs-orange shadow-glow-orange text-white'
                        : 'bg-cs-surface border-cs-border text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-cs-orange' : 'text-slate-400'}`} />
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-cs-orange" />
                        )}
                      </div>
                      <div className="font-display font-black text-sm text-white">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {item.teamSize === 1 ? '1 duelista' : `${item.teamSize} por equipe`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
                {activeModeConfig.subtitle}
              </span>
              <p className="text-slate-400 mt-0.5">
                Inscrição individual com formação oficial por roleta e mata-mata eliminatório simples.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                Tamanho da Equipe: <strong className="text-white">{activeModeConfig.teamSize}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-cs-orange border border-slate-700">
                Mínimo: <strong>{activeModeConfig.minPlayers}</strong>
              </span>
            </div>
          </div>

          {/* 2. Tournament Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome do Torneio *
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Ex: CS2 Arena — Duelo de Titãs"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Slug da URL *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="cs2-arena-duelo"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-cs-orange"
              />
            </div>
          </div>

          {/* 3. Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Descrição do Torneio
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descreva o campeonato, prêmios ou detalhes para a comunidade."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
            />
          </div>

          {/* 4. Match Format Settings (Strict MD1 and Map Rules) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Formato da Série
              </label>
              <input
                type="text"
                value="MD1 (Melhor de 1 mapa)"
                disabled
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Seleção do Mapa
              </label>
              <input
                type="text"
                value="Arbitragem (Admin)"
                disabled
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Disputa de 3º Lugar
              </label>
              <input
                type="text"
                value="Desativada (Direto à Final)"
                disabled
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400"
              />
            </div>
          </div>

          {/* Map Pool Recommendation Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cs-orange" />
              Pool de Mapas Recomendados para {activeModeConfig.label}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {recommendedMaps.map((mapName) => (
                <span
                  key={mapName}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-300"
                >
                  {mapName}
                </span>
              ))}
            </div>
          </div>

          {/* 5. Rules & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Regulamento & Observações
            </label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cs-orange"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-lg tracking-wider shadow-glow-orange transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            {loading ? 'Salvando no Neon...' : `Criar Campeonato ${activeModeConfig.label}`}
          </button>
        </form>
      </div>
    </div>
  );
}
