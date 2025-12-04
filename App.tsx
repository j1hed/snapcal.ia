import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Utensils, Award, ChevronRight, Settings, Droplets, Plus, Minus, Bell, Moon, Smartphone, Flame, Carrot, Pizza, Apple, CheckCircle2, Lock, Sparkles, LogOut, User as UserIcon, Loader2, Mail, Lock as LockIcon, Eye, EyeOff, ArrowRight, ScanLine, Activity, Zap, Ruler, Weight, Target, Footprints, Trophy } from 'lucide-react';
import { Button } from './components/Button';
import { Navigation } from './components/Navigation';
import { Card } from './components/Card';
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
    healthSync: false
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

const LiquidProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div 
        className="absolute top-0 left-0 h-full bg-[#007AFF] transition-all duration-700 ease-out"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-shimmer" />
      </div>
    </div>
  );
};

const ParticleSystem: React.FC = () => {
  // Generate random particles
  const particles = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${3 + Math.random() * 4}s`
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-1.5 h-1.5 bg-white/40 rounded-full blur-[1px]"
          style={{
            left: p.left,
            top: p.top,
            animation: `float-particle ${p.duration} ease-in-out infinite`,
            animationDelay: p.delay
          }}
        />
      ))}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) scale(0); opacity: 0; }
          50% { transform: translateY(-20px) scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

const MorphingFoodIcon: React.FC = () => {
  const [index, setIndex] = useState(0);
  const icons = [Utensils, Pizza, Apple, Carrot];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % icons.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];

  return (
    <div className="relative w-20 h-20">
      {icons.map((Icon, i) => (
         <div 
            key={i} 
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 transform ${
               i === index ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-180'
            }`}
         >
             <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-blue-900/50">
                <Icon className="text-white w-10 h-10" />
             </div>
         </div>
      ))}
    </div>
  );
};

const AuroraBackground: React.FC = () => (
  <div className="absolute inset-0 bg-black z-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-black opacity-90"></div>
    <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[80%] bg-blue-600/20 blur-[100px] animate-aurora rounded-full mix-blend-screen pointer-events-none"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[60%] bg-purple-600/20 blur-[100px] animate-aurora-rev rounded-full mix-blend-screen pointer-events-none"></div>
  </div>
);

// --- Sub-components ---

const SemiCircleGauge: React.FC<{ 
  current: number; 
  max: number; 
  label: string; 
  color: string; 
  subLabel: string;
}> = ({ current, max, label, color, subLabel }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  
  return (
    <div className="flex flex-col items-center bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 w-full shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800 transform transition-all duration-200 active:scale-95 group hover:shadow-md">
       <div className="relative w-24 h-14 overflow-hidden mb-1">
          <svg viewBox="0 0 100 55" className="absolute top-0 left-0 w-full h-full">
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f3f4f6" className="dark:stroke-gray-700" strokeWidth="8" strokeLinecap="round" />
            <path 
               d="M 10 50 A 40 40 0 0 1 90 50" 
               fill="none" 
               stroke={color} 
               strokeWidth="8" 
               strokeLinecap="round" 
               strokeDasharray="126" 
               strokeDashoffset={126 - (126 * percentage / 100)}
               className="transition-all duration-1000 ease-out group-hover:stroke-width-9"
            />
          </svg>
          <div className="absolute bottom-0 left-0 w-full text-center mb-1">
             <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(current)}g</span>
             <span className="text-[10px] text-gray-400 block font-medium">{subLabel}</span>
          </div>
       </div>
       <span className="text-sm font-semibold text-center" style={{ color }}>{label}</span>
    </div>
  );
};

const NutrientBar: React.FC<{
   label: string;
   current: number;
   max: number;
   unit: string;
   type?: 'target' | 'limit';
   color?: string;
}> = ({ label, current, max, unit, type = 'target', color }) => {
   const percentage = Math.min(100, (current / max) * 100);
   const isOver = current > max;
   
   let barColor = color || (type === 'target' ? '#34C759' : '#FF9500'); 
   if (type === 'limit' && isOver) barColor = '#FF3B30';

   const remaining = max - current;
   const statusText = type === 'limit' 
      ? (remaining >= 0 ? `${Math.round(remaining)}${unit} left` : `${Math.round(Math.abs(remaining))}${unit} over`)
      : (remaining > 0 ? `${Math.round(remaining)}${unit} left` : `${Math.round(Math.abs(remaining))}${unit} over`);

   const statusPercent = Math.round((current / max) * 100);

   return (
     <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-full transform transition-all duration-200 active:scale-95 group">
        <div className="flex justify-between items-start mb-3">
           <span className="font-semibold text-gray-700 dark:text-gray-200 text-[15px]">{label}</span>
           <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
        </div>
        
        <div>
           <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                style={{ width: `${percentage}%`, backgroundColor: barColor }}
              >
                 <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
              </div>
           </div>
           <div className="flex justify-between items-end">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{statusText}</span>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{statusPercent}%</span>
           </div>
        </div>
     </div>
   );
};

