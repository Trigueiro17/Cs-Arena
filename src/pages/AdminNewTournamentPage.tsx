import React, { useState } from 'react';
import { api } from '../lib/api';
import { useRouter, Link } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { Trophy, PlusCircle, ArrowLeft, Shield } from 'lucide-react';

export function AdminNewTournamentPage() {
  const { isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bestOf, setBestOf] = useState<number>(1);
  const [rules, setRules] = useState('Formato oficial: 5x5 mata-mata com eliminação simples. Empates não permitidos em mapas competitivos de CS2.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    navigate('/login');
    return null;
  }

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

    try {
      await api.createTournament({
        name,
        slug,
        description,
        bestOf,
        rules,
      });
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar campeonato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-16">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Painel Admin
      </Link>

      <div className="glass-panel rounded-3xl p-8 border border-cs-border shadow-2xl">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-cs-orange/15 text-cs-orange flex items-center justify-center mb-3">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black font-display text-white">
            Criar Novo Campeonato CS2
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure as regras e formato. O torneio será salvo diretamente no Neon PostgreSQL.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Nome do Torneio *
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Ex: CS2 Major Arena — Temporada de Verão"
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
              placeholder="cs2-major-arena"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-cs-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Campeonato individual com sorteio de equipes na roleta."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Formato da Série (Melhor de)
              </label>
              <select
                value={bestOf}
                onChange={(e) => setBestOf(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
              >
                <option value={1}>MD1 (Melhor de 1 mapa)</option>
                <option value={3}>MD3 (Melhor de 3 mapas)</option>
                <option value={5}>MD5 (Melhor de 5 mapas — Grande Final)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Tamanho da Equipe
              </label>
              <input
                type="text"
                value="5 Jogadores (Fixo)"
                disabled
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500"
              />
            </div>
          </div>

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
            className="w-full py-3.5 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-lg tracking-wider shadow-glow-orange transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Salvando no Neon...' : 'Criar e Publicar Campeonato'}
          </button>
        </form>
      </div>
    </div>
  );
}
