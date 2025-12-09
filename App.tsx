import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Utensils, Award, ChevronRight, Settings, Droplets, Plus, Minus, Bell, Moon, Smartphone, Flame, Carrot, Pizza, Apple, CheckCircle2, Lock, Sparkles, LogOut, User as UserIcon, Loader2, Mail, Lock as LockIcon, Eye, EyeOff, ArrowRight, ScanLine, Activity, Zap, Ruler, Weight, Target, Footprints, Trophy, X, Crown, TrendingUp, AlertCircle, FileText, Wifi, QrCode } from 'lucide-react';
import { Button } from './components/Button';
import { Navigation } from './components/Navigation';
import { Card } from './components/Card';
import { WeekCalendar } from './components/WeekCalendar';
import { analyzeFoodImage, AIAnalysisResult } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { 
  UserProfile, 
  ViewState, 
  Gender, 
  Goal, 
  ActivityLevel, 
  DayLog, 
  FoodLogItem 
} from './types';

// --- Achievement Definitions ---
interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  condition: (log: DayLog, profile: UserProfile) => boolean;
}

const ALL_ACHIEVEMENTS: AchievementDef[] = [
  { 
    id: 'early-bird', 
    title: 'Early Bird', 
    desc: 'Log breakfast before 9 AM', 
    icon: '🌅',
    condition: (log) => log.items.some(i => i.mealType === 'Breakfast' && new Date(i.timestamp).getHours() < 9)
  },
  { 
    id: 'hydration-hero', 
    title: 'Hydration Hero', 
    desc: 'Drink 2500ml of water', 
    icon: '💧',
    condition: (log) => log.waterIntake >= 2500
  },
  { 
    id: 'protein-power', 
    title: 'Protein Power', 
    desc: 'Hit your daily protein goal', 
    icon: '💪',
    condition: (log, profile) => {
       const totalProtein = log.items.reduce((acc, i) => acc + i.protein, 0);
       return totalProtein >= profile.targetProtein;
    }
  },
  { 
    id: 'green-giant', 
    title: 'Green Giant', 
    desc: 'Log a food with >5g fiber', 
    icon: '🥦',
    condition: (log) => log.items.some(i => (i.fiber || 0) > 5)
  },
  { 
    id: 'night-owl', 
    title: 'Night Owl', 
    desc: 'Log a snack after 8 PM', 
    icon: '🦉',
    condition: (log) => log.items.some(i => i.mealType === 'Snack' && new Date(i.timestamp).getHours() >= 20)
  },
  {
    id: 'first-step',
    title: 'First Step',
    desc: 'Log your very first meal', 
    icon: '🚀',
    condition: (log) => log.items.length >= 1
  }
];

// --- Default/Initial State ---

const INITIAL_PROFILE: UserProfile = {
  name: '',
  age: 25,
  gender: Gender.Male,
  height: 175,
  weight: 70,
  goal: Goal.LoseWeight,
  activityLevel: ActivityLevel.Moderate,
  targetCalories: 2000,
  targetProtein: 150,
  targetCarbs: 200,
  targetFat: 65,
  targetFiber: 30,
  targetSugar: 50,
  maxSodium: 2300,
  maxCholesterol: 300,
  hasOnboarded: false,
  isPremium: false,
  preferences: {
    darkMode: false,
    notifications: true,
    weeklyReports: false,
    healthSync: false,
    unlockedAwards: []
  }
};

const INITIAL_LOG: DayLog = {
  date: new Date().toISOString().split('T')[0],
  items: [],
  waterIntake: 0
};

// --- Helper Functions ---

const calculateMacros = (profile: UserProfile): UserProfile => {
  let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  bmr += profile.gender === Gender.Male ? 5 : -161;

  const activityMultipliers = {
    [ActivityLevel.Sedentary]: 1.2,
    [ActivityLevel.Light]: 1.375,
    [ActivityLevel.Moderate]: 1.55,
    [ActivityLevel.Active]: 1.725
  };

  let tdee = bmr * activityMultipliers[profile.activityLevel];

  if (profile.goal === Goal.LoseWeight) tdee -= 500;
  if (profile.goal === Goal.GainMuscle) tdee += 300;

  const calories = Math.round(tdee);
  const protein = Math.round((calories * 0.3) / 4);
  const carbs = Math.round((calories * 0.4) / 4);
  const fat = Math.round((calories * 0.3) / 9);

  return {
    ...profile,
    targetCalories: calories,
    targetProtein: protein,
    targetCarbs: carbs,
    targetFat: fat
  };
};

// --- Animation Components ---

// 1. LIQUID BACKGROUND (Updated to Fire Cracks Effect)
const LiquidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Configuration
    const colors = ['#FFFFFF', '#007AFF', '#34C759']; // White, Blue, Green
    const cracks: Crack[] = [];
    const maxCracks = 8; // Number of active cracks
    
    class Crack {
      x: number;
      y: number;
      dir: number; // angle
      speed: number;
      color: string;
      life: number;
      width: number;
      history: {x: number, y: number}[];
      jitter: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.dir = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 1.5 + 0.5; // "Low smooth" slow speed
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = Math.random() * 150 + 100; // Life span
        this.width = Math.random() * 2 + 1;
        this.history = [];
        this.jitter = 0;
      }

      update() {
        this.life--;
        
        // "Fire crack" movement logic:
        // Mostly smooth, but occasionally jerky (crack-like)
        if (Math.random() < 0.08) {
           this.jitter = (Math.random() - 0.5) * 1.5; // Sudden turn
        } else {
           this.jitter *= 0.9; // Smooth out
        }
        this.dir += this.jitter + (Math.random() - 0.5) * 0.05;

        this.x += Math.cos(this.dir) * this.speed;
        this.y += Math.sin(this.dir) * this.speed;

        this.history.push({x: this.x, y: this.y});
        // Keep trail length moderate
        if (this.history.length > 30) this.history.shift();

        // Wrap around screen
        if (this.x < -50) this.x = width + 50;
        if (this.x > width + 50) this.x = -50;
        if (this.y < -50) this.y = height + 50;
        if (this.y > height + 50) this.y = -50;
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (this.history.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        
        // Draw jagged line through history points
        for (let i = 1; i < this.history.length; i++) {
           // Add slight noise to drawing to simulate electricity/fire texture
           const p = this.history[i];
           const noiseX = (Math.random() - 0.5) * 2;
           const noiseY = (Math.random() - 0.5) * 2;
           ctx.lineTo(p.x + noiseX, p.y + noiseY);
        }

        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Glow Effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Fade out tail based on life or index
        ctx.globalAlpha = Math.min(1, this.life / 50); 
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    }

    // Initialize cracks
    for (let i = 0; i < maxCracks; i++) {
      cracks.push(new Crack());
    }

    let animationId: number;

    const animate = () => {
      // Trail fade effect: Draw semi-transparent black rect
      // "Low smooth" means nice trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
      ctx.fillRect(0, 0, width, height);

      // Composite operation for glowing effect
      ctx.globalCompositeOperation = 'screen';

      // Respawn logic
      if (cracks.length < maxCracks && Math.random() < 0.02) {
         cracks.push(new Crack());
      }

      for (let i = cracks.length - 1; i >= 0; i--) {
         cracks[i].update();
         cracks[i].draw(ctx);
         if (cracks[i].life <= 0) {
            cracks.splice(i, 1);
         }
      }
      
      ctx.globalCompositeOperation = 'source-over';
      animationId = requestAnimationFrame(animate);
    };
    
    animate();

    const handleResize = () => {
       width = canvas.width = window.innerWidth;
       height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden z-0">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_90%)] pointer-events-none"></div>
    </div>
  );
};

// 2. ROTATING LOGO (3D Glass Scanner Effect)
const RotatingLogo: React.FC = () => {
   const [index, setIndex] = useState(0);
   const icons = [ScanLine, Carrot, Pizza, Apple];
   const CurrentIcon = icons[index];

   useEffect(() => {
      const interval = setInterval(() => {
         setIndex(prev => (prev + 1) % icons.length);
      }, 3000);
      return () => clearInterval(interval);
   }, []);

   return (
      <div className="relative w-32 h-32 mx-auto mb-10 perspective-1000 group">
         <div className="relative w-full h-full transform-style-3d transition-transform duration-500 group-hover:rotate-x-12 group-hover:rotate-y-12">
            {/* Glass Container Main Block */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-[28px] border border-white/10 backdrop-blur-md shadow-[0_0_40px_rgba(0,122,255,0.15)] overflow-hidden">
                
                {/* Inner Icon Container */}
                <div className="w-full h-full flex items-center justify-center">
                    <div className="relative z-20">
                         {/* Icon with Glitch/Transition effect */}
                         <CurrentIcon 
                            size={48} 
                            className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-300" 
                            strokeWidth={1.5}
                         />
                    </div>
                </div>

                {/* --- 3D Scanner Beam --- */}
                {/* The glowing line */}
                <div className="absolute inset-x-0 h-[2px] bg-blue-400 shadow-[0_0_20px_#007AFF] animate-scan-vertical z-30 opacity-80"></div>
                {/* The trailing gradient light */}
                <div className="absolute inset-x-0 h-24 bg-gradient-to-t from-blue-500/20 to-transparent animate-scan-vertical z-20 origin-bottom -translate-y-full" style={{ animationDelay: '0s' }}></div>
            </div>

            {/* Decorative 3D Elements (Depth Layers) */}
            <div className="absolute inset-0 border border-blue-500/20 rounded-[28px] translate-z-4 scale-105 pointer-events-none opacity-50"></div>
            <div className="absolute inset-0 border border-blue-500/10 rounded-[28px] -translate-z-4 scale-95 pointer-events-none opacity-30"></div>
            
            {/* Ambient Glow */}
            <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full -z-10 opacity-40 animate-pulse"></div>
         </div>
      </div>
   );
};

// 3. MAGNETIC BUTTON (Micro-interaction)
const MagneticButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost'; fullWidth?: boolean }> = ({ children, variant = 'primary', fullWidth = false, className = '', ...props }) => {
   const btnRef = useRef<HTMLButtonElement>(null);
   const [pos, setPos] = useState({ x: 0, y: 0 });

   const handleMouseMove = (e: React.MouseEvent) => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setPos({ x: x * 0.2, y: y * 0.2 }); // Magnetic strength
   };

   const handleMouseLeave = () => {
      setPos({ x: 0, y: 0 });
   };

   const baseStyles = "relative overflow-hidden transition-all duration-200 ease-out active:scale-95";
   const variants = {
      primary: "bg-[#007AFF] text-white shadow-[0_10px_30px_rgba(0,122,255,0.4)] hover:shadow-[0_10px_40px_rgba(0,122,255,0.6)]",
      ghost: "bg-transparent text-gray-400 hover:text-white"
   };
   
   const widthClass = fullWidth ? "w-full" : "";

   return (
      <button 
         ref={btnRef}
         className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
         onMouseMove={handleMouseMove}
         onMouseLeave={handleMouseLeave}
         style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
         {...props}
      >
         {children}
      </button>
   );
};