const WaterTracker: React.FC<{ 
  intake: number; 
  onAdd: (amount: number) => void; 
}> = ({ intake, onAdd }) => {
  const goal = 2500; // ml
  const percentage = Math.min(100, (intake / goal) * 100);

  return (
    <Card className="p-5 overflow-hidden relative dark:bg-[#1C1C1E] dark:border-gray-800" isPressable>
      {/* Background Wave Animation */}
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

const AwardsView: React.FC = () => {
   const achievements = [
      { id: 1, title: 'Early Bird', desc: 'Log breakfast before 9 AM', locked: false, icon: '🌅' },
      { id: 2, title: 'Hydration Hero', desc: 'Drink 2500ml of water', locked: true, icon: '💧' },
      { id: 3, title: 'Protein Power', desc: 'Hit protein goal 3 days', locked: true, icon: '💪' },
      { id: 4, title: 'Green Giant', desc: 'Log 5 types of veggies', locked: true, icon: '🥦' },
      { id: 5, title: 'Streak Master', desc: 'Log for 7 days in a row', locked: true, icon: '🔥' },
      { id: 6, title: 'Night Owl', desc: 'Log a snack after 8 PM', locked: false, icon: '🦉' },
   ];

   return (
      <div className="h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-24 transition-colors duration-500">
         <div className="bg-[#F2F2F7]/95 dark:bg-black/95 pt-safe px-5 pb-4 sticky top-0 z-40 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
            <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight mt-2">Awards</h1>
         </div>
         
         <div className="px-5 mt-4 space-y-8">
            {/* Virtual Coach */}
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

            {/* Achievement Museum */}
            <div>
               <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Achievement Museum <Sparkles size={18} className="text-yellow-500" />
               </h2>
               <div className="grid grid-cols-2 gap-4">
                  {achievements.map((ach) => (
                     <div key={ach.id} className="group perspective-1000 h-40 cursor-pointer">
                        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d group-hover:rotate-y-180`}>
                           {/* Front */}
                           <div className={`absolute inset-0 backface-hidden rounded-2xl p-4 flex flex-col items-center justify-center border shadow-sm dark:bg-[#1C1C1E] dark:border-gray-800 ${ach.locked ? 'bg-gray-100 border-gray-200 dark:bg-[#1C1C1E] dark:border-gray-800' : 'bg-white border-yellow-100 shadow-yellow-100/50'}`}>
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-sm ${ach.locked ? 'bg-gray-200 dark:bg-gray-700 grayscale opacity-50' : 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50'}`}>
                                 {ach.locked ? <Lock size={24} className="text-gray-400" /> : ach.icon}
                              </div>
                              <span className={`font-bold text-sm text-center ${ach.locked ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{ach.title}</span>
                           </div>
                           
                           {/* Back */}
                           <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#007AFF] rounded-2xl p-4 flex flex-col items-center justify-center text-white shadow-lg">
                              <p className="text-center text-sm font-medium leading-relaxed">{ach.desc}</p>
                              {ach.locked ? (
                                 <div className="mt-2 px-3 py-1 bg-black/20 rounded-full text-xs font-bold">LOCKED</div>
                              ) : (
                                 <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12}/> UNLOCKED</div>
                              )}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
         <style>{`
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .rotate-y-180 { transform: rotateY(180deg); }
            .group-hover\\:rotate-y-180:hover { transform: rotateY(180deg); }
         `}</style>
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

const PremiumProfileView: React.FC<{ 
  profile: UserProfile; 
  onUpdate: (p: UserProfile) => void;
  onLogout: () => void;
}> = ({ profile, onUpdate, onLogout }) => {
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

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleTogglePref = (key: keyof typeof profile.preferences) => {
    const newPrefs = { ...profile.preferences, [key]: !profile.preferences[key] };
    onUpdate({ ...profile, preferences: newPrefs });
  };

  // Calculations for Donut Chart
  const totalMacros = profile.targetProtein + profile.targetCarbs + profile.targetFat;
  const pPct = (profile.targetProtein / totalMacros) * 100;
  const cPct = (profile.targetCarbs / totalMacros) * 100;
  const fPct = (profile.targetFat / totalMacros) * 100;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  
  const pDash = (pPct / 100) * circumference;
  const cDash = (cPct / 100) * circumference;
  const fDash = (fPct / 100) * circumference;

  return (
    <div className="h-full bg-gray-50 dark:bg-black overflow-y-auto pb-24 transition-colors duration-500 font-sans">
      
      {/* 1. Hero Header */}
      <div className={`pt-safe pb-8 px-6 rounded-b-[40px] bg-gradient-to-br ${getGradient()} shadow-sm relative overflow-hidden transition-colors duration-1000`}>
        {/* Animated Background Elements */}
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
             <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#007AFF] animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          </div>

          <h1 className="mt-4 text-3xl font-bold font-serif text-gray-900 dark:text-white tracking-tight">{profile.name || 'Guest User'}</h1>
          
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${profile.isPremium ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-200 text-gray-600'}`}>
              {profile.isPremium ? 'Premium Member' : 'Free Plan'}
            </span>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800">
               <Flame size={12} fill="currentColor" />
               <span>12 Day Streak</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-8">
        
        {/* 2. Health Stats Dashboard */}
        <div className="grid grid-cols-2 gap-4">
           {/* Calorie Mastery */}
           <div className="col-span-1 bg-white dark:bg-[#1C1C1E] p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity size={40} />
              </div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Consistency</h3>
              <div className="relative w-20 h-20 mx-auto mb-4">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-gray-800" fill="none" />
                   <circle cx="40" cy="40" r="36" stroke="#34C759" strokeWidth="6" strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * 0.15} strokeLinecap="round" fill="none" className="transition-all duration-1000 shadow-[0_0_10px_#34C759]" />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white">85%</div>
              </div>
              {/* Daily Bars */}
              <div className="flex justify-between items-end h-8 px-1">
                 {[40, 70, 50, 90, 85, 30, 80].map((h, i) => (
                    <div key={i} className="w-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden h-full flex items-end">
                       <div className="w-full bg-[#34C759] rounded-full transition-all duration-700 delay-100" style={{ height: `${h}%` }}></div>
                    </div>
                 ))}
              </div>
              <p className="text-center text-xs text-gray-500 mt-2 font-medium">Last 7 Days</p>
           </div>

           {/* Nutrient Balance (SVG Donut) */}
           <div className="col-span-1 bg-white dark:bg-[#1C1C1E] p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 dark:border-gray-800 relative overflow-hidden">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Target Split</h3>
               <div className="relative w-24 h-24 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                     <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-gray-100 dark:stroke-gray-800" />
                     {/* Protein */}
                     <circle cx="40" cy="40" r={radius} fill="none" stroke="#FF2D55" strokeWidth="8" strokeDasharray={`${pDash} ${circumference}`} strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
                     {/* Carbs */}
                     <circle cx="40" cy="40" r={radius} fill="none" stroke="#FF9500" strokeWidth="8" strokeDasharray={`${cDash} ${circumference}`} strokeDashoffset={-pDash} className="transition-all duration-1000 ease-out delay-100" />
                     {/* Fat */}
                     <circle cx="40" cy="40" r={radius} fill="none" stroke="#007AFF" strokeWidth="8" strokeDasharray={`${fDash} ${circumference}`} strokeDashoffset={-(pDash + cDash)} className="transition-all duration-1000 ease-out delay-200" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <span className="text-[10px] font-bold text-gray-400">TARGET</span>
                  </div>
               </div>
               
               {/* Legend */}
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

        {/* 3. Personal Records */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
           <div 
             className="p-5 flex justify-between items-center cursor-pointer active:bg-gray-50 dark:active:bg-[#2C2C2E]"
             onClick={() => toggleSection('records')}
           >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                    <Trophy size={20} />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Personal Records</h3>
                    <p className="text-xs text-gray-500">3 New Records</p>
                 </div>
              </div>
              <ChevronRight size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSection === 'records' ? 'rotate-90' : ''}`} />
           </div>
           
           {expandedSection === 'records' && (
              <div className="px-5 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-300">
                 {[
                    { title: "Longest Streak", value: "14 Days", icon: "🔥", date: "Oct 12" },
                    { title: "Most Protein", value: "180g", icon: "💪", date: "Oct 10" },
                    { title: "Lowest Weight", value: "68kg", icon: "⚖️", date: "Sep 28" }
                 ].map((rec, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] border border-gray-100 dark:border-gray-700">
                       <div className="flex items-center gap-3">
                          <span className="text-xl">{rec.icon}</span>
                          <div>
                             <div className="font-semibold text-gray-900 dark:text-white text-sm">{rec.title}</div>
                             <div className="text-xs text-gray-500">{rec.date}</div>
                          </div>
                       </div>
                       <div className="font-bold text-[#007AFF]">{rec.value}</div>
                    </div>
                 ))}
              </div>
           )}
        </div>

        {/* 4. Activity Timeline */}
        <div>
           <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-white mb-4 px-1">Activity Feed</h3>
           <div className="relative pl-4 space-y-6 before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200 dark:before:bg-gray-800">
              {[
                 { time: "Today, 9:41 AM", title: "Logged Breakfast", subtitle: "Oatmeal & Berries • 340 kcal", icon: <Utensils size={14} className="text-white"/>, color: "bg-[#007AFF]" },
                 { time: "Yesterday", title: "Goal Reached", subtitle: "Hit Protein Goal (150g)", icon: <Target size={14} className="text-white"/>, color: "bg-[#34C759]" },
                 { time: "Oct 24", title: "Weight Update", subtitle: "70.5 kg (-0.5kg)", icon: <Weight size={14} className="text-white"/>, color: "bg-[#FF9500]" },
              ].map((item, i) => (
                 <div key={i} className="relative pl-8 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className={`absolute left-0 top-1 w-10 h-10 rounded-full ${item.color} flex items-center justify-center border-4 border-gray-50 dark:border-black shadow-sm z-10`}>
                       {item.icon}
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                       <div className="text-xs text-gray-400 font-medium mb-1">{item.time}</div>
                       <div className="font-bold text-gray-900 dark:text-white">{item.title}</div>
                       <div className="text-sm text-gray-500 dark:text-gray-400">{item.subtitle}</div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* 6. Settings List */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-white px-1">Preferences</h3>
           <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
              <Switch 
                  label="Notifications" 
                  checked={profile.preferences?.notifications} 
                  onChange={() => handleTogglePref('notifications')}
                  icon={<Bell size={18} />}
                  iconBgColor="bg-red-100 dark:bg-red-900/20"
                  iconColor="text-red-600 dark:text-red-400"
              />
              <Switch 
                  label="Dark Mode" 
                  checked={profile.preferences?.darkMode} 
                  onChange={() => handleTogglePref('darkMode')}
                  icon={<Moon size={18} />}
                  iconBgColor="bg-purple-100 dark:bg-purple-900/20"
                  iconColor="text-purple-600 dark:text-purple-400"
              />
              <Switch 
                  label="Apple Health Sync" 
                  checked={profile.preferences?.healthSync} 
                  onChange={() => handleTogglePref('healthSync')}
                  icon={<Activity size={18} />}
                  iconBgColor="bg-pink-100 dark:bg-pink-900/20"
                  iconColor="text-pink-600 dark:text-pink-400"
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
  isLoading?: boolean;
}> = ({ profile, setProfile, onComplete, isLoading }) => {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
    else onComplete();
  };

  const update = (key: keyof UserProfile, value: any) => {
    setProfile({ ...profile, [key]: value });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-between pt-safe pb-10">
      <AuroraBackground />
      
      <div className="relative z-10 flex-1 px-6 flex flex-col mt-4">
        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {[0, 1, 2, 3].map(i => (
             <div key={i} className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className={`h-full bg-[#007AFF] shadow-[0_0_10px_#007AFF] transition-all duration-500 ease-out ${i <= step ? 'w-full' : 'w-0'}`}
                />
             </div>
          ))}
        </div>

        {/* Header */}
        <div className="space-y-2 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <span className="text-[#007AFF] font-bold text-xs tracking-widest uppercase glow-text">Step {step + 1} / 4</span>
           <h1 className="text-4xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
             {step === 0 && "Tell us about yourself"}
             {step === 1 && "Your body stats"}
             {step === 2 && "Main goal?"}
             {step === 3 && "Activity level"}
           </h1>
        </div>

        {/* Content Container */}
        <div className="flex-1">
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
               {/* Gender */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex shadow-xl">
                {Object.values(Gender).map(g => (
                  <button 
                    key={g}
                    onClick={() => update('gender', g)}
                    className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${profile.gender === g ? 'bg-white/20 text-white shadow-lg backdrop-blur-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                 <label className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1">First Name</label>
                 <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                      type="text" 
                      value={profile.name} 
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your Name"
                      className="w-full pl-12 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-xl text-white font-semibold focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder-gray-600"
                    />
                 </div>
              </div>

              {/* Age Input */}
              <div className="space-y-2">
                 <label className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1">Age</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors font-bold text-lg">#</div>
                    <input 
                      type="number" 
                      value={profile.age} 
                      onChange={(e) => update('age', parseInt(e.target.value))}
                      className="w-full pl-12 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-xl text-white font-semibold focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder-gray-600"
                    />
                 </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
               {/* Height */}
               <div className="space-y-2">
                 <label className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1">Height (cm)</label>
                 <div className="relative group">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                      type="number" 
                      value={profile.height} 
                      onChange={(e) => update('height', parseInt(e.target.value))}
                      className="w-full pl-12 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-3xl text-white font-bold focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all text-center"
                    />
                 </div>
               </div>

               {/* Weight */}
               <div className="space-y-2">
                 <label className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1">Weight (kg)</label>
                 <div className="relative group">
                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                      type="number" 
                      value={profile.weight} 
                      onChange={(e) => update('weight', parseInt(e.target.value))}
                      className="w-full pl-12 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-3xl text-white font-bold focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all text-center"
                    />
                 </div>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
              {Object.values(Goal).map((g, idx) => (
                <button 
                  key={g}
                  onClick={() => update('goal', g)}
                  className={`w-full text-left p-6 rounded-3xl border transition-all duration-300 transform active:scale-95 group relative overflow-hidden ${profile.goal === g ? 'bg-gradient-to-r from-blue-600/30 to-blue-400/10 border-blue-500/50 shadow-[0_0_30px_rgba(0,122,255,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-2xl shadow-inner ${profile.goal === g ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                     {idx === 0 ? '🔥' : idx === 1 ? '⚖️' : '💪'}
                  </div>
                  <span className={`text-xl font-bold block ${profile.goal === g ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{g}</span>
                  <p className="text-gray-500 text-sm mt-1">
                     {idx === 0 ? 'Burn fat & get lean' : idx === 1 ? 'Stay healthy & fit' : 'Build strength & size'}
                  </p>
                  {profile.goal === g && (
                     <div className="absolute top-6 right-6 text-blue-400 animate-in zoom-in duration-300">
                        <CheckCircle2 size={24} fill="currentColor" className="text-white" />
                     </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
              {Object.values(ActivityLevel).map((l, idx) => (
                <button 
                  key={l}
                  onClick={() => update('activityLevel', l)}
                  className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all duration-300 transform active:scale-95 ${profile.activityLevel === l ? 'bg-gradient-to-r from-blue-600/30 to-blue-400/10 border-blue-500/50 shadow-[0_0_30px_rgba(0,122,255,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${profile.activityLevel === l ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                      {idx === 0 ? '🪑' : idx === 1 ? '🚶' : idx === 2 ? '🏃' : '⚡️'}
                   </div>
                   <div className="text-left">
                     <span className={`text-lg font-bold block ${profile.activityLevel === l ? 'text-white' : 'text-gray-400'}`}>{l}</span>
                     <span className="text-xs text-gray-500">
                        {idx === 0 ? 'Little to no exercise' : idx === 1 ? 'Light exercise 1-3 days/wk' : idx === 2 ? 'Moderate exercise 3-5 days/wk' : 'Hard exercise 6-7 days/wk'}
                     </span>
                   </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 relative z-10">
        <Button 
           onClick={nextStep} 
           fullWidth 
           disabled={isLoading}
           className="h-16 text-lg font-bold bg-white text-black hover:bg-gray-100 border-none shadow-[0_0_30px_rgba(255,255,255,0.15)] rounded-2xl"
        >
          {isLoading ? <Loader2 className="animate-spin w-6 h-6 mx-auto"/> : (step === 3 ? "Complete Profile" : "Continue")}
        </Button>
      </div>
    </div>
  );
};

const Paywall: React.FC<{ onSubscribe: () => void }> = ({ onSubscribe }) => {
  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center justify-between pb-safe pt-safe">
      <div className="absolute inset-0 opacity-50">
        <img src="https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2070&auto=format&fit=crop" alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
      </div>

      <div className="relative z-10 w-full px-6 mt-12 flex justify-end">
         <button className="text-gray-400 font-medium text-sm">Restore</button>
      </div>

      <div className="relative z-10 w-full text-center space-y-8 px-6 pb-8">
        <div className="space-y-4">
          <MorphingFoodIcon />
          <h1 className="text-[40px] font-bold tracking-tight leading-tight">SnapCalorie<span className="text-[#007AFF]">AI</span></h1>
          <p className="text-gray-300 text-lg leading-relaxed max-w-xs mx-auto">
            Instant calorie tracking powered by advanced AI. Eat smarter, live better.
          </p>
        </div>

        <div className="space-y-3">
           <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between cursor-pointer active:bg-white/20 active:scale-95 transition-all">
              <div className="text-left">
                <div className="font-semibold text-white">Annual Plan</div>
                <div className="text-xs text-blue-300 font-medium mt-0.5">7 days free, then $59.99/yr</div>
              </div>
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
              </div>
           </div>
        </div>

        <div className="space-y-4 pt-2">
          <Button 
            variant="primary" 
            fullWidth 
            onClick={onSubscribe} 
            className="bg-[#007AFF] hover:bg-blue-600 text-white border-none h-14 text-lg"
          >
            Start Free Trial
          </Button>
          <p className="text-[11px] text-gray-500 max-w-xs mx-auto leading-tight">
            Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
          </p>
        </div>
      </div>
    </div>
  );
};

const ProgressDashboard: React.FC<{ log: DayLog, profile: UserProfile }> = ({ log, profile }) => {
  const totalProtein = log.items.reduce((acc, item) => acc + item.protein, 0);
  const totalCarbs = log.items.reduce((acc, item) => acc + item.carbs, 0);
  const totalFat = log.items.reduce((acc, item) => acc + item.fat, 0);
  const totalFiber = log.items.reduce((acc, item) => acc + (item.fiber || 0), 0);
  const totalSugar = log.items.reduce((acc, item) => acc + (item.sugar || 0), 0);
  const totalSodium = log.items.reduce((acc, item) => acc + (item.sodium || 0), 0);
  const totalCholesterol = log.items.reduce((acc, item) => acc + (item.cholesterol || 0), 0);

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-24 transition-colors duration-500">
      <div className="bg-[#F2F2F7]/95 dark:bg-black/95 pt-safe px-5 pb-2 sticky top-0 z-40 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
         <h1 className="text-[28px] font-bold text-center mt-2 mb-4 text-black dark:text-white">Nutritional Goals</h1>
      </div>

      <div className="px-5 space-y-8 mt-4">
         {/* Macros */}
         <div>
            <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-3">Macronutrient Goals</h2>
            <div className="flex gap-3">
               <SemiCircleGauge current={totalFat} max={profile.targetFat} label="Fat" color="#007AFF" subLabel="left" />
               <SemiCircleGauge current={totalCarbs} max={profile.targetCarbs} label="Carbs" color="#FF9500" subLabel="left" />
               <SemiCircleGauge current={totalProtein} max={profile.targetProtein} label="Protein" color="#FF2D55" subLabel="left" />
            </div>
         </div>

         {/* Target Nutrients */}
         <div>
            <div className="flex justify-between items-baseline mb-3">
               <div>
                  <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">Target Nutrients</h2>
                  <p className="text-gray-500 text-xs">Aim to meet or exceed</p>
               </div>
               <Settings size={20} className="text-gray-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <NutrientBar label="Fiber" current={totalFiber} max={profile.targetFiber} unit="g" type="target" color="#34C759" />
               <NutrientBar label="Protein" current={totalProtein} max={profile.targetProtein} unit="g" type="target" color="#FF2D55" />
            </div>
         </div>

         {/* Limit Nutrients */}
         <div>
            <div className="flex justify-between items-baseline mb-3">
               <div>
                  <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">Limit Nutrients</h2>
                  <p className="text-gray-500 text-xs">Aim to stay near or below</p>
               </div>
               <Settings size={20} className="text-gray-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <NutrientBar label="Added Sugars" current={totalSugar} max={profile.targetSugar} unit="g" type="limit" color="#FF9500" />
               <NutrientBar label="Cholesterol" current={totalCholesterol} max={profile.maxCholesterol} unit="mg" type="limit" color="#FF3B30" />
               <NutrientBar label="Sodium" current={totalSodium} max={profile.maxSodium} unit="mg" type="limit" color="#FF9500" />
               <NutrientBar label="Fat" current={totalFat} max={profile.targetFat} unit="g" type="limit" color="#007AFF" />
            </div>
         </div>
      </div>
    </div>
  );
};

const AuthView: React.FC<{ 
  onSuccess: () => void;
  onSkip: () => void;
  profile: UserProfile; 
  setProfile: (p: UserProfile) => void;
}> = ({ onSuccess, onSkip, profile, setProfile }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    name: profile.name || 'User', // defaults if not filled
                }
            }
        });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center px-6 relative overflow-hidden">
        {/* Background blobs similar to onboarding */}
       <AuroraBackground />

       <div className="relative z-10 w-full max-w-sm mx-auto space-y-8">
         <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
               <Sparkles className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to SnapCalorie</h1>
            <p className="text-gray-400">Your AI-powered nutrition companion</p>
         </div>

         <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-4">
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all"
                    />
                </div>
                <div className="relative group">
                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        minLength={6}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all"
                    />
                </div>
            </div>

            {error && <div className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-lg">{error}</div>}

            <Button 
                type="submit" 
                fullWidth 
                disabled={loading}
                className="bg-[#007AFF] hover:bg-blue-600 text-white border-none h-14 text-lg font-bold shadow-[0_0_20px_rgba(0,122,255,0.3)] mt-2"
            >
                {loading ? <Loader2 className="animate-spin mx-auto"/> : (isLogin ? "Sign In" : "Create Account")}
            </Button>
         </form>

         <div className="text-center space-y-4">
             <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-sm text-gray-400 hover:text-white transition-colors"
             >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
             </button>
             
             <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-2 text-gray-500">Or</span></div>
             </div>

             <button onClick={onSkip} className="text-sm font-semibold text-white hover:text-gray-300 transition-colors">
                Continue as Guest
             </button>
         </div>
       </div>
    </div>
  );
};

const ProcessingView: React.FC<{ image: string | null }> = ({ image }) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
       {image && (
          <div className="absolute inset-0 z-0 opacity-50 blur-xl scale-110">
             <img src={image} className="w-full h-full object-cover" alt="Processing" />
          </div>
       )}
       <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-8">
             <div className="absolute inset-0 border-4 border-[#007AFF] rounded-3xl animate-pulse"></div>
             <div className="absolute inset-0 border-t-4 border-l-4 border-white rounded-3xl animate-spin-slow"></div>
             {image && (
                 <div className="absolute inset-2 rounded-2xl overflow-hidden border-2 border-white/20">
                    <img src={image} className="w-full h-full object-cover" alt="Analysis" />
                 </div>
             )}
             <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/80 shadow-[0_0_10px_white] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">Analyzing Food...</h2>
          <p className="text-gray-400 text-sm">Identifying calories and macros</p>
       </div>
       <style>{`
         @keyframes scan {
           0%, 100% { top: 0%; opacity: 0; }
           10%, 90% { opacity: 1; }
           50% { top: 100%; }
         }
       `}</style>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [currentView, setCurrentView] = useState<ViewState>('AUTH'); // Changed from ONBOARDING
  const [todayLog, setTodayLog] = useState<DayLog>(INITIAL_LOG);
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

  // --- Supabase Persistence Logic ---

  // 1. Check Session & Load Data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
      } else {
        // If no session, make sure we are on AUTH
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
         fetchUserData(session.user.id);
      } else {
         if (!isGuest) {
            setCurrentView('AUTH');
         }
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  // Keep ref in sync
  useEffect(() => {
     currentViewRef.current = currentView;
  }, [currentView]);

  const fetchUserData = async (userId: string) => {
    setIsDataLoading(true);
    try {
      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile({
            ...INITIAL_PROFILE, // defaults
            ...profileData,
            preferences: profileData.preferences || INITIAL_PROFILE.preferences,
            // Re-hydrate target fields if they were stored in a JSONB column 'targets'
            ...(profileData.targets || {})
        });
        
        // Only redirect if we are not currently in an auth flow or special view
        // Prevents jumping to Onboarding when we are waiting for Auth to complete
        const safeViews = ['AUTH', 'PAYWALL', 'DASHBOARD'];
        if (profileData.has_onboarded) {
          if (!safeViews.includes(currentViewRef.current)) {
             setCurrentView(profileData.is_premium ? 'DASHBOARD' : 'PAYWALL');
          }
        } else {
          // User exists but hasn't finished setup
          setCurrentView('ONBOARDING');
        }
      } else {
        // User is authenticated but no profile exists
        setCurrentView('ONBOARDING');
      }

      // Fetch Today's Log
      const today = new Date().toISOString().split('T')[0];
      
      const { data: foodData } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: false });

      const { data: waterData } = await supabase
        .from('water_logs')
        .select('amount')
        .eq('user_id', userId)
        .eq('date', today);

      const totalWater = waterData ? waterData.reduce((acc: number, curr: any) => acc + curr.amount, 0) : 0;
      
      setTodayLog({
        date: today,
        items: (foodData || []).map((f: any) => ({
            ...f,
            timestamp: new Date(f.created_at).getTime(),
            mealType: f.meal_type
        })),
        waterIntake: totalWater
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Dark Mode Effect
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

  const handleAuthSuccess = async () => {
    // We'll rely on the session state update to grab the user ID, but we can optimistically set view
    const { data: { session: newSession } } = await supabase.auth.getSession();
    
    // Even if newSession is null (e.g. pending email verification), we should let the user through to the next screen 
    // to avoid getting stuck.
    
    if (newSession?.user?.id) {
       // Check if this user has already onboarded
       const { data: profileData } = await supabase
            .from('profiles')
            .select('has_onboarded, is_premium')
            .eq('id', newSession.user.id)
            .single();

       if (profileData?.has_onboarded) {
          setProfile(p => ({ ...p, hasOnboarded: true, isPremium: profileData.is_premium }));
          setCurrentView(profileData.is_premium ? 'DASHBOARD' : 'PAYWALL');
       } else {
          // New user or incomplete profile
          setCurrentView('ONBOARDING');
       }
    } else {
       // Fallback for pending sessions
       setCurrentView('ONBOARDING');
    }
  };

  const handleOnboardingComplete = async () => {
      // Calculate final macros
      const updatedProfile = calculateMacros(profile);
      setProfile({ ...updatedProfile, hasOnboarded: true });

      // Save to Supabase if logged in
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user?.id) {
          const { error } = await supabase.from('profiles').upsert({
             id: currentSession.user.id,
             name: updatedProfile.name,
             age: updatedProfile.age,
             gender: updatedProfile.gender,
             height: updatedProfile.height,
             weight: updatedProfile.weight,
             goal: updatedProfile.goal,
             activity_level: updatedProfile.activityLevel,
             has_onboarded: true,
             is_premium: updatedProfile.isPremium,
             targets: {
                targetCalories: updatedProfile.targetCalories,
                targetProtein: updatedProfile.targetProtein,
                targetCarbs: updatedProfile.targetCarbs,
                targetFat: updatedProfile.targetFat,
                targetFiber: updatedProfile.targetFiber,
                targetSugar: updatedProfile.targetSugar,
                maxSodium: updatedProfile.maxSodium,
                maxCholesterol: updatedProfile.maxCholesterol,
             },
             preferences: updatedProfile.preferences
          });
           if (error) console.error("Error saving profile:", error);
      }

      setCurrentView('PAYWALL');
  };

  const handleSubscribe = async () => {
    // Check session again just in case it wasn't available during auth success
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (currentSession?.user?.id) {
       await supabase.from('profiles').update({ is_premium: true }).eq('id', currentSession.user.id);
    }
    setProfile(p => ({ ...p, isPremium: true }));
    setCurrentView('DASHBOARD');
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setCapturedImage(base64String);
      setIsAnalyzing(true);
      setCurrentView('CAMERA');
      
      const result = await analyzeFoodImage(base64String);
      setAnalysisResult(result);
      setEditForm(result); 
      setIsAnalyzing(false);
      setCurrentView('REVIEW');
    };
    reader.readAsDataURL(file);
  };

  const handleEditChange = (field: keyof AIAnalysisResult, value: string | number) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      [field]: value
    });
  };

  const handleSaveFood = async () => {
    if (editForm) {
      const time = new Date();
      const hour = time.getHours();
      let mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' = 'Snack';
      
      if (hour >= 5 && hour < 11) mealType = 'Breakfast';
      else if (hour >= 11 && hour < 16) mealType = 'Lunch';
      else if (hour >= 16 && hour < 22) mealType = 'Dinner';

      const newItem: FoodLogItem = {
        ...editForm,
        id: `temp-${Date.now()}`, 
        timestamp: Date.now(),
        mealType: mealType,
        name: editForm.foodName,
        imageUrl: capturedImage || undefined
      };

      // Optimistic Update
      setTodayLog(prev => ({
        ...prev,
        items: [newItem, ...prev.items]
      }));
      setCurrentView('DASHBOARD');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      
      setCapturedImage(null);
      setAnalysisResult(null);
      setEditForm(null);

      // Save to Supabase (Only if authenticated)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user?.id) {
        const { error } = await supabase.from('food_logs').insert({
          user_id: currentSession.user.id,
          date: new Date().toISOString().split('T')[0],
          meal_type: mealType,
          name: editForm.foodName,
          calories: editForm.calories,
          protein: editForm.protein,
          carbs: editForm.carbs,
          fat: editForm.fat,
          fiber: editForm.fiber,
          sugar: editForm.sugar,
          sodium: editForm.sodium,
          cholesterol: editForm.cholesterol,
          confidence: editForm.confidence,
        });

        if (error) console.error("Error saving food:", error);
        else fetchUserData(currentSession.user.id);
      }
    }
  };

  const handleAddWater = async (amount: number) => {
    // Optimistic Update
    setTodayLog(prev => ({ ...prev, waterIntake: (prev.waterIntake || 0) + amount }));

    // Save to Supabase (Only if authenticated)
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user?.id) {
      const { error } = await supabase.from('water_logs').insert({
        user_id: currentSession.user.id,
        date: new Date().toISOString().split('T')[0],
        amount: amount
      });
      
      if (error) console.error("Error saving water:", error);
    }
  };
  
  const handleUpdateProfile = async (newProfile: UserProfile) => {
     const calculated = calculateMacros(newProfile);
     setProfile(calculated);

     const { data: { session: currentSession } } = await supabase.auth.getSession();
     if (currentSession?.user?.id) {
       await supabase.from('profiles').update({
         weight: calculated.weight,
         height: calculated.height,
         age: calculated.age,
         preferences: calculated.preferences,
         targets: {
            targetCalories: calculated.targetCalories,
            targetProtein: calculated.targetProtein,
            targetCarbs: calculated.targetCarbs,
            targetFat: calculated.targetFat,
            targetFiber: calculated.targetFiber,
            targetSugar: calculated.targetSugar,
            maxSodium: calculated.maxSodium,
            maxCholesterol: calculated.maxCholesterol,
         }
       }).eq('id', currentSession.user.id);
     }
  };
  
  const handleLogout = async () => {
     await supabase.auth.signOut();
     setIsGuest(false);
     setProfile(INITIAL_PROFILE);
     setTodayLog(INITIAL_LOG);
     setCurrentView('AUTH');
  };

  // --- Views ---

  if (isDataLoading && (currentView === 'ONBOARDING' || currentView === 'DASHBOARD')) {
      return <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#007AFF] w-8 h-8" /></div>;
  }

  if (currentView === 'ONBOARDING') {
    return <OnboardingStep profile={profile} setProfile={setProfile} onComplete={handleOnboardingComplete} isLoading={isDataLoading} />;
  }

  if (currentView === 'AUTH') {
    return <AuthView onSuccess={handleAuthSuccess} onSkip={handleGuestContinue} profile={profile} setProfile={setProfile} />;
  }

  if (currentView === 'PAYWALL') {
    return <Paywall onSubscribe={handleSubscribe} />;
  }

  if (currentView === 'CAMERA') {
    return <ProcessingView image={capturedImage} />;
  }

  if (currentView === 'PROGRESS') {
     return (
        <div className="h-full">
           <ProgressDashboard log={todayLog} profile={profile} />
           <Navigation currentView={currentView} onNavigate={setCurrentView} onCameraClick={handleCameraClick} />
        </div>
     );
  }

  if (currentView === 'AWARDS') {
     return (
        <div className="h-full">
           <AwardsView />
           <Navigation currentView={currentView} onNavigate={setCurrentView} onCameraClick={handleCameraClick} />
        </div>
     );
  }
  
  if (currentView === 'PROFILE') {
     return (
        <div className="h-full">
           <PremiumProfileView profile={profile} onUpdate={handleUpdateProfile} onLogout={handleLogout} />
           <Navigation currentView={currentView} onNavigate={setCurrentView} onCameraClick={handleCameraClick} />
        </div>
     );
  }

  // Review Sheet
  if (currentView === 'REVIEW') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col ios-slide-up">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-black" onClick={() => setCurrentView('DASHBOARD')}>
           {capturedImage && <img src={capturedImage} className="w-full h-full object-cover opacity-80" alt="Captured" />}
        </div>

        {/* Modal Sheet */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[32px] overflow-hidden flex flex-col h-[85%] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          
          {/* Sheet Header */}
          <div className="bg-white dark:bg-[#2C2C2E] px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
             <button onClick={() => setCurrentView('DASHBOARD')} className="text-[#007AFF] text-[17px]">Cancel</button>
             <div className="font-semibold text-[17px] dark:text-white">Edit Entry</div>
             <button onClick={handleSaveFood} className="text-[#007AFF] font-bold text-[17px]">Add</button>
          </div>
          
          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 p-6 pb-20">
             <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full shadow-lg mb-4 overflow-hidden border-4 border-white dark:border-gray-800">
                  {capturedImage && <img src={capturedImage} className="w-full h-full object-cover" alt="Food" />}
                </div>
                
                <input 
                  type="text"
                  value={editForm?.foodName || ''}
                  onChange={(e) => handleEditChange('foodName', e.target.value)}
                  className="text-2xl font-bold text-center text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-[#007AFF] outline-none w-full max-w-xs"
                />
                
                <div className="flex items-center gap-1.5 mt-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                   <Award size={14} />
                   <span className="text-xs font-bold">{analysisResult?.confidence}% Match</span>
                </div>
             </div>

             <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 shadow-sm mb-6 flex justify-between items-center border border-gray-100 dark:border-gray-700">
                <div className="text-center flex-1 border-r border-gray-100 dark:border-gray-700">
                   <input 
                      type="number"
                      value={editForm?.calories || 0}
                      onChange={(e) => handleEditChange('calories', parseInt(e.target.value) || 0)}
                      className="text-3xl font-extrabold text-gray-900 dark:text-white w-full text-center bg-transparent outline-none"
                   />
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Calories</div>
                </div>
                <div className="text-center w-16 px-1">
                   <input 
                      type="number"
                      value={editForm?.protein || 0}
                      onChange={(e) => handleEditChange('protein', parseInt(e.target.value) || 0)}
                      className="text-xl font-bold text-gray-900 dark:text-white w-full text-center bg-transparent outline-none"
                   />
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Prot</div>
                </div>
                <div className="text-center w-16 px-1">
                   <input 
                      type="number"
                      value={editForm?.carbs || 0}
                      onChange={(e) => handleEditChange('carbs', parseInt(e.target.value) || 0)}
                      className="text-xl font-bold text-gray-900 dark:text-white w-full text-center bg-transparent outline-none"
                   />
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Carb</div>
                </div>
                <div className="text-center w-16 px-1">
                   <input 
                      type="number"
                      value={editForm?.fat || 0}
                      onChange={(e) => handleEditChange('fat', parseInt(e.target.value) || 0)}
                      className="text-xl font-bold text-gray-900 dark:text-white w-full text-center bg-transparent outline-none"
                   />
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fat</div>
                </div>
             </div>

             <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                   <span className="text-gray-900 dark:text-white">Description</span>
                   <span className="text-gray-500 dark:text-gray-400 text-sm text-right max-w-[60%]">{analysisResult?.description}</span>
                </div>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                   <span className="text-gray-900 dark:text-white">Sugar (g)</span>
                   <input 
                      type="number"
                      value={editForm?.sugar || 0}
                      onChange={(e) => handleEditChange('sugar', parseInt(e.target.value) || 0)}
                      className="text-right text-[#007AFF] font-medium bg-transparent outline-none w-20"
                   />
                </div>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                   <span className="text-gray-900 dark:text-white">Fiber (g)</span>
                   <input 
                      type="number"
                      value={editForm?.fiber || 0}
                      onChange={(e) => handleEditChange('fiber', parseInt(e.target.value) || 0)}
                      className="text-right text-[#007AFF] font-medium bg-transparent outline-none w-20"
                   />
                </div>
                <div className="p-4 flex justify-between items-center">
                   <span className="text-gray-900 dark:text-white">Meal Type</span>
                   <span className="text-[#007AFF] text-sm font-medium">Auto-detected</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  const totalCalories = todayLog.items.reduce((acc, item) => acc + item.calories, 0);
  const totalProtein = todayLog.items.reduce((acc, item) => acc + item.protein, 0);
  const totalCarbs = todayLog.items.reduce((acc, item) => acc + item.carbs, 0);
  const totalFat = todayLog.items.reduce((acc, item) => acc + item.fat, 0);
  
  const remainingCalories = Math.max(0, profile.targetCalories - totalCalories);

  // Group meals
  const groupedMeals = {
     Breakfast: todayLog.items.filter(i => i.mealType === 'Breakfast'),
     Lunch: todayLog.items.filter(i => i.mealType === 'Lunch'),
     Dinner: todayLog.items.filter(i => i.mealType === 'Dinner'),
     Snack: todayLog.items.filter(i => i.mealType === 'Snack'),
  };
  const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black font-sans text-slate-900 dark:text-white pb-24 overflow-y-auto transition-colors duration-500">
      <Confetti active={showConfetti} />
      <style>{`
         @keyframes breathe {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255,255,255,0.2)); }
            50% { transform: scale(1.03); filter: drop-shadow(0 0 10px rgba(255,255,255,0.4)); }
         }
         @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
         }
         .ring-breathe {
            animation: breathe 3s ease-in-out infinite;
         }
      `}</style>
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="bg-[#F2F2F7]/90 dark:bg-black/90 pt-safe px-5 pb-2 sticky top-0 z-40 backdrop-blur-xl transition-colors duration-500 border-b border-transparent dark:border-gray-800">
        <div className="flex justify-between items-end mb-1">
           <div className="flex flex-col">
             <span className="text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider mb-1">
               {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
             </span>
             <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight leading-none">Journal</h1>
           </div>
           <button onClick={() => setCurrentView('PROFILE')} className="mb-1 transform transition-transform active:scale-90">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold text-sm border border-white/50 dark:border-white/10 shadow-sm">
                 {profile.name ? profile.name[0] : 'ME'}
              </div>
           </button>
        </div>
      </div>

      <div className="px-5 mt-3 space-y-6">
        
        {/* NEW HERO CARD - Lifesum Style */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#054F44] dark:bg-[#04332c] text-white shadow-xl transform transition-all hover:scale-[1.01] duration-300">
           {/* Particles */}
           <ParticleSystem />
           
           {/* Decorative Blur */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

           <div className="relative z-10 p-6">
              {/* Main Stats Row */}
              <div className="flex justify-between items-center mb-8 mt-2">
                 {/* Left: Eaten */}
                 <div className="text-center w-20">
                    <div className="text-2xl font-bold tracking-tight">{totalCalories}</div>
                    <div className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-widest mt-0.5">Eaten</div>
                 </div>

                 {/* Center: Ring */}
                 <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Background Circle */}
                    <div className="absolute inset-0 rounded-full border-[8px] border-white/10"></div>
                    
                    {/* Animated Progress Circle */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90 ring-breathe">
                       <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="transparent"
                          stroke="white"
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 70}
                          strokeDashoffset={2 * Math.PI * 70 * (1 - Math.min(1, totalCalories / profile.targetCalories))}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                       />
                    </svg>

                    {/* Center Text */}
                    <div className="text-center z-10">
                       <div className="text-4xl font-bold tracking-tighter shadow-black/20 drop-shadow-lg">{remainingCalories}</div>
                       <div className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-widest mt-1">Kcal Left</div>
                    </div>
                 </div>

                 {/* Right: Burned (Static 0 for now as per design) */}
                 <div className="text-center w-20">
                    <div className="text-2xl font-bold tracking-tight">0</div>
                    <div className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-widest mt-0.5">Burned</div>
                 </div>
              </div>

              {/* Bottom: Macros */}
              <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-5">
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/80 mb-1.5">Carbs</span>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                       <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (totalCarbs / profile.targetCarbs) * 100)}%` }}></div>
                    </div>
                    <span className="text-xs font-medium">{totalCarbs} / {profile.targetCarbs}g</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/80 mb-1.5">Protein</span>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                       <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (totalProtein / profile.targetProtein) * 100)}%` }}></div>
                    </div>
                    <span className="text-xs font-medium">{totalProtein} / {profile.targetProtein}g</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/80 mb-1.5">Fat</span>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                       <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (totalFat / profile.targetFat) * 100)}%` }}></div>
                    </div>
                    <span className="text-xs font-medium">{totalFat} / {profile.targetFat}g</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Water Tracker - Fade In */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-backwards">
            <WaterTracker intake={todayLog.waterIntake || 0} onAdd={handleAddWater} />
        </div>

        {/* Recent Meals Header & List - Fade In */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-backwards">
           <div className="flex justify-between items-center mb-3">
             <h2 className="text-[22px] font-bold text-black dark:text-white tracking-tight">Recent Meals</h2>
             <button onClick={handleCameraClick} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-blue-400 active:scale-90 transition-transform"><Plus size={20} /></button>
           </div>
           
           <div className="space-y-5">
             {todayLog.items.length === 0 ? (
               <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800">
                  <p className="text-gray-400 font-medium">No meals tracked today</p>
                  <button onClick={handleCameraClick} className="text-[#007AFF] font-medium text-sm mt-2">Tap + to add breakfast</button>
               </div>
             ) : (
                mealOrder.map(mealType => {
                   const meals = groupedMeals[mealType as keyof typeof groupedMeals];
                   if (meals.length === 0) return null;
                   
                   return (
                     <div key={mealType}>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">{mealType}</h3>
                        <div className="space-y-2">
                        {meals.map((item) => (
                          <div key={item.id} className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-3 flex items-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all border border-gray-50 dark:border-gray-800/50">
                              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 relative">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                                      <Utensils size={20} className="text-gray-300 dark:text-gray-600" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate text-[17px]">{item.name}</h4>
                                    <span className="text-gray-400 text-xs">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{item.calories} kcal</span>
                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                    <span className="text-gray-500 text-xs font-medium">{item.protein}p • {item.carbs}c • {item.fat}f</span>
                                </div>
                              </div>
                              <ChevronRight className="text-gray-300 dark:text-gray-600 w-5 h-5" />
                          </div>
                        ))}
                        </div>
                     </div>
                   );
                })
             )}
           </div>
        </div>
      </div>

      <Navigation 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onCameraClick={handleCameraClick}
      />
    </div>
  );
};

export default App;