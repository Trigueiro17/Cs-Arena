import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '../lib/audio';
import { Volume2, VolumeX, Maximize2, Minimize2, Play, FastForward, CheckCircle2, Trophy, User } from 'lucide-react';

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
  onComplete?: () => void;
  isLiveMode?: boolean;
}

export function RouletteWheel({ candidates, steps, onComplete, isLiveMode = false }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<DrawStep | null>(null);
  const [assignedTeams, setAssignedTeams] = useState<Record<string, DrawStep[]>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  // Current rotation angle in radians
  const angleRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Group steps by team for live presentation board
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] || null;

  // Active pool of players displayed on the wheel
  const activePool = candidates.length > 0
    ? candidates.slice(0, 16) // Top 16 visible slots for high readability
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

  // Draw the wheel on canvas
  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 20;

    ctx.clearRect(0, 0, width, height);

    // Save state
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Draw Slices
    const colors = ['#1e293b', '#0f172a', '#1e293b', '#182030'];
    const accentColors = ['#f97316', '#38bdf8', '#fbbf24', '#0284c7'];

    for (let i = 0; i < activePool.length; i++) {
      const start = i * sliceAngle;
      const end = (i + 1) * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Outer rim accent
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#232f46';
      ctx.stroke();

      // Slice border
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(start) * radius, Math.sin(start) * radius);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Slice Text (Nickname)
      ctx.save();
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#f1f5f9';
      ctx.font = 'bold 15px Rajdhani, sans-serif';
      ctx.fillText(activePool[i].nickname.slice(0, 14), radius - 30, 5);
      ctx.restore();
    }

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f97316';
    ctx.stroke();

    // Center Hub
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#0b0e14';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    ctx.restore();

    // Draw Static Top Pointer / Ticker
    ctx.save();
    ctx.translate(cx, cy - radius + 5);
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.lineWidth = 2;
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

    // Find target in active pool or temporary slot
    let targetIndex = activePool.findIndex(p => p.id === targetStep.playerId);
    if (targetIndex === -1) targetIndex = currentStepIndex % activePool.length;

    // Pointer is at -90 degrees (-Math.PI/2) at top center
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    const stopAngle = (3 * Math.PI / 2) - targetSliceCenter;

    // Minimum full rotations for exciting tension
    const fullRotations = (4 + Math.floor(Math.random() * 2)) * 2 * Math.PI;
    const finalAngle = angleRef.current + fullRotations + ((stopAngle - (angleRef.current % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI));

    const startTime = performance.now();
    const duration = 3800; // 3.8 seconds smooth deceleration
    const startAngle = angleRef.current;
    let lastTickAngle = startAngle;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startAngle + (finalAngle - startAngle) * easeOut;
      angleRef.current = current;

      drawWheel(current);

      // Tick sound every slice crossed
      if (Math.abs(current - lastTickAngle) >= sliceAngle) {
        sounds.playTick();
        lastTickAngle = current;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished!
        setIsSpinning(false);
        setSelectedWinner(targetStep);
        sounds.playWinnerChime();

        // Confetti celebration
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#38bdf8', '#fbbf24', '#22c55e'],
        });

        // Add to assigned teams
        setAssignedTeams(prev => {
          const updated = { ...prev };
          if (!updated[targetStep.teamName]) {
            updated[targetStep.teamName] = [];
          }
          updated[targetStep.teamName].push(targetStep);
          return updated;
        });

        // Move to next step index
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

  // Fast forward all remaining steps instantly
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
    confetti({ particleCount: 120, spread: 100 });

    if (onComplete) {
      setTimeout(onComplete, 600);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`glass-panel rounded-2xl p-6 relative transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-cs-dark p-10 overflow-y-auto' : ''
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-cs-border pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-cs-orange" />
            Roleta Oficial de Formação dos Times
          </h2>
          <p className="text-xs text-slate-400">
            Sorteio 100% criptográfico e auditado no backend Neon. Reprodução visual do resultado já registrado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Som"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cs-orange" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Tela cheia (OBS / Live)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5 text-cs-cyan" />}
          </button>
        </div>
      </div>

      {/* Main Wheel + Result Spotlight Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Interactive Canvas Wheel */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={420}
              height={420}
              className="max-w-full drop-shadow-2xl"
            />
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {currentStepIndex < totalSteps ? (
              <>
                <button
                  onClick={spinNext}
                  disabled={isSpinning}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cs-orange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-cs-dark font-black font-display text-lg tracking-wider flex items-center gap-2 shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {isSpinning ? 'Girando Roleta...' : `Girar Próximo (${currentStepIndex + 1}/${totalSteps})`}
                </button>
                <button
                  onClick={finishAllInstantly}
                  disabled={isSpinning}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <FastForward className="w-4 h-4 text-amber-400" />
                  Pular Animação
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
                Sorteio de Equipes Concluído com Sucesso!
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Sorteado Highlight + Teams Formation Board */}
        <div className="lg:col-span-6 space-y-4">
          {/* Active Highlight Banner */}
          {selectedWinner ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-950/40 to-slate-900 border border-cs-orange/50 shadow-glow-orange animate-pulse-slow">
              <div className="text-xs uppercase font-bold text-cs-orange tracking-widest mb-1">
                Jogador Sorteado
              </div>
              <div className="flex items-center gap-4">
                <img
                  src={selectedWinner.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedWinner.playerNickname}`}
                  alt=""
                  className="w-14 h-14 rounded-xl bg-slate-800 border border-cs-orange p-1"
                />
                <div>
                  <div className="text-2xl font-black font-display text-white">
                    {selectedWinner.playerNickname}
                  </div>
                  <div className="text-sm text-slate-300">
                    Alocado na equipe: <span className="font-bold text-amber-400">{selectedWinner.teamName}</span>
                    {selectedWinner.isCaptain && (
                      <span className="ml-2 text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                        CAPITÃO
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-sm flex items-center gap-3">
              <User className="w-8 h-8 text-slate-600" />
              <div>
                Pressione <span className="text-cs-orange font-bold">Girar</span> para revelar o próximo jogador da ordem oficial criptográfica.
              </div>
            </div>
          )}

          {/* Teams Grid (Filling up in real time) */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Equipes Formadas ({Object.keys(assignedTeams).length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(assignedTeams).map(([teamName, members]) => (
                <div
                  key={teamName}
                  className="p-3 rounded-lg bg-cs-card border border-cs-border hover:border-cs-orange/40 transition-colors"
                >
                  <div className="font-display font-bold text-white text-base flex justify-between items-center mb-2">
                    <span>{teamName}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {members.length}/5
                    </span>
                  </div>
                  <div className="space-y-1">
                    {members.map(m => (
                      <div key={m.playerId} className="text-xs text-slate-300 flex items-center justify-between">
                        <span className="truncate">{m.playerNickname}</span>
                        {m.isCaptain && <span className="text-[10px] text-amber-400 font-bold">CAP</span>}
                      </div>
                    ))}
                    {Array.from({ length: 5 - members.length }).map((_, i) => (
                      <div key={i} className="text-[11px] text-slate-600 italic">
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