const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
   const cardRef = useRef<HTMLDivElement>(null);
   const [transform, setTransform] = useState('');

   const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const { left, top, width, height } = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - left - width / 2) / 25;
      const y = (e.clientY - top - height / 2) / 25;
      setTransform(`perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg) scale(1.01)`);
   };

   const handleMouseLeave = () => {
      setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');
   };

   return (
      <div 
         ref={cardRef}
         className={`transition-transform duration-200 ease-out ${className}`}
         style={{ transform }}
         onMouseMove={handleMouseMove}
         onMouseLeave={handleMouseLeave}
      >
         {children}
      </div>
   );
};

const GoldenParticleBurst: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#FFD700', '#FFA500', '#FFFFFF', '#FDB931'];

    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 15 + 5;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        friction: 0.95,
        gravity: 0.2,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.005
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = 0;

      particles.forEach(p => {
        if (p.alpha > 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= p.friction;
          p.vy += p.gravity;
          p.alpha -= p.decay;

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          if (Math.random() > 0.9) {
             ctx.fillStyle = '#FFFFFF';
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
             ctx.fill();
          }
          
          ctx.restore();
          activeParticles++;
        }
      });

      if (activeParticles > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[100]" />;
};

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#007AFF', '#FF2D55', '#FF9500', '#34C759', '#5856D6'];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        friction: 0.96,
        gravity: 0.4
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.friction;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 20) {
           activeParticles++;
           ctx.save();
           ctx.translate(p.x, p.y);
           ctx.rotate((p.rotation * Math.PI) / 180);
           ctx.fillStyle = p.color;
           ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
           ctx.restore();
        }
      });

      if (activeParticles > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[100]" />;
};

const AchievementUnlockModal: React.FC<{ 
  achievement: AchievementDef | null; 
  onClose: () => void; 
}> = ({ achievement, onClose }) => {
  if (!achievement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={onClose}>
       <GoldenParticleBurst />
       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"></div>
       
       <div 
         className="relative bg-gradient-to-br from-gray-900 to-black rounded-[32px] p-8 w-full max-w-sm text-center border border-yellow-500/30 shadow-[0_0_50px_rgba(255,215,0,0.3)] animate-in zoom-in slide-in-from-bottom-10 duration-500 transform perspective-1000"
         onClick={(e) => e.stopPropagation()}
       >
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
             <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(255,215,0,0.6)] animate-bounce-slow border-4 border-black">
                {achievement.icon}
             </div>
          </div>
          
          <div className="mt-10 space-y-2">
             <div className="text-yellow-400 font-bold uppercase tracking-widest text-xs animate-pulse">Achievement Unlocked</div>
             <h2 className="text-3xl font-bold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200">{achievement.title}</h2>
             <p className="text-gray-400 text-sm leading-relaxed">{achievement.desc}</p>
          </div>

          <div className="mt-8">
             <Button 
                onClick={onClose} 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold border-none shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform"
                fullWidth
             >
                Awesome!
             </Button>
          </div>
       </div>
    </div>
  );
};

// --- Sub-components ---

const ConcentricActivityRings: React.FC<{
  data: { label: string; current: number; target: number; color: string; }[]
}> = ({ data }) => {
  const [animate, setAnimate] = useState(false);
  
  useEffect(() => {
     const timer = setTimeout(() => setAnimate(true), 150);
     return () => clearTimeout(timer);
  }, []);

  const size = 260;
  const center = size / 2;
  const strokeWidth = 14;
  const gap = 6;

  return (
     <div className="relative flex items-center justify-center w-[260px] h-[260px] mx-auto scale-90 sm:scale-100">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 overflow-visible">
           {data.map((ring, i) => {
              const radius = 100 - (i * (strokeWidth + gap));
              const circumference = 2 * Math.PI * radius;
              const target = ring.target || 1; 
              const percent = Math.min(1, Math.max(0, ring.current / target));
              const offset = animate ? circumference - (percent * circumference) : circumference;
              
              return (
                 <g key={i}>
                    <circle 
                       cx={center} 
                       cy={center} 
                       r={radius} 
                       fill="none" 
                       stroke={ring.color} 
                       strokeWidth={strokeWidth} 
                       strokeOpacity={0.15}
                    />
                    <circle 
                       cx={center} 
                       cy={center} 
                       r={radius} 
                       fill="none" 
                       stroke={ring.color} 
                       strokeWidth={strokeWidth} 
                       strokeDasharray={circumference}
                       strokeDashoffset={offset}
                       strokeLinecap="round"
                       className="transition-all duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                       style={{ 
                          filter: `drop-shadow(0 0 4px ${ring.color})` 
                       }}
                    />
                 </g>
              );
           })}
        </svg>
         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <div className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter drop-shadow-lg transition-colors duration-500">
                {Math.round(data[0].current)}
             </div>
             <div className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">kcal</div>
         </div>
     </div>
  );
};

const ModernNutrientBar: React.FC<{
   label: string;
   current: number;
   max: number;
   unit: string;
   color: string;
   type?: 'target' | 'limit';
}> = ({ label, current, max, unit, color, type = 'target' }) => {
   const percentage = Math.min(100, (current / max) * 100);
   const isOver = type === 'limit' && current > max;
   const displayColor = isOver ? '#FF453A' : color;
   
   return (
     <div className="bg-white dark:bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm">
        <div className="flex justify-between items-end mb-2">
           <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-200">{label}</span>
           <div className="text-xs">
              <span className="font-bold text-gray-900 dark:text-white">{Math.round(current)}</span>
              <span className="text-gray-400 dark:text-gray-500"> / {max}{unit}</span>
           </div>
        </div>
        
        <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
           <div 
             className="h-full rounded-full transition-all duration-1000 relative"
             style={{ width: `${percentage}%`, backgroundColor: displayColor, boxShadow: `0 0 10px ${displayColor}40` }}
           >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]"></div>
           </div>
        </div>
        
        {isOver && (
           <div className="flex items-center gap-1 mt-1.5 text-[#FF453A] text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <AlertCircle size={10} /> Limit Exceeded
           </div>
        )}
     </div>
   );
};

const WaterTracker: React.FC<{ 
  intake: number; 
  onAdd: (amount: number) => void; 
}> = ({ intake, onAdd }) => {
  const goal = 2500;
  const percentage = Math.min(100, (intake / goal) * 100);

  return (
    <Card className="p-5 overflow-hidden relative dark:bg-[#1C1C1E] dark:border-gray-800" isPressable>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-blue-50/50 dark:bg-blue-900/10 rounded-b-[20px] pointer-events-none -z-0">
          <svg className="absolute bottom-0 w-full h-full text-blue-100/50 dark:text-blue-800/20" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path fill="currentColor" fillOpacity="1" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
      </div>

      <div className="relative z-10 flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-sm">
            <Droplets className="text-[#007AFF] w-5 h-5" fill="currentColor" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Water</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Goal: {goal}ml</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#007AFF]">{intake}<span className="text-sm font-medium text-gray-400 ml-0.5">ml</span></div>
        </div>
      </div>

      <div className="relative z-10 h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-5">
         <div 
           className="h-full bg-[#007AFF] rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
           style={{ width: `${percentage}%` }}
         >
           <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite]"></div>
         </div>
      </div>

      <div className="relative z-10 flex gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); onAdd(250); }}
          className="flex-1 py-2 rounded-xl bg-white dark:bg-[#2C2C2E] border border-blue-100 dark:border-gray-700 text-[#007AFF] font-semibold text-sm hover:bg-blue-50 dark:hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          <Plus size={14} strokeWidth={3} /> 250ml
        </button>
        <button 
           onClick={(e) => { e.stopPropagation(); onAdd(500); }}
           className="flex-1 py-2 rounded-xl bg-white dark:bg-[#2C2C2E] border border-blue-100 dark:border-gray-700 text-[#007AFF] font-semibold text-sm hover:bg-blue-50 dark:hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          <Plus size={14} strokeWidth={3} /> 500ml
        </button>
      </div>
    </Card>
  );
};

