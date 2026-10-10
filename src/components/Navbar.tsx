import React, { useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../lib/audio';
import { Trophy, Users, Shield, LogIn, LogOut, Volume2, VolumeX, Menu, X, PlusCircle } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-cs-card/90 backdrop-blur-md border-b border-cs-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cs-orange to-amber-500 flex items-center justify-center text-cs-dark font-black shadow-glow-orange group-hover:scale-105 transition-transform">
            <Trophy className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="font-display font-black text-2xl tracking-wider text-white flex items-center gap-1">
              CS <span className="text-cs-orange">ARENA</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold -mt-1">
              Counter-Strike 2
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <Link
            to="/"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              path === '/' ? 'text-cs-orange bg-cs-orange/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Campeonatos
          </Link>

          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  path.startsWith('/admin') && path !== '/admin/tournaments/new'
                    ? 'text-cs-orange bg-cs-orange/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Shield className="w-4 h-4 text-cs-orange" />
                Painel Admin
              </Link>
              <Link
                to="/admin/tournaments/new"
                className="px-3 py-2 rounded-md text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Torneio
              </Link>
            </>
          )}
        </nav>

        {/* Right Section: Sound toggle + User Info */}
        <div className="hidden md:flex items-center gap-3">
          {/* Mute/Unmute audio button */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition-colors"
            title={isMuted ? 'Desmutar efeitos' : 'Mutar efeitos'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cs-orange" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-cs-border">
              <div className="text-right">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{user.name}</div>
                <div className="text-[10px] uppercase font-bold text-cs-orange tracking-wider">
                  {user.role === 'admin' ? 'Administrador' : 'Jogador'}
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-cs-orange hover:bg-cs-orange-hover text-cs-dark flex items-center gap-1.5 transition-colors shadow-glow-orange"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-800 text-slate-400"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-cs-card border-b border-cs-border px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Campeonatos
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-cs-orange hover:bg-slate-800"
              >
                Painel Admin
              </Link>
              <Link
                to="/admin/tournaments/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-amber-400 hover:bg-slate-800"
              >
                + Novo Torneio
              </Link>
            </>
          )}
          {user ? (
            <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
              <div>
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-cs-orange uppercase">{user.role}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-sm text-red-400 flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-2 bg-cs-orange text-cs-dark font-bold rounded-lg mt-2"
            >
              Entrar
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
