import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '../lib/audio';
import { Volume2, VolumeX, Maximize2, Minimize2, Play, FastForward, CheckCircle2, Trophy, User, Shield, Sparkles } from 'lucide-react';

export interface DrawStep {
  order: number;
  playerId: string;
  playerNickname: string;
  avatarUrl?: string | null;
  teamName: string;
  teamSeed: number;
  isCaptain: boolean;
}

interface RouletteWheelProps {
  candidates: { id: string; nickname: string; avatarUrl?: string | null; preferredRole?: string }[];
  steps: DrawStep[];
  targetTeamSize?: number;
  onComplete?: () => void;
  isLiveMode?: boolean;
}

export function RouletteWheel({ candidates, steps, targetTeamSize = 5, onComplete, isLiveMode = false }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<DrawStep | null>(null);
  const [assignedTeams, setAssignedTeams] = useState<Record<string, DrawStep[]>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  const angleRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] || null;

  const activePool = candidates.length > 0
    ? candidates.slice(0, 16)
    : [{ id: '1', nickname: 'Aguardando' }];

  const sliceAngle = (2 * Math.PI) / activePool.length;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    sounds.setMuted(next);
    setIsMuted(next);
  };

  // Draw the high-end esports wheel on canvas
  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 26;

    ctx.clearRect(0, 0, width, height);

    // Save state
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Slices
    const colors = ['#151c28', '#0c1018', '#1a2232', '#0f141f'];

    for (let i = 0; i < activePool.length; i++) {
      const start = i * sliceAngle;
      const end = (i + 1) * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Outer rim accent
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#232f46';
      ctx.stroke();

      // Slice border
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(start) * radius, Math.sin(start) * radius);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Slice Text (Nickname)
      ctx.save();
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = i % 2 === 0 ? '#ff8a3d' : '#f8fafc';
      ctx.font = 'bold 15px Rajdhani, sans-serif';
      ctx.fillText(activePool[i].nickname.slice(0, 13), radius - 32, 5);
      ctx.restore();
    }

    // Outer Neon Ring with Golden Border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f97316';
    ctx.stroke();

    // Outer decorative LED pegs
    for (let i = 0; i < activePool.length * 2; i++) {
      const pegAngle = (i * Math.PI) / activePool.length;
      const px = Math.cos(pegAngle) * (radius + 10);
      const py = Math.sin(pegAngle) * (radius + 10);

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#38bdf8';
      ctx.fill();
    }

    // Center Metallic Hub
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, 2 * Math.PI);
    ctx.fillStyle = '#07090e';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Inner CS Gold Medallion Ring
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#1c1917';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f97316';
    ctx.stroke();

    ctx.restore();

    // Top Pointer / Ticker with Spotlight Beam Effect
    ctx.save();
    ctx.translate(cx, cy - radius + 6);

    // Glowing pointer
    ctx.beginPath();
    ctx.moveTo(-18, -22);
    ctx.lineTo(18, -22);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [activePool]);

  // Execute single spin animation to land on predetermined server outcome
  const spinNext = () => {
    if (isSpinning || currentStepIndex >= totalSteps) return;

    setIsSpinning(true);
    setSelectedWinner(null);

    const targetStep = steps[currentStepIndex];

    let targetIndex = activePool.findIndex(p => p.id === targetStep.playerId);
    if (targetIndex === -1) targetIndex = currentStepIndex % activePool.length;

    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    const stopAngle = (3 * Math.PI / 2) - targetSliceCenter;

    const fullRotations = (4 + Math.floor(Math.random() * 2)) * 2 * Math.PI;
    const finalAngle = angleRef.current + fullRotations + ((stopAngle - (angleRef.current % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI));

    const startTime = performance.now();
    const duration = 3800; // 3.8s smooth cubic deceleration
    const startAngle = angleRef.current;
    let lastTickAngle = startAngle;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startAngle + (finalAngle - startAngle) * easeOut;
      angleRef.current = current;

      drawWheel(current);

      if (Math.abs(current - lastTickAngle) >= sliceAngle) {
        sounds.playTick();
        lastTickAngle = current;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setSelectedWinner(targetStep);
        sounds.playWinnerChime();

        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f97316', '#38bdf8', '#fbbf24', '#22c55e'],
        });

        setAssignedTeams(prev => {
          const updated = { ...prev };
          if (!updated[targetStep.teamName]) {
            updated[targetStep.teamName] = [];
          }
          updated[targetStep.teamName].push(targetStep);
          return updated;
        });

        setCurrentStepIndex(prev => {
          const next = prev + 1;
          if (next >= totalSteps && onComplete) {
            setTimeout(onComplete, 1200);
          }
          return next;
        });
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const finishAllInstantly = () => {
    if (isSpinning) return;

    const remaining = steps.slice(currentStepIndex);
    const newAssigned = { ...assignedTeams };

    for (const step of remaining) {
      if (!newAssigned[step.teamName]) {
        newAssigned[step.teamName] = [];
      }
      newAssigned[step.teamName].push(step);
    }

    setAssignedTeams(newAssigned);
    setCurrentStepIndex(totalSteps);
    if (steps.length > 0) {
      setSelectedWinner(steps[steps.length - 1]);
    }
    sounds.playWinnerChime();
    confetti({ particleCount: 140, spread: 120 });

    if (onComplete) {
      setTimeout(onComplete, 600);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`glass-panel rounded-3xl p-6 sm:p-8 relative border border-white/10 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#07090e] p-10 overflow-y-auto' : ''
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-8">
        <div>
          <div className="text-xs uppercase font-extrabold text-cs-orange tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
            Palco Oficial de Sorteio de Esports
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white mt-1 flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-cs-orange" />
            Roleta de Formação de Equipes 5x5
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ordem criptográfica processada atomicamente no Neon PostgreSQL antes da animação visual.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-xl border transition-all ${
              isMuted
                ? 'bg-red-950/40 border-red-500/30 text-red-400'
                : 'bg-slate-900 border-white/10 text-cs-orange hover:border-cs-orange/50 hover:bg-cs-orange/10 glow-orange'
            }`}
            title="Efeitos Sonoros"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-sky-400 hover:text-white hover:bg-sky-500/20 transition-all glow-blue"
            title="Modo Tela Cheia (OBS / Live Feed)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Wheel + Result Spotlight Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Interactive Canvas Wheel with Dramatic Glow */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative p-3 rounded-full bg-gradient-to-b from-orange-500/20 via-transparent to-sky-500/10 border border-white/10 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={430}
              height={430}
              className="max-w-full drop-shadow-[0_0_35px_rgba(249,115,22,0.35)]"
            />
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-wrap gap-3.5 justify-center">
            {currentStepIndex < totalSteps ? (
              <>
                <button
                  onClick={spinNext}
                  disabled={isSpinning}
                  className="btn-shimmer px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cs-orange via-amber-500 to-yellow-500 hover:from-orange-600 hover:to-amber-600 text-cs-dark font-black font-display text-xl tracking-wider flex items-center gap-2.5 glow-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-xl"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {isSpinning ? 'Girando Roleta...' : `Girar Próximo (${currentStepIndex + 1}/${totalSteps})`}
                </button>
                <button
                  onClick={finishAllInstantly}
                  disabled={isSpinning}
                  className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-white/10 transition-colors"
                >
                  <FastForward className="w-4 h-4 text-amber-400" />
                  Revelar Todos
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2.5 px-8 py-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-black font-display text-lg tracking-wide rounded-2xl shadow-glow-orange">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                {targetTeamSize === 1 ? 'Sorteio de Todos os Duelistas Concluído!' : 'Sorteio de Todas as Equipes Concluído!'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Sorteado Highlight + Teams Formation Board */}
        <div className="lg:col-span-6 space-y-4">
          {/* Active Highlight Banner */}
          {selectedWinner ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-950/50 via-slate-900 to-amber-950/40 border border-cs-orange/60 glow-orange animate-pulse-slow">
              <div className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-1.5 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-cs-orange" />
                JOGADOR SORTEADO AGORA
              </div>
              <div className="flex items-center gap-4">
                <img
                  src={selectedWinner.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedWinner.playerNickname}`}
                  alt=""
                  className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-cs-orange p-1 shadow-lg"
                />
                <div>
                  <div className="text-3xl font-black font-display text-white tracking-wide">
                    {selectedWinner.playerNickname}
                  </div>
                  <div className="text-sm text-slate-300 mt-0.5">
                    {targetTeamSize === 1 ? (
                      <>Posição na chave: <span className="font-black text-amber-300 font-display text-base">Seed #{selectedWinner.teamSeed}</span></>
                    ) : (
                      <>Alocado em: <span className="font-black text-amber-300 font-display text-base">{selectedWinner.teamName}</span></>
                    )}
                    {selectedWinner.isCaptain && targetTeamSize > 1 && (
                      <span className="ml-2 text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-black tracking-wider uppercase">
                        CAPITÃO
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 text-slate-400 text-xs flex items-center gap-3">
              <User className="w-8 h-8 text-slate-600 shrink-0" />
              <div>
                Pressione <strong className="text-cs-orange">Girar Próximo</strong> para revelar o jogador sorteado pelo algoritmo criptográfico.
              </div>
            </div>
          )}

          {/* Teams / Duelists Grid (Filling up in real time) */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-cs-orange" />
              {targetTeamSize === 1 ? 'Duelistas Sorteados' : 'Equipes Formadas'} ({Object.keys(assignedTeams).length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(assignedTeams).map(([teamName, members]) => (
                <div
                  key={teamName}
                  className="p-3.5 rounded-2xl bg-[#0c1018] border border-white/10 hover:border-cs-orange/50 transition-all shadow-md"
                >
                  <div className="font-display font-black text-white text-base flex justify-between items-center mb-2.5 pb-2 border-b border-white/5">
                    <span className="truncate">{teamName}</span>
                    <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                      {members.length}/{targetTeamSize}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {members.map(m => (
                      <div key={m.playerId} className="text-xs text-slate-300 flex items-center justify-between bg-slate-900/50 px-2 py-1 rounded-lg">
                        <span className="truncate font-semibold">{m.playerNickname}</span>
                        {m.isCaptain && targetTeamSize > 1 && <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-black">CAP</span>}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, targetTeamSize - members.length) }).map((_, i) => (
                      <div key={i} className="text-[11px] text-slate-600 italic px-2 py-0.5 border border-dashed border-slate-800 rounded">
                        - Vaga aberta -
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