const AwardsView: React.FC<{ profile: UserProfile }> = ({ profile }) => {
   const unlockedSet = new Set(profile.preferences.unlockedAwards || []);

   return (
      <div className="h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-24 transition-colors duration-500">
         <div className="bg-[#F2F2F7]/95 dark:bg-black/95 pt-safe px-5 pb-4 sticky top-0 z-40 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
            <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight mt-2">Awards</h1>
         </div>
         
         <div className="px-5 mt-4 space-y-8">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[24px] p-1 text-white shadow-lg transform hover:scale-[1.01] transition-transform">
               <div className="bg-white/10 backdrop-blur-md rounded-[22px] p-5 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-white/50 flex items-center justify-center shrink-0 shadow-inner">
                     <span className="text-3xl">🤖</span>
                  </div>
                  <div>
                     <h3 className="font-bold text-lg mb-1">Coach Snap</h3>
                     <p className="text-indigo-100 text-sm leading-relaxed">
                        "Great job logging breakfast! You're on track to hit your protein goal today. Try adding a handful of nuts for a healthy fat boost!"
                     </p>
                  </div>
               </div>
            </div>

            <div>
               <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Achievement Museum <Sparkles size={18} className="text-yellow-500" />
               </h2>
               <div className="grid grid-cols-2 gap-4">
                  {ALL_ACHIEVEMENTS.map((ach) => {
                     const isUnlocked = unlockedSet.has(ach.id);
                     return (
                     <div key={ach.id} className="group perspective-1000 h-40 cursor-pointer">
                        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d group-hover:rotate-y-180`}>
                           <div className={`absolute inset-0 backface-hidden rounded-2xl p-4 flex flex-col items-center justify-center border shadow-sm dark:bg-[#1C1C1E] dark:border-gray-800 ${!isUnlocked ? 'bg-gray-100 border-gray-200 dark:bg-[#1C1C1E] dark:border-gray-800' : 'bg-white border-yellow-100 shadow-yellow-100/50'}`}>
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-sm ${!isUnlocked ? 'bg-gray-200 dark:bg-gray-700 grayscale opacity-50' : 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50'}`}>
                                 {!isUnlocked ? <Lock size={24} className="text-gray-400" /> : ach.icon}
                              </div>
                              <span className={`font-bold text-sm text-center ${!isUnlocked ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{ach.title}</span>
                           </div>
                           
                           <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#007AFF] rounded-2xl p-4 flex flex-col items-center justify-center text-white shadow-lg">
                              <p className="text-center text-sm font-medium leading-relaxed">{ach.desc}</p>
                              {!isUnlocked ? (
                                 <div className="mt-2 px-3 py-1 bg-black/20 rounded-full text-xs font-bold">LOCKED</div>
                              ) : (
                                 <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12}/> UNLOCKED</div>
                              )}
                           </div>
                        </div>
                     </div>
                  )})}
               </div>
            </div>
         </div>
      </div>
   );
};

const Switch: React.FC<{ 
  checked: boolean; 
  onChange: (val: boolean) => void;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  label: string;
}> = ({ checked, onChange, icon, iconBgColor, iconColor, label }) => {
  return (
    <div 
      className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgColor} ${iconColor}`}>
            {icon}
          </div>
        )}
        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
      </div>
      <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${checked ? 'bg-[#34C759]' : 'bg-gray-200 dark:bg-gray-600'}`}>
        <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
      </div>
    </div>
  );
};

const PremiumCard: React.FC<{ isPremium: boolean; name?: string; onUpgrade?: () => void }> = ({ isPremium, name, onUpgrade }) => {
   const cardRef = useRef<HTMLDivElement>(null);
   const [transform, setTransform] = useState('');

   // 3D Tilt Logic
   const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
     if (!cardRef.current) return;
     const { left, top, width, height } = cardRef.current.getBoundingClientRect();
     const x = (e.clientX - left - width / 2) / 20; // Heavier divisor
     const y = (e.clientY - top - height / 2) / 20;
     setTransform(`perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg) scale(1.02)`);
   };

   const handleMouseLeave = () => {
     setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');
   };

   return (
      <div className="perspective-1000 w-full h-56 cursor-pointer group" onClick={isPremium ? undefined : onUpgrade}>
         <div 
            ref={cardRef}
            className="relative w-full h-full rounded-xl transition-transform duration-100 ease-out shadow-2xl overflow-hidden"
            style={{ 
               transform: transform,
               transformStyle: 'preserve-3d',
               background: 'radial-gradient(circle at 50% 30%, #2a2a2a, #0a0a0a)',
               boxShadow: '0 10px 30px -10px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(212, 175, 55, 0.3), 0 0 0 1px rgba(20, 20, 20, 1)'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
         >
            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Subtle Geometric Pattern */}
            <div className="absolute inset-0 opacity-[0.03] z-0"
                 style={{ backgroundImage: 'linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 75%, #ffffff 75%, #ffffff), linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 75%, #ffffff 75%, #ffffff)', backgroundSize: '60px 60px', backgroundPosition: '0 0, 30px 30px' }}>
            </div>

            {/* Shine Bar */}
            <div className="absolute inset-0 z-10 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-15deg] animate-shimmer-fast pointer-events-none"></div>

            <div className="relative z-20 h-full p-6 flex flex-col justify-between">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="font-serif text-2xl font-bold tracking-widest drop-shadow-sm" 
                              style={{ 
                                  color: 'white',
                                  textShadow: '-1px -1px 0 #d4af37, 1px -1px 0 #d4af37, -1px 1px 0 #d4af37, 1px 1px 0 #d4af37'
                              }}>
                            SNAPCAL.AI
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                             <Crown size={12} className="text-[#d4af37]" fill="currentColor" />
                             <span className="font-semibold uppercase text-[#d4af37]" style={{ fontSize: '0.7rem', letterSpacing: '0.2em' }}>
                                 ELITE MEMBERSHIP
                             </span>
                        </div>
                    </div>
                    
                    <div className="opacity-80 text-[#d4af37]">
                        <Wifi size={24} className="rotate-90" />
                    </div>
                </div>

                {/* Chip & Number */}
                <div className="flex items-center gap-6 mt-2">
                    {/* Custom Chip */}
                    <div className="w-12 h-9 rounded-md relative overflow-hidden flex items-center justify-center border border-amber-600/50 shadow-inner"
                         style={{ background: 'linear-gradient(135deg, #d4af37 0%, #a67c00 100%)' }}>
                        <div className="absolute w-full h-[1px] bg-black/20 top-1/2"></div>
                        <div className="absolute h-full w-[1px] bg-black/20 left-1/2"></div>
                        <div className="w-6 h-4 border border-black/20 rounded-[2px] z-10"></div>
                    </div>
                    
                    <div className="font-mono text-xl tracking-widest text-gray-200 drop-shadow-md" style={{ wordSpacing: '0.2em' }}>
                        •••• •••• •••• ••••
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <div className="text-[0.55rem] text-gray-400 uppercase tracking-widest mb-0.5">Cardholder</div>
                        <div className="font-serif text-sm tracking-widest text-gray-200 uppercase font-bold shadow-black drop-shadow-sm">
                            {name || 'GUEST MEMBER'}
                        </div>
                    </div>

                    <div className="flex flex-col items-end mr-4">
                         <div className="text-[0.55rem] text-gray-400 uppercase tracking-widest mb-0.5">Renews</div>
                         <div className="font-mono text-sm text-gray-200 uppercase">Monthly</div>
                    </div>

                    {/* Visa/Mastercard Logo Simulation */}
                    <div className="flex -space-x-3 opacity-90">
                       <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
                       <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
                    </div>
                </div>
            </div>
         </div>
      </div>
   );
};

const PremiumProfileView: React.FC<{ 
  profile: UserProfile; 
  weeklyStats: number[];
  onUpdate: (p: UserProfile) => void;
  onLogout: () => void;
}> = ({ profile, weeklyStats, onUpdate, onLogout }) => {
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay('morning');
    else if (hour >= 12 && hour < 18) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
  }, []);

  const getGradient = () => {
    switch (timeOfDay) {
      case 'morning': return 'from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10';
      case 'afternoon': return 'from-amber-100 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10';
      case 'evening': return 'from-indigo-100 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/10';
    }
  };

  const handleTogglePref = (key: keyof typeof profile.preferences) => {
    const currentPrefs = profile.preferences || INITIAL_PROFILE.preferences;
    const newPrefs = { ...currentPrefs, [key]: !currentPrefs[key] };
    onUpdate({ ...profile, preferences: newPrefs });
  };
  
  const totalMacros = profile.targetProtein + profile.targetCarbs + profile.targetFat;
  const pPct = totalMacros ? (profile.targetProtein / totalMacros) * 100 : 0;
  const cPct = totalMacros ? (profile.targetCarbs / totalMacros) * 100 : 0;
  const fPct = totalMacros ? (profile.targetFat / totalMacros) * 100 : 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  
  const pDash = (pPct / 100) * circumference;
  const cDash = (cPct / 100) * circumference;
  const fDash = (fPct / 100) * circumference;

  const avgConsistency = weeklyStats.length > 0 
     ? Math.round(weeklyStats.reduce((a, b) => a + b, 0) / weeklyStats.length) 
     : 0;
  
  const displayStats = [...weeklyStats];
  while (displayStats.length < 7) {
     displayStats.unshift(0);
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-black overflow-y-auto pb-24 transition-colors duration-500 font-sans">
      
      <div className={`pt-safe pb-8 px-6 rounded-b-[40px] bg-gradient-to-br ${getGradient()} shadow-sm relative overflow-hidden transition-colors duration-1000`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 dark:bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
        
        <div className="relative z-10 flex flex-col items-center mt-6">
          <div className="relative group cursor-pointer">
             <div className="w-28 h-28 rounded-full bg-white dark:bg-gray-800 p-1 shadow-xl">
               <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden">
                 <span className="text-4xl font-serif text-gray-400 dark:text-gray-500">{profile.name ? profile.name[0] : 'U'}</span>
               </div>
             </div>
             {profile.isPremium && (
               <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-300 to-amber-500 text-white p-2 rounded-full shadow-lg animate-bounce-slow">
                 <Award size={20} fill="currentColor" />
               </div>
             )}
          </div>

          <h1 className="mt-4 text-3xl font-bold font-serif text-gray-900 dark:text-white tracking-tight">{profile.name || 'Guest User'}</h1>
          
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${profile.isPremium ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-200 text-gray-600'}`}>
              {profile.isPremium ? 'Premium Member' : 'Free Plan'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-8">
        <div className="grid grid-cols-2 gap-4">
           <div className="col-span-1 bg-white dark:bg-[#1C1C1E] p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Consistency</h3>
              <div className="relative w-20 h-20 mx-auto mb-4">
                 <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 overflow-visible">
                    <defs>
                        <linearGradient id="consistencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#34D399" />
                            <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <filter id="consistencyGlow" x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur stdDeviation="6" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="16" className="text-gray-100 dark:text-gray-800" fill="none" />
                    <circle 
                        cx="100" cy="100" r="80" 
                        stroke="url(#consistencyGradient)" 
                        strokeWidth="16" 
                        fill="none" 
                        strokeDasharray={2 * Math.PI * 80}
                        strokeDashoffset={2 * Math.PI * 80 * (1 - (avgConsistency / 100))} 
                        strokeLinecap="round"
                        style={{ filter: "url(#consistencyGlow)" }}
                    />
                    <circle cx="100" cy="100" r="62" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-gray-200 dark:text-gray-700" fill="none" />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white">{avgConsistency}%</div>
              </div>
              <div className="flex justify-between items-end h-8 px-1">
                 {displayStats.slice(-7).map((h, i) => (
                    <div key={i} className="w-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden h-full flex items-end">
                       <div className="w-full bg-[#34C759] rounded-full transition-all duration-700 delay-100" style={{ height: `${Math.min(100, h)}%` }}></div>
                    </div>
                 ))}
              </div>
              <p className="text-center text-xs text-gray-500 mt-2 font-medium">Last 7 Days</p>
           </div>

           <div className="col-span-1 bg-white dark:bg-[#1C1C1E] p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 dark:border-gray-800 relative overflow-hidden">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Target Split</h3>
               <div className="relative w-24 h-24 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                     <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-gray-100 dark:stroke-gray-800" />
                     {pPct > 0 && <circle cx="40" cy="40" r={radius} fill="none" stroke="#FF2D55" strokeWidth="8" strokeDasharray={`${pDash} ${circumference}`} strokeDashoffset="0" />}
                     {cPct > 0 && <circle cx="40" cy="40" r={radius} fill="none" stroke="#FF9500" strokeWidth="8" strokeDasharray={`${cDash} ${circumference}`} strokeDashoffset={-pDash} />}
                     {fPct > 0 && <circle cx="40" cy="40" r={radius} fill="none" stroke="#007AFF" strokeWidth="8" strokeDasharray={`${fDash} ${circumference}`} strokeDashoffset={-(pDash + cDash)} />}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <span className="text-[10px] font-bold text-gray-400">TARGET</span>
                  </div>
               </div>
               
               <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FF2D55]"></div><span className="text-gray-600 dark:text-gray-300">Protein</span></div>
                     <span className="font-bold">{Math.round(pPct)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FF9500]"></div><span className="text-gray-600 dark:text-gray-300">Carbs</span></div>
                     <span className="font-bold">{Math.round(cPct)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#007AFF]"></div><span className="text-gray-600 dark:text-gray-300">Fat</span></div>
                     <span className="font-bold">{Math.round(fPct)}%</span>
                  </div>
               </div>
           </div>
        </div>

        <PremiumCard isPremium={profile.isPremium} name={profile.name} />

        <div className="space-y-4">
           <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-white px-1">Preferences</h3>
           <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
              <Switch 
                  label="Push Notifications" 
                  checked={profile.preferences?.notifications} 
                  onChange={() => handleTogglePref('notifications')}
                  icon={<Bell size={18} />}
                  iconBgColor="bg-red-100 dark:bg-red-900/20"
                  iconColor="text-red-600 dark:text-red-400"
              />
              <Switch 
                  label="Weekly Reports" 
                  checked={profile.preferences?.weeklyReports || false} 
                  onChange={() => handleTogglePref('weeklyReports')}
                  icon={<FileText size={18} />}
                  iconBgColor="bg-blue-100 dark:bg-blue-900/20"
                  iconColor="text-blue-600 dark:text-blue-400"
              />
              <Switch 
                  label="Dark Mode" 
                  checked={profile.preferences?.darkMode} 
                  onChange={() => handleTogglePref('darkMode')}
                  icon={<Moon size={18} />}
                  iconBgColor="bg-purple-100 dark:bg-purple-900/20"
                  iconColor="text-purple-600 dark:text-purple-400"
              />
              <div onClick={onLogout} className="p-4 flex items-center justify-between active:bg-gray-50 dark:active:bg-[#2C2C2E] cursor-pointer text-red-500">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/10">
                        <LogOut size={18} />
                     </div>
                     <span className="font-medium">Sign Out</span>
                  </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

const OnboardingStep: React.FC<{ 
  profile: UserProfile; 
  setProfile: (p: UserProfile) => void; 
  onComplete: () => void;
  isLoading: boolean;
}> = ({ profile, setProfile, onComplete, isLoading }) => {
  const [step, setStep] = useState(1);
  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);
  const update = (key: keyof UserProfile, value: any) => setProfile({ ...profile, [key]: value });

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
               <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF] to-blue-600 rounded-[24px] mx-auto flex items-center justify-center shadow-xl mb-4">
                  <span className="text-4xl">👋</span>
               </div>
               <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome!</h2>
               <p className="text-gray-500 mt-2">Let's get to know you better to create your personalized plan.</p>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What's your name?</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={e => update('name', e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-[#1C1C1E] rounded-2xl border-none focus:ring-2 focus:ring-[#007AFF] text-lg outline-none transition-all"
                    placeholder="Enter your name"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                  <div className="grid grid-cols-2 gap-3">
                     {[Gender.Male, Gender.Female].map(g => (
                        <button 
                           key={g}
                           onClick={() => update('gender', g)}
                           className={`p-4 rounded-2xl font-medium transition-all ${profile.gender === g ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400'}`}
                        >
                           {g}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            <Button onClick={nextStep} disabled={!profile.name} fullWidth className="mt-8">Continue</Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="text-center mb-8">
               <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Body Stats</h2>
               <p className="text-gray-500 mt-2">This helps us calculate your calorie needs.</p>
             </div>
             
             <div className="space-y-6">
               <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between mb-2">
                     <label className="font-semibold text-gray-700 dark:text-gray-300">Age</label>
                     <span className="text-[#007AFF] font-bold">{profile.age} years</span>
                  </div>
                  <input 
                     type="range" min="18" max="100" value={profile.age} 
                     onChange={e => update('age', parseInt(e.target.value))}
                     className="w-full accent-[#007AFF] h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                  />
               </div>

               <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between mb-2">
                     <label className="font-semibold text-gray-700 dark:text-gray-300">Height</label>
                     <span className="text-[#007AFF] font-bold">{profile.height} cm</span>
                  </div>
                  <input 
                     type="range" min="140" max="220" value={profile.height} 
                     onChange={e => update('height', parseInt(e.target.value))}
                     className="w-full accent-[#007AFF] h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                  />
               </div>

               <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between mb-2">
                     <label className="font-semibold text-gray-700 dark:text-gray-300">Weight</label>
                     <span className="text-[#007AFF] font-bold">{profile.weight} kg</span>
                  </div>
                  <input 
                     type="range" min="40" max="150" value={profile.weight} 
                     onChange={e => update('weight', parseInt(e.target.value))}
                     className="w-full accent-[#007AFF] h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                  />
               </div>
             </div>
             
             <div className="flex gap-4 pt-4">
                <Button variant="secondary" onClick={prevStep} className="flex-1">Back</Button>
                <Button onClick={nextStep} className="flex-1">Next</Button>
             </div>
          </div>
        );
      case 3:
         return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
               <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Goal</h2>
               </div>
               
               <div className="grid gap-4">
                  {[Goal.LoseWeight, Goal.Maintain, Goal.GainMuscle].map(g => (
                     <button
                        key={g}
                        onClick={() => update('goal', g)}
                        className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${profile.goal === g ? 'border-[#007AFF] bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-white dark:bg-[#1C1C1E] hover:bg-gray-50'}`}
                     >
                        <span className={`font-bold ${profile.goal === g ? 'text-[#007AFF]' : 'text-gray-700 dark:text-gray-300'}`}>{g}</span>
                        {profile.goal === g && <CheckCircle2 className="text-[#007AFF]" size={20} />}
                     </button>
                  ))}
               </div>

               <div className="mt-8">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 ml-1">Activity Level</label>
                  <div className="grid gap-3">
                     {[ActivityLevel.Sedentary, ActivityLevel.Light, ActivityLevel.Moderate, ActivityLevel.Active].map(l => (
                        <button
                           key={l}
                           onClick={() => update('activityLevel', l)}
                           className={`p-4 rounded-2xl text-sm font-medium transition-all text-left ${profile.activityLevel === l ? 'bg-[#007AFF] text-white shadow-md' : 'bg-white dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400'}`}
                        >
                           {l}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  <Button variant="secondary" onClick={prevStep} className="flex-1">Back</Button>
                  <Button onClick={onComplete} disabled={isLoading} className="flex-1">
                     {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Plan'}
                  </Button>
               </div>
            </div>
         );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col justify-center p-6">
       <div className="max-w-md w-full mx-auto">
          {renderStep()}
          
          <div className="flex justify-center gap-2 mt-8">
             {[1,2,3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#007AFF]' : 'w-2 bg-gray-300 dark:bg-gray-800'}`} />
             ))}
          </div>
       </div>
    </div>
  );
};

const AuthView: React.FC<{ 
  onSuccess: () => void; 
  onSkip: () => void;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}> = ({ onSuccess, onSkip, profile, setProfile }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Forgot Password Modal State
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleAuth = async (mode: 'login' | 'signup') => {
    if(!email.trim() || !password.trim()) {
       setErrorMsg('Please enter both email and password.');
       return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      if (mode === 'signup') {
         const { data, error } = await supabase.auth.signUp({ 
            email: email.trim(),
            password: password.trim()
         });
         if (error) throw error;
         if (data.session) onSuccess();
         else if (data.user) {
             alert('Account created! Please check your email or try logging in.');
         }
      } else {
         const { data, error } = await supabase.auth.signInWithPassword({ 
            email: email.trim(), 
            password: password.trim() 
         });
         if (error) throw error;
         if (data.session) onSuccess();
      }
    } catch (error: any) {
      if (error.message.includes('Invalid login credentials')) setErrorMsg('Invalid email or password.');
      else if (error.message.includes('User already registered')) setErrorMsg('User already registered. Please log in.');
      else setErrorMsg(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    if(!resetEmail.trim()) return;
    try {
      await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin
      });
      alert("Password reset link sent to your email!");
      setShowForgotPass(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center p-6 text-white font-sans">
      <LiquidBackground />

      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-700">
         <div className="text-center mb-8 relative z-10">
            <RotatingLogo />
            
            <div className="flex flex-col items-center">
               <h1 className="text-5xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-gray-500 animate-glitch-text" data-text="SnapCal">SnapCal</h1>
               <div className="flex items-center gap-2 mt-1">
                  <p className="text-blue-200 text-sm font-medium tracking-widest uppercase opacity-80">AI Nutrition Intelligence</p>
               </div>
            </div>
         </div>

         <TiltCard className="bg-black/40 backdrop-blur-xl rounded-[40px] p-8 border border-[#007AFF]/30 shadow-[0_0_50px_rgba(0,122,255,0.2)] relative">
            
            {/* Google Sign In Button */}
            <div className="mb-6">
                <button 
                  type="button"
                  className="w-full h-12 rounded-full font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                  onClick={() => alert("Google Sign-In coming soon!")}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <div className="relative py-4">
                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                   <div className="relative flex justify-center text-[10px] font-bold tracking-widest uppercase"><span className="bg-[#050505] px-2 text-gray-500 rounded-full">Or with Email</span></div>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAuth('login'); }} className="space-y-6">
               <div>
                  <div className="relative group">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#007AFF] group-focus-within:text-white transition-colors z-10" size={20} />
                     <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email address" 
                        required
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="email"
                        className="w-full bg-black/50 border-2 border-[#007AFF]/50 rounded-full py-4 pl-12 pr-4 text-white placeholder-gray-500 outline-none focus:border-[#007AFF] focus:shadow-[0_0_20px_rgba(0,122,255,0.3)] transition-all font-medium"
                     />
                  </div>
               </div>
               
               <div>
                  <div className="relative group">
                     <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#007AFF] group-focus-within:text-white transition-colors z-10" size={20} />
                     <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password" 
                        required
                        minLength={6}
                        className="w-full bg-black/50 border-2 border-[#007AFF]/50 rounded-full py-4 pl-12 pr-12 text-white placeholder-gray-500 outline-none focus:border-[#007AFF] focus:shadow-[0_0_20px_rgba(0,122,255,0.3)] transition-all font-medium"
                     />
                     <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                     >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                     </button>
                  </div>
                  {/* Forgot Password Link */}
                  <div className="flex justify-end mt-2">
                     <button 
                       type="button" 
                       onClick={() => setShowForgotPass(true)}
                       className="text-xs text-[#007AFF] hover:text-blue-400 font-medium"
                     >
                       Forgot Password?
                     </button>
                  </div>
               </div>
               
               {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-200 text-xs font-medium animate-in fade-in slide-in-from-top-2 shadow-lg shadow-red-500/10">
                     <AlertCircle size={14} className="shrink-0" />
                     {errorMsg}
                  </div>
               )}

               <div className="pt-2 space-y-4">
                  <MagneticButton 
                    type="submit" 
                    fullWidth 
                    disabled={loading} 
                    className="rounded-full h-14 font-bold text-lg bg-gradient-to-r from-[#007AFF] to-blue-500 shadow-[0_0_30px_rgba(0,122,255,0.4)] hover:shadow-[0_0_40px_rgba(0,122,255,0.6)] border border-white/20 transition-all duration-300"
                  >
                     {loading ? (
                        <span className="flex items-center gap-2 justify-center"><Loader2 className="animate-spin" size={20} /> Processing...</span>
                     ) : (
                        'Sign In'
                     )}
                  </MagneticButton>
                  
                  <button 
                    type="button"
                    onClick={() => handleAuth('signup')}
                    disabled={loading}
                    className="w-full h-12 rounded-full font-semibold text-white/90 bg-white/5 border border-[#007AFF]/30 hover:bg-[#007AFF]/10 hover:border-[#007AFF]/60 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(0,122,255,0.1)]"
                  >
                    Create Account
                  </button>
               </div>
            </form>

            <div className="mt-6">
                <button onClick={onSkip} className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1 group">
                   Continue as Guest <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPass && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-[40px] z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold mb-4 text-white">Reset Password</h3>
                  <p className="text-sm text-gray-400 mb-6 text-center">Enter your email to receive a reset link.</p>
                  <input 
                    type="email" 
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white mb-4 outline-none focus:border-[#007AFF]"
                  />
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setShowForgotPass(false)}
                      className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleResetPassword}
                      className="flex-1 py-3 rounded-xl bg-[#007AFF] text-white font-medium hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                    >
                      Send
                    </button>
                  </div>
              </div>
            )}
         </TiltCard>
         
         <div className="mt-8 flex justify-center gap-6 opacity-40 hover:opacity-100 transition-opacity duration-300">
            <span className="text-[10px] text-gray-300 cursor-pointer">Privacy Policy</span>
            <span className="text-[10px] text-gray-300 cursor-pointer">Terms of Service</span>
         </div>
      </div>
    </div>
  );
};

const Paywall: React.FC<{ onSubscribe: () => void }> = ({ onSubscribe }) => {
   return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
         <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black z-0"></div>
         <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#007AFF]/20 to-transparent blur-3xl pointer-events-none"></div>

         <div className="relative z-10 flex-1 flex flex-col p-6 pt-safe">
            <div className="flex justify-end">
               <button onClick={onSubscribe} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-white/20">
                  <X size={18} />
               </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center mt-4">
               <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(255,165,0,0.4)] mb-8 animate-bounce-slow">
                  <Crown size={40} className="text-white" fill="currentColor" />
               </div>
               
               <h1 className="text-4xl font-bold mb-4">Unlock Full Potential</h1>
               <p className="text-gray-400 text-lg max-w-xs mx-auto mb-10">
                  Get unlimited AI food scans, advanced insights, and personalized coaching.
               </p>

               <div className="w-full max-w-sm space-y-4 mb-8">
                  {[
                     { icon: ScanLine, text: "Unlimited AI Food Analysis" },
                     { icon: TrendingUp, text: "Advanced Macro Trends" },
                     { icon: Zap, text: "Faster Processing Speed" },
                     { icon: Target, text: "Custom Macro Targets" }
                  ].map((item, i) => (
                     <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-[#007AFF]">
                           <item.icon size={20} />
                        </div>
                        <span className="font-medium text-left flex-1">{item.text}</span>
                        <CheckCircle2 size={20} className="text-[#34C759]" fill="currentColor" />
                     </div>
                  ))}
               </div>
            </div>

            <div className="mt-auto">
               <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded-[24px] mb-4">
                  <div className="bg-black rounded-[22px] p-4 flex justify-between items-center relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent animate-pulse"></div>
                     <div className="relative z-10">
                        <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-0.5">Best Value</div>
                        <div className="font-bold text-xl">28.88 DT <span className="text-sm text-gray-400 font-normal">/ 3 months</span></div>
                     </div>
                     <div className="relative z-10 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold">
                        Save 50%
                     </div>
                  </div>
               </div>
               
               <Button onClick={onSubscribe} fullWidth className="bg-[#007AFF] hover:bg-[#0066CC] text-white shadow-[0_0_30px_rgba(0,122,255,0.4)] border-none text-lg py-4">
                  Start 7-Day Free Trial
               </Button>
               <p className="text-center text-xs text-gray-500 mt-4 mb-safe">
                  Recurring billing. Cancel anytime.
               </p>
            </div>
         </div>
      </div>
   );
};

const HolographicScanner: React.FC<{ image: string | null }> = ({ image }) => {
   return (
      <div className="relative w-64 h-64 mb-8 perspective-1000">
         <div className="relative w-full h-full transform-style-3d rotate-x-12">
            <div className="absolute inset-0 border-2 border-[#007AFF]/30 rounded-[32px] overflow-hidden bg-black/20 backdrop-blur-sm shadow-[0_0_30px_rgba(0,122,255,0.2)]">
               {image && (
                  <div className="w-full h-full relative">
                     <img src={image} className="w-full h-full object-cover opacity-60" alt="Scanning" />
                     <div className="absolute inset-0 bg-[#007AFF]/10 mix-blend-overlay"></div>
                  </div>
               )}
               
               {/* Scanning Laser */}
               <div className="absolute top-0 left-0 right-0 h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8),0_0_30px_rgba(0,122,255,0.8)] animate-scan-laser z-20"></div>
               
               {/* Grid Overlay */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(0,122,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(0,122,255,0.15)_1px,transparent_1px)] bg-[size:30px_30px] z-10 pointer-events-none"></div>

               {/* Corner UI Elements */}
               <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#007AFF] z-20 rounded-tl-md opacity-80"></div>
               <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#007AFF] z-20 rounded-tr-md opacity-80"></div>
               <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#007AFF] z-20 rounded-bl-md opacity-80"></div>
               <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#007AFF] z-20 rounded-br-md opacity-80"></div>
            </div>
            
            {/* Holographic Base */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-[#007AFF] blur-2xl opacity-20 rounded-full pointer-events-none"></div>
         </div>
      </div>
   );
};

const ProcessingView: React.FC<{ image: string | null }> = ({ image }) => {
   return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
         {/* Background Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
         
         <div className="relative z-10 flex flex-col items-center">
            {/* Holographic Scanner */}
            <HolographicScanner image={image} />

            <div className="flex flex-col items-center space-y-4">
               <div className="flex items-center gap-3">
                  <div className="relative">
                     <div className="absolute inset-0 bg-blue-500 blur-md opacity-50 animate-pulse"></div>
                     <Loader2 className="animate-spin text-[#007AFF] relative z-10" size={28} />
                  </div>
                  <span className="text-2xl font-bold text-white tracking-widest uppercase">Analyzing</span>
               </div>
               
               {/* Digital Text Decoder */}
               <div className="h-6 overflow-hidden">
                  <p className="text-[#007AFF] text-sm font-mono tracking-widest animate-pulse">IDENTIFYING MACROS...</p>
               </div>
            </div>
         </div>
      </div>
   );
};

const ProgressDashboard: React.FC<{ log: DayLog; profile: UserProfile }> = ({ log, profile }) => {
   // Calculate totals
   const totalCalories = log.items.reduce((acc, i) => acc + i.calories, 0);
   const totalProtein = log.items.reduce((acc, i) => acc + i.protein, 0);
   const totalCarbs = log.items.reduce((acc, i) => acc + i.carbs, 0);
   const totalFat = log.items.reduce((acc, i) => acc + i.fat, 0);

   return (
      <div className="h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-24 transition-colors duration-500">
         <div className="bg-[#F2F2F7]/95 dark:bg-black/95 pt-safe px-5 pb-4 sticky top-0 z-40 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
            <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight mt-2">Progress</h1>
         </div>

         <div className="px-5 mt-4 space-y-6">
            {/* Main Rings Card */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Daily Summary</h3>
               <ConcentricActivityRings 
                  data={[
                     { label: 'Calories', current: totalCalories, target: profile.targetCalories, color: '#FF2D55' },
                     { label: 'Protein', current: totalProtein, target: profile.targetProtein, color: '#34C759' },
                     { label: 'Carbs', current: totalCarbs, target: profile.targetCarbs, color: '#007AFF' },
                  ]} 
               />
               <div className="grid grid-cols-3 gap-2 mt-8">
                  <div className="text-center">
                     <div className="text-[#FF2D55] font-bold text-xl">{totalCalories}</div>
                     <div className="text-xs text-gray-500">Calories</div>
                  </div>
                  <div className="text-center">
                     <div className="text-[#34C759] font-bold text-xl">{totalProtein}g</div>
                     <div className="text-xs text-gray-500">Protein</div>
                  </div>
                  <div className="text-center">
                     <div className="text-[#007AFF] font-bold text-xl">{totalCarbs}g</div>
                     <div className="text-xs text-gray-500">Carbs</div>
                  </div>
               </div>
            </div>

            {/* Detailed Macros */}
            <div>
               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-1">Nutrient Breakdown</h3>
               <div className="grid grid-cols-2 gap-3">
                  <ModernNutrientBar label="Protein" current={totalProtein} max={profile.targetProtein} unit="g" color="#34C759" />
                  <ModernNutrientBar label="Carbs" current={totalCarbs} max={profile.targetCarbs} unit="g" color="#007AFF" />
                  <ModernNutrientBar label="Fat" current={totalFat} max={profile.targetFat} unit="g" color="#FF9500" />
                  <ModernNutrientBar label="Fiber" current={log.items.reduce((a,i)=>a+(i.fiber||0),0)} max={profile.targetFiber} unit="g" color="#AF52DE" />
                  <ModernNutrientBar label="Sugar" current={log.items.reduce((a,i)=>a+(i.sugar||0),0)} max={profile.targetSugar} unit="g" color="#FF2D55" type="limit" />
                  <ModernNutrientBar label="Sodium" current={log.items.reduce((a,i)=>a+(i.sodium||0),0)} max={profile.maxSodium} unit="mg" color="#5856D6" type="limit" />
               </div>
            </div>

            {/* Weekly Trend (Placeholder for visual completeness) */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">Weight Trend</h3>
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">-0.5 kg</span>
               </div>
               <div className="h-32 flex items-end justify-between px-2">
                  {[70.5, 70.4, 70.2, 70.3, 70.1, 70.0, 69.9].map((w, i) => (
                     <div key={i} className="flex flex-col items-center gap-2 group">
                        <div 
                           className="w-2 bg-blue-200 dark:bg-blue-900 rounded-t-full transition-all group-hover:bg-[#007AFF]" 
                           style={{ height: `${(w - 68) * 15}%` }}
                        ></div>
                        <span className="text-[10px] text-gray-400">{['M','T','W','T','F','S','S'][i]}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [currentView, setCurrentView] = useState<ViewState>('AUTH');
  
  // DATE STATE
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [todayLog, setTodayLog] = useState<DayLog>(INITIAL_LOG);
  
  // Weekly Consistency State
  const [consistencyHistory, setConsistencyHistory] = useState<number[]>([]);

  const [session, setSession] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const currentViewRef = useRef<ViewState>('AUTH');
  
  // Guest Mode
  const [isGuest, setIsGuest] = useState(false);
  
  // Camera & Analysis State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields state for Review mode
  const [editForm, setEditForm] = useState<AIAnalysisResult | null>(null);

  // Confetti State
  const [showConfetti, setShowConfetti] = useState(false);

  // Achievement Unlock State
  const [justUnlockedAchievement, setJustUnlockedAchievement] = useState<AchievementDef | null>(null);

  // --- Supabase Persistence Logic ---

  // 1. Check Session & Load Data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id, selectedDate);
      } else {
        if (!isGuest && currentViewRef.current !== 'AUTH') {
            setCurrentView('AUTH');
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
         setIsGuest(false);
         fetchUserData(session.user.id, selectedDate);
      } else {
         if (!isGuest) {
            setCurrentView('AUTH');
         }
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  // Fetch when selectedDate changes
  useEffect(() => {
    if (session?.user?.id) {
        fetchUserData(session.user.id, selectedDate);
    }
  }, [selectedDate, session]);

  // Fetch Weekly Stats when entering Profile View
  useEffect(() => {
    if (currentView === 'PROFILE' && session?.user?.id) {
        fetchWeeklyStats(session.user.id);
    }
  }, [currentView, session]);

  // Keep ref in sync
  useEffect(() => {
     currentViewRef.current = currentView;
  }, [currentView]);

  const fetchUserData = async (userId: string, dateStr: string) => {
    setIsDataLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(prev => ({
            ...prev,
            ...profileData,
            preferences: profileData.preferences || INITIAL_PROFILE.preferences,
            ...(profileData.targets || {})
        }));
        
        const safeViews = ['AUTH', 'PAYWALL', 'DASHBOARD'];
        if (profileData.has_onboarded) {
          if (!safeViews.includes(currentViewRef.current)) {
             setCurrentView(profileData.is_premium ? 'DASHBOARD' : 'PAYWALL');
          }
        } else {
          setCurrentView('ONBOARDING');
        }
      } else {
        setCurrentView('ONBOARDING');
      }

      const { data: foodData } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .order('created_at', { ascending: false });

      const { data: waterData } = await supabase
        .from('water_logs')
        .select('amount')
        .eq('user_id', userId)
        .eq('date', dateStr);

      const totalWater = waterData ? waterData.reduce((acc: number, curr: any) => acc + curr.amount, 0) : 0;
      
      setTodayLog({
        date: dateStr,
        items: (foodData || []).map((f: any) => ({
            ...f,
            timestamp: new Date(f.created_at).getTime(),
            mealType: f.meal_type,
            imageUrl: f.image_url 
        })),
        waterIntake: totalWater
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchWeeklyStats = async (userId: string) => {
     try {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const startDateStr = sevenDaysAgo.toISOString().split('T')[0];

        const { data: weeklyLogs } = await supabase
           .from('food_logs')
           .select('date, calories')
           .eq('user_id', userId)
           .gte('date', startDateStr);
        
        if (!weeklyLogs) return;

        const caloriesByDate: Record<string, number> = {};
        weeklyLogs.forEach((log: any) => {
           caloriesByDate[log.date] = (caloriesByDate[log.date] || 0) + log.calories;
        });

        const stats: number[] = [];
        for (let i = 0; i < 7; i++) {
           const d = new Date(sevenDaysAgo);
           d.setDate(sevenDaysAgo.getDate() + i);
           const dateStr = d.toISOString().split('T')[0];
           const cals = caloriesByDate[dateStr] || 0;
           const percentage = Math.min(100, (cals / (profile.targetCalories || 2000)) * 100);
           stats.push(percentage);
        }
        setConsistencyHistory(stats);
     } catch (e) {
        console.error("Error fetching weekly stats", e);
     }
  };

  useEffect(() => {
    if (profile.preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile.preferences.darkMode]);

  const handleGuestContinue = () => {
     setIsGuest(true);
     setCurrentView('ONBOARDING');
  };

  const checkAchievements = async (log: DayLog, currentProfile: UserProfile) => {
     const unlockedIds = new Set(currentProfile.preferences.unlockedAwards || []);
     const newUnlocks: AchievementDef[] = [];

     ALL_ACHIEVEMENTS.forEach(ach => {
        if (!unlockedIds.has(ach.id)) {
           if (ach.condition(log, currentProfile)) {
              newUnlocks.push(ach);
              unlockedIds.add(ach.id);
           }
        }
     });

     if (newUnlocks.length > 0) {
        setJustUnlockedAchievement(newUnlocks[0]);
        if (typeof navigator.vibrate === 'function') {
           navigator.vibrate([100, 50, 100]); 
        }

        const updatedPrefs = { 
           ...currentProfile.preferences, 
           unlockedAwards: Array.from(unlockedIds) 
        };
        setProfile(p => ({ ...p, preferences: updatedPrefs }));

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user?.id) {
           await supabase.from('profiles').update({ preferences: updatedPrefs }).eq('id', currentSession.user.id);
        }
     }
  };

  const handleAuthSuccess = async () => {
    const { data: { session: newSession } } = await supabase.auth.getSession();
    
    if (newSession?.user?.id) {
       const { data: profileData } = await supabase
            .from('profiles')
            .select('has_onboarded, is_premium')
            .eq('id', newSession.user.id)
            .single();

       if (profileData?.has_onboarded) {
          setProfile(p => ({ ...p, hasOnboarded: true, isPremium: profileData.is_premium }));
          setCurrentView(profileData.is_premium ? 'DASHBOARD' : 'PAYWALL');
       } else {
          setCurrentView('ONBOARDING');
       }
    } else {
       // Fallback if session isn't ready immediately but auth happened
       setCurrentView('PAYWALL'); 
    }
  };

  const handleSubscribe = async () => {
    if (isGuest) {
        setProfile(p => ({ ...p, isPremium: true }));
        setCurrentView('DASHBOARD');
        return;
    }
    if (session?.user?.id) {
        await supabase.from('profiles').update({ is_premium: true }).eq('id', session.user.id);
    }
    setProfile(p => ({ ...p, isPremium: true }));
    setCurrentView('DASHBOARD');
  };

  const handleOnboardingComplete = async () => {
    const finalProfile = calculateMacros(profile);
    
    if (isGuest) {
       setProfile({ ...finalProfile, hasOnboarded: true });
       setCurrentView('PAYWALL');
       return;
    }

    if (session?.user?.id) {
       const { error } = await supabase.from('profiles').upsert({
         id: session.user.id,
         name: finalProfile.name,
         age: finalProfile.age,
         gender: finalProfile.gender,
         height: finalProfile.height,
         weight: finalProfile.weight,
         goal: finalProfile.goal,
         activity_level: finalProfile.activityLevel,
         targets: {
            targetCalories: finalProfile.targetCalories,
            targetProtein: finalProfile.targetProtein,
            targetCarbs: finalProfile.targetCarbs,
            targetFat: finalProfile.targetFat,
            targetFiber: finalProfile.targetFiber,
            targetSugar: finalProfile.targetSugar,
            maxSodium: finalProfile.maxSodium,
            maxCholesterol: finalProfile.maxCholesterol
         },
         preferences: finalProfile.preferences,
         has_onboarded: true,
         updated_at: new Date()
       });
       
       if (error) {
          console.error('Error saving profile:', error);
       }
    }

    setProfile({ ...finalProfile, hasOnboarded: true });
    setCurrentView('PAYWALL');
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(INITIAL_PROFILE);
    setCurrentView('AUTH');
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setCapturedImage(base64String);
        setCurrentView('CAMERA'); // Shows ProcessingView because isAnalyzing becomes true
        setIsAnalyzing(true);
        
        try {
            const result = await analyzeFoodImage(base64String);
            setAnalysisResult(result);
            setEditForm(result); 
            setIsAnalyzing(false);
            setCurrentView('REVIEW');
        } catch (e) {
            console.error(e);
            setIsAnalyzing(false);
            alert("Analysis failed. Please try again.");
            setCurrentView('DASHBOARD');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFood = async () => {
    if (!editForm) return;

    const newFood: FoodLogItem = {
      id: Date.now().toString(),
      name: editForm.foodName,
      calories: editForm.calories,
      protein: editForm.protein,
      carbs: editForm.carbs,
      fat: editForm.fat,
      fiber: editForm.fiber,
      sugar: editForm.sugar,
      sodium: editForm.sodium,
      cholesterol: editForm.cholesterol,
      timestamp: Date.now(),
      mealType: 'Snack', // Default, could be improved with user selection
      imageUrl: capturedImage || undefined,
      confidence: editForm.confidence
    };

    const newItems = [newFood, ...todayLog.items];
    const newLog = { ...todayLog, items: newItems };
    setTodayLog(newLog);

    if (!isGuest && session?.user?.id) {
       await supabase.from('food_logs').insert({
          user_id: session.user.id,
          date: selectedDate,
          meal_type: newFood.mealType,
          name: newFood.name,
          calories: newFood.calories,
          protein: newFood.protein,
          carbs: newFood.carbs,
          fat: newFood.fat,
          fiber: newFood.fiber,
          sugar: newFood.sugar,
          sodium: newFood.sodium,
          cholesterol: newFood.cholesterol,
          confidence: newFood.confidence,
          image_url: capturedImage
       });
    }

    checkAchievements(newLog, profile);
    
    // Trigger confetti
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    setCurrentView('DASHBOARD');
    setCapturedImage(null);
    setAnalysisResult(null);
    setEditForm(null);
  };

  const handleAddWater = async (amount: number) => {
     const newTotal = todayLog.waterIntake + amount;
     const newLog = { ...todayLog, waterIntake: newTotal };
     setTodayLog(newLog);

     if (!isGuest && session?.user?.id) {
        await supabase.from('water_logs').insert({
           user_id: session.user.id,
           date: selectedDate,
           amount: amount
        });
     }
     
     checkAchievements(newLog, profile);
  };

  const renderView = () => {
    // If analyzing image, show Processing View
    if (currentView === 'CAMERA' && isAnalyzing) {
       return <ProcessingView image={capturedImage} />;
    }

    switch (currentView) {
      case 'AUTH':
        return <AuthView onSuccess={handleAuthSuccess} onSkip={handleGuestContinue} profile={profile} setProfile={setProfile} />;
      case 'ONBOARDING':
        return <OnboardingStep profile={profile} setProfile={setProfile} onComplete={handleOnboardingComplete} isLoading={false} />;
      case 'PAYWALL':
        return <Paywall onSubscribe={handleSubscribe} />;
      case 'REVIEW':
         if (!editForm) return null;
         return (
            <div className="min-h-screen bg-[#F2F2F7] dark:bg-black p-6 pb-24 font-sans">
               <div className="max-w-md mx-auto space-y-6">
                  <div className="relative rounded-[32px] overflow-hidden shadow-lg h-64 border border-gray-200 dark:border-gray-800">
                     <img src={capturedImage || ''} alt="Captured food" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                     <div className="absolute bottom-4 left-4 right-4">
                        <input 
                           value={editForm.foodName}
                           onChange={e => setEditForm({...editForm, foodName: e.target.value})}
                           className="text-3xl font-bold text-white bg-transparent border-none outline-none w-full placeholder-white/50 drop-shadow-md"
                           placeholder="Food Name"
                        />
                     </div>
                  </div>

                  <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-10">
                     <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity size={20} className="text-[#007AFF]" /> Nutritional Info
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-black p-4 rounded-2xl">
                           <label className="text-xs text-gray-500 font-bold uppercase">Calories</label>
                           <input 
                              type="number" 
                              value={editForm.calories} 
                              onChange={e => setEditForm({...editForm, calories: parseInt(e.target.value) || 0})}
                              className="text-2xl font-black text-[#007AFF] bg-transparent w-full outline-none" 
                           />
                        </div>
                        <div className="bg-gray-50 dark:bg-black p-4 rounded-2xl">
                           <label className="text-xs text-gray-500 font-bold uppercase">Protein (g)</label>
                           <input 
                              type="number" 
                              value={editForm.protein} 
                              onChange={e => setEditForm({...editForm, protein: parseInt(e.target.value) || 0})}
                              className="text-2xl font-black text-[#34C759] bg-transparent w-full outline-none" 
                           />
                        </div>
                        <div className="bg-gray-50 dark:bg-black p-4 rounded-2xl">
                           <label className="text-xs text-gray-500 font-bold uppercase">Carbs (g)</label>
                           <input 
                              type="number" 
                              value={editForm.carbs} 
                              onChange={e => setEditForm({...editForm, carbs: parseInt(e.target.value) || 0})}
                              className="text-2xl font-black text-[#FF9500] bg-transparent w-full outline-none" 
                           />
                        </div>
                        <div className="bg-gray-50 dark:bg-black p-4 rounded-2xl">
                           <label className="text-xs text-gray-500 font-bold uppercase">Fat (g)</label>
                           <input 
                              type="number" 
                              value={editForm.fat} 
                              onChange={e => setEditForm({...editForm, fat: parseInt(e.target.value) || 0})}
                              className="text-2xl font-black text-[#FF2D55] bg-transparent w-full outline-none" 
                           />
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                     <Button variant="secondary" onClick={() => setCurrentView('DASHBOARD')} className="flex-1 py-4">Discard</Button>
                     <Button onClick={handleSaveFood} className="flex-[2] py-4 bg-[#007AFF] text-white shadow-lg shadow-blue-500/30">Save to Journal</Button>
                  </div>
               </div>
            </div>
         );
      case 'DASHBOARD':
        // Calculate remaining calories
        const totalCalories = todayLog.items.reduce((acc, item) => acc + item.calories, 0);
        const caloriesLeft = profile.targetCalories - totalCalories;
        
        return (
          <div className="h-full pb-24 bg-[#F2F2F7] dark:bg-black overflow-y-auto transition-colors duration-500 font-sans">
            <WeekCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            
            <div className="p-5 space-y-6">
               {/* Hero Card - Classic Version Remake */}
               <div className="w-full bg-[#053F36] rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden font-sans">
                  {/* Background Effects */}
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#0d5e52_0%,_#053F36_100%)]"></div>
                  
                  {/* Subtle Particles/Stars */}
                  {[...Array(6)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute rounded-full bg-white/20 blur-[1px]"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            width: `${Math.random() * 4 + 2}px`,
                            height: `${Math.random() * 4 + 2}px`,
                            opacity: Math.random() * 0.5 + 0.2
                        }}
                    ></div>
                  ))}

                  <div className="relative z-10">
                      {/* Top Section: Stats & Ring */}
                      <div className="flex justify-between items-center mb-10 mt-2">
                         {/* Eaten */}
                         <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-3xl font-bold tracking-tight">{totalCalories}</span>
                            <span className="text-[10px] font-bold text-emerald-100/60 tracking-widest uppercase mt-1">Eaten</span>
                         </div>

                         {/* Central Ring */}
                         <div className="relative w-44 h-44 flex items-center justify-center -my-4">
                             {/* Glow behind ring */}
                             <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl"></div>
                             
                             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                                {/* Track */}
                                <circle cx="100" cy="100" r="84" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
                                {/* Progress */}
                                <circle 
                                    cx="100" cy="100" r="84" 
                                    stroke="white" 
                                    strokeWidth="12" 
                                    fill="none" 
                                    strokeDasharray={2 * Math.PI * 84}
                                    strokeDashoffset={2 * Math.PI * 84 * (1 - Math.min(1, (caloriesLeft / profile.targetCalories)))} 
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out shadow-[0_0_10px_white]"
                                    style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.9))" }}
                                />
                             </svg>
                             <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                                 <span className="text-5xl font-bold tracking-tighter drop-shadow-lg text-white">{Math.max(0, caloriesLeft)}</span>
                                 <span className="text-[10px] font-bold text-emerald-100/60 tracking-widest uppercase mt-1">Kcal Left</span>
                             </div>
                         </div>

                         {/* Burned */}
                         <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-3xl font-bold tracking-tight">0</span>
                            <span className="text-[10px] font-bold text-emerald-100/60 tracking-widest uppercase mt-1">Burned</span>
                         </div>
                      </div>

                      {/* Divider Line */}
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full mb-6"></div>

                      {/* Macros Section */}
                      <div className="grid grid-cols-3 gap-8 px-2">
                          {/* Carbs */}
                          <div className="flex flex-col gap-3">
                              <span className="text-[10px] font-bold text-emerald-100/60 tracking-widest uppercase text-center">Carbs</span>
                              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                                    style={{ width: `${Math.min(100, (todayLog.items.reduce((a,i)=>a+i.carbs,0) / profile.targetCarbs) * 100)}%` }}
                                  ></div>
                              </div>
                              <span className="text-xs font-bold text-center tracking-wide">
                                {Math.round(todayLog.items.reduce((a,i)=>a+i.carbs,0))} / {profile.targetCarbs}g
                              </span>
                          </div>

                          {/* Protein */}
                          <div className="flex flex-col gap-3">
                              <span className="text-[10px] font-bold text-emerald-100/60 tracking-widest uppercase text-center">Protein</span>
                              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                                    style={{ width: `${Math.min(100, (todayLog.items.reduce((a,i)=>a+i.protein,0) / profile.targetProtein) * 100)}%` }}
                                  ></div>
                              </div>
                              <span className="text-xs font-bold text-center tracking-wide">
                                {Math.round(todayLog.items.reduce((a,i)=>a+i.protein,0))} / {profile.targetProtein}g
                              </span>
                          </div>

                          {/* Fat */}
                          <div className="flex flex-col gap-3">
                              <span className="text-[10px] font-bold text-emerald-100/60 tracking-widest uppercase text-center">Fat</span>
                              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                                    style={{ width: `${Math.min(100, (todayLog.items.reduce((a,i)=>a+i.fat,0) / profile.targetFat) * 100)}%` }}
                                  ></div>
                              </div>
                              <span className="text-xs font-bold text-center tracking-wide">
                                {Math.round(todayLog.items.reduce((a,i)=>a+i.fat,0))} / {profile.targetFat}g
                              </span>
                          </div>
                      </div>
                  </div>
               </div>
               
               {/* Water Tracker */}
               <WaterTracker intake={todayLog.waterIntake} onAdd={handleAddWater} />

               {/* Meal Lists - Grouped */}
               <div className="space-y-6 pb-4">
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type, groupIdx) => {
                     const meals = todayLog.items.filter(i => i.mealType === type);
                     if (meals.length === 0) return null;

                     return (
                        <div key={type} className="animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">{type}</h3>
                           <div className="space-y-3">
                              {meals.map((item, idx) => (
                                 <Card key={item.id} className="flex items-center gap-4 p-4 active:scale-[0.99] transition-transform dark:bg-[#1C1C1E] dark:border-gray-800 animate-slide-in-right" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm relative group">
                                       {item.imageUrl ? (
                                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                       ) : (
                                          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <h4 className="font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                                       <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 flex gap-2">
                                          <span>{item.calories} kcal</span>
                                          <span className="w-1 h-1 bg-gray-300 rounded-full self-center"></span>
                                          <span>{item.protein}g protein</span>
                                       </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                                       <ChevronRight size={16} className="text-gray-400" />
                                    </div>
                                 </Card>
                              ))}
                           </div>
                        </div>
                     );
                  })}
                  
                  {todayLog.items.length === 0 && (
                     <div className="text-center py-12 opacity-60">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                           <Utensils className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No meals logged today</p>
                        <Button 
                           variant="ghost" 
                           onClick={handleCameraClick}
                           className="mt-2 text-[#007AFF] font-semibold"
                        >
                           Tap + to add meal
                        </Button>
                     </div>
                  )}
               </div>
            </div>
          </div>
        );
      case 'PROGRESS':
        return <ProgressDashboard log={todayLog} profile={profile} />;
      case 'AWARDS':
        return <AwardsView profile={profile} />;
      case 'PROFILE':
        return (
         <PremiumProfileView 
            profile={profile} 
            weeklyStats={consistencyHistory} 
            onUpdate={(updated) => setProfile(updated)} // Would also update DB in real app
            onLogout={handleLogout}
         />
        );
      default:
        return null;
    }
  };

  return (
    <>
       <Confetti active={showConfetti} />
       
       <AchievementUnlockModal 
         achievement={justUnlockedAchievement} 
         onClose={() => setJustUnlockedAchievement(null)} 
       />

       {renderView()}

       {currentView !== 'AUTH' && currentView !== 'ONBOARDING' && currentView !== 'PAYWALL' && (
         <Navigation 
           currentView={currentView} 
           onNavigate={setCurrentView} 
           onCameraClick={handleCameraClick} 
         />
       )}
       
       {/* Hidden File Input for Camera */}
       <input 
         type="file" 
         accept="image/*" 
         capture="environment" 
         ref={fileInputRef} 
         className="hidden" 
         onChange={handleFileChange}
       />
    </>
  );
};

export default App;