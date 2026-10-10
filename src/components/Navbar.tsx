import React, { useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../lib/audio';
import { Trophy, Shield, LogIn, LogOut, Volume2, VolumeX, Menu, X, PlusCircle, Sparkles, Database } from 'lucide-react';

export function Navbar() {
  const { path } = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMute = () => {
    const nextState = !isMuted;
    sounds.setMuted(nextState);
    setIsMuted(nextState);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090d15]/85 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cs-orange via-amber-500 to-yellow-500 flex items-center justify-center text-cs-dark font-black shadow-glow-orange group-hover:scale-105 transition-transform duration-300">
            <Trophy className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="font-display font-black text-2xl sm:text-3xl tracking-wider text-white flex items-center gap-1 leading-none">
              CS <span className="text-gradient-orange">ARENA</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Counter-Strike 2 Major
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              path === '/'
                ? 'text-cs-orange bg-cs-orange/15 border border-cs-orange/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Campeonatos
          </Link>

          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  path.startsWith('/admin') && path !== '/admin/tournaments/new'
                    ? 'text-cs-orange bg-cs-orange/15 border border-cs-orange/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cs-orange" />
                Painel Admin
              </Link>
              <Link
                to="/admin/tournaments/new"
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Novo Torneio
              </Link>
            </>
          )}
        </nav>

        {/* Right Section: Sound toggle + User Info */}
        <div className="hidden md:flex items-center gap-3">
          {/* Mute/Unmute audio button with neon indicator */}
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-xl border transition-all ${
              isMuted
                ? 'bg-red-950/30 border-red-500/30 text-red-400'
                : 'bg-slate-900 border-white/10 text-cs-orange hover:border-cs-orange/50 hover:bg-cs-orange/10 glow-orange'
            }`}
            title={isMuted ? 'Desmutar efeitos' : 'Mutar efeitos'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-9 h-9 rounded-xl border border-sky-400/40 object-cover shadow-md bg-slate-900"
                />
              )}
              <div className="text-right">
                <div className="text-xs font-black text-white truncate max-w-[140px] font-display tracking-wide flex items-center justify-end gap-1.5">
                  <span>{user.nickname || user.name}</span>
                  {user.steamLevel ? (
                    <span
                      title={`Nível Steam: ${user.steamLevel} | CS2: ${user.cs2Hours || 0}h | Elo: ${user.skillRating || 1000}`}
                      className="px-1.5 py-0.2 rounded bg-sky-950 border border-sky-400/50 text-[9px] font-mono font-extrabold text-sky-300 shadow-sm"
                    >
                      Nv.{user.steamLevel}
                    </span>
                  ) : null}
                </div>
                <div className="text-[10px] font-bold tracking-wider flex items-center justify-end gap-1.5 mt-0.5">
                  {user.skillRating ? (
                    <span className="text-cs-orange font-mono font-black flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-cs-orange" />
                      {user.skillRating} pts
                    </span>
                  ) : null}
                  {user.cs2Hours ? (
                    <span className="text-slate-400 font-mono text-[9px]">
                      {user.cs2Hours}h
                    </span>
                  ) : null}
                  <span className="text-slate-500">•</span>
                  {user.role === 'ADMIN' ? (
                    <span className="text-amber-400 uppercase font-extrabold text-[9px]">ADMIN</span>
                  ) : user.role === 'ORGANIZER' ? (
                    <span className="text-purple-400 uppercase font-extrabold text-[9px]">ORGANIZADOR</span>
                  ) : (
                    <span className="text-sky-400 uppercase font-extrabold text-[9px]">JOGADOR</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/30 transition-all"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="btn-shimmer px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cs-orange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-cs-dark flex items-center gap-2 glow-orange transition-all"
            >
              <LogIn className="w-4 h-4 text-cs-dark stroke-[2.5]" />
              Entrar / Cadastro
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cs-orange" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-white/10"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0c1017] border-b border-white/10 px-4 pt-3 pb-5 space-y-2.5">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-bold text-slate-200 hover:bg-white/5"
          >
            Campeonatos
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-bold text-cs-orange hover:bg-white/5"
              >
                Painel Admin
              </Link>
              <Link
                to="/admin/tournaments/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-bold text-amber-400 hover:bg-white/5"
              >
                + Novo Torneio
              </Link>
            </>
          )}
          {user ? (
            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-9 h-9 rounded-xl border border-sky-400/40 object-cover bg-slate-900"
                  />
                )}
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{user.nickname || user.name}</span>
                    {user.steamLevel ? (
                      <span className="px-1.5 py-0.2 rounded bg-sky-950 border border-sky-400/50 text-[9px] font-mono font-bold text-sky-300">
                        Nv.{user.steamLevel}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-2">
                    <span>{user.role}</span>
                    {user.skillRating ? (
                      <span className="text-cs-orange font-mono font-bold">
                        • {user.skillRating} pts
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-red-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-2.5 bg-cs-orange text-cs-dark font-black font-display text-base uppercase rounded-xl mt-2"
            >
              Entrar ou Criar Conta
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
