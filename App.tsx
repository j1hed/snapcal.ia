
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Utensils, Award, ChevronRight, Settings, Droplets, Plus, Minus, Bell, Moon, Smartphone, Flame, Carrot, Pizza, Apple, CheckCircle2, Lock, Sparkles, LogOut, User as UserIcon, Loader2, Mail, Lock as LockIcon, Eye, EyeOff, ArrowRight } from 'lucide-react';
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

const ProfileView: React.FC<{ 
  profile: UserProfile; 
  onUpdate: (p: UserProfile) => void;
  onLogout: () => void;
}> = ({ profile, onUpdate, onLogout }) => {
  const [tempWeight, setTempWeight] = useState(profile.weight);

  const handleWeightChange = (delta: number) => {
    const newWeight = tempWeight + delta;
    setTempWeight(newWeight);
    onUpdate({ ...profile, weight: newWeight });
  };

  const handleTogglePref = (key: keyof typeof profile.preferences) => {
    const newPrefs = { ...profile.preferences, [key]: !profile.preferences[key] };
    onUpdate({ ...profile, preferences: newPrefs });
  };

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-24 transition-colors duration-500">
       <div className="bg-[#F2F2F7]/95 dark:bg-black/95 pt-safe px-5 pb-4 sticky top-0 z-40 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
          <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight mt-2">Profile</h1>
       </div>

       <div className="px-5 mt-4 space-y-6">
          
          {/* User Card */}
          <div className="flex items-center gap-4 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-2xl font-bold text-gray-500 dark:text-gray-300 shadow-md">
                {profile.name ? profile.name[0] : 'G'}
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.name || 'Guest User'}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#007AFF]/20 dark:text-[#0A84FF]">
                   {profile.isPremium ? 'Premium Member' : 'Free Account'}
                </span>
             </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
             <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center py-6">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Weight</span>
                <div className="flex items-center gap-3">
                   <button onClick={() => handleWeightChange(-1)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600 active:scale-90 transition-all">
                      <Minus size={16} />
                   </button>
                   <span className="text-2xl font-bold text-gray-900 dark:text-white w-16 text-center">{tempWeight}</span>
                   <button onClick={() => handleWeightChange(1)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600 active:scale-90 transition-all">
                      <Plus size={16} />
                   </button>
                </div>
                <span className="text-gray-400 text-xs mt-1">kg</span>
             </div>
             <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center py-6">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Height</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{profile.height}</span>
                <span className="text-gray-400 text-xs mt-1">cm</span>
             </div>
          </div>

          {/* Settings Group */}
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
             <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider ml-1">Settings</h3>
             <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
                <Switch 
                  label="Notifications" 
                  checked={profile.preferences?.notifications} 
                  onChange={() => handleTogglePref('notifications')}
                  icon={<Bell size={18} />}
                  iconBgColor="bg-orange-100 dark:bg-orange-900/30"
                  iconColor="text-orange-600 dark:text-orange-400"
                />
                
                <Switch 
                  label="Dark Mode" 
                  checked={profile.preferences?.darkMode} 
                  onChange={() => handleTogglePref('darkMode')}
                  icon={<Moon size={18} />}
                  iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                  iconColor="text-purple-600 dark:text-purple-400"
                />

                <Switch 
                  label="Sync Health Data" 
                  checked={profile.preferences?.healthSync} 
                  onChange={() => handleTogglePref('healthSync')}
                  icon={<Smartphone size={18} />}
                  iconBgColor="bg-red-100 dark:bg-red-900/30"
                  iconColor="text-red-600 dark:text-red-400"
                />
             </div>
          </div>

          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
             <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider ml-1">Account</h3>
             <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors cursor-pointer">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                       <UserIcon size={18} />
                     </div>
                     <span className="font-medium text-gray-900 dark:text-white">Personal Goals</span>
                   </div>
                   <span className="text-gray-400 text-sm">{profile.goal} <ChevronRight size={16} className="inline ml-1" /></span>
                </div>
                <div onClick={onLogout} className="p-4 flex items-center justify-between text-red-500 dark:text-red-400 font-medium active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors cursor-pointer">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/10 flex items-center justify-center">
                       <LogOut size={18} />
                     </div>
                     <span>Sign Out</span>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="text-center text-xs text-gray-400 py-4 animate-in fade-in">
             Version 1.0.3 • Build 2024
          </div>
       </div>
    </div>
  );
};

const AuthView: React.FC<{ 
  onSuccess: () => void;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}> = ({ onSuccess, profile, setProfile }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let authResponse;
      
      if (isLogin) {
        authResponse = await supabase.auth.signInWithPassword({
          email,
          password
        });
      } else {
        authResponse = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: profile.name, // Pass name from onboarding
            }
          }
        });
      }

      if (authResponse.error) throw authResponse.error;
      
      if (!authResponse.data.session && !isLogin) {
         // Sign up successful but needs email confirmation (depending on Supabase settings)
         // For now, assume auto-confirm or just tell user
         alert('Check your email for confirmation link, or just sign in if auto-confirm is on.');
      }
      
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-safe px-6 pb-10 flex flex-col transition-colors duration-500">
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl mx-auto mb-6 shadow-2xl shadow-blue-500/30 flex items-center justify-center">
              <Sparkles className="text-white w-10 h-10" />
           </div>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
             {isLogin ? 'Welcome Back' : 'Create Account'}
           </h1>
           <p className="text-gray-500 dark:text-gray-400">
             {isLogin ? 'Sign in to continue your journey' : 'Join us to start tracking your health'}
           </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl flex mb-8 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
          <button 
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Log In
          </button>
          <button 
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1 uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-[#007AFF]/50 transition-all font-medium"
                placeholder="hello@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1 uppercase tracking-wide">Password</label>
            <div className="relative">
              <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none focus:ring-2 focus:ring-[#007AFF]/50 transition-all font-medium"
                placeholder="••••••••"
                minLength={6}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              fullWidth 
              disabled={loading}
              className="bg-[#007AFF] hover:bg-blue-600 text-white shadow-blue-200 dark:shadow-none h-14 text-lg flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  {isLogin ? 'Log In' : 'Create Account'} <ArrowRight size={20} />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
      
      <p className="text-center text-xs text-gray-400">
        By continuing, you agree to our Terms & Privacy Policy.
      </p>
    </div>
  );
};

const ProcessingView: React.FC<{ image: string | null }> = ({ image }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Scanning...");

  useEffect(() => {
    const stages = [
      "Scanning...",
      "Identifying foods...",
      "Calculating macros...",
      "Finalizing..."
    ];
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return prev;
        const remaining = 100 - prev;
        const jump = Math.max(0.2, remaining * 0.04); 
        return Math.min(98, prev + jump);
      });
    }, 80);

    const stageCheck = setInterval(() => {
      setProgress(current => {
        if (current < 30) setStage(stages[0]);
        else if (current < 60) setStage(stages[1]);
        else if (current < 85) setStage(stages[2]);
        else setStage(stages[3]);
        return current;
      });
    }, 100);

    return () => {
      clearInterval(timer);
      clearInterval(stageCheck);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-[60]">
        {image && (
          <div className="absolute inset-0 opacity-40">
             <img src={image} className="w-full h-full object-cover blur-md scale-105" alt="Background" />
          </div>
        )}
        
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative w-72 h-72 rounded-[40px] overflow-hidden shadow-2xl border border-white/10 bg-gray-900 mb-12">
               {image && <img src={image} className="w-full h-full object-cover" alt="Analyzing" />}
               
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#007AFF]/20 to-transparent animate-pulse" />
               <div className="absolute top-0 w-full h-1 bg-[#007AFF] shadow-[0_0_30px_#007AFF] scan-line" />
            </div>

            <div className="w-full max-w-xs space-y-4">
               <div className="flex justify-between items-baseline px-1">
                 <h2 className="text-2xl font-bold text-white tracking-tight">{stage}</h2>
                 <span className="text-[#007AFF] font-mono font-bold">{Math.floor(progress)}%</span>
               </div>
               
               <LiquidProgressBar progress={progress} />
            </div>
        </div>
        
        <style>{`
          .scan-line {
            animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          @keyframes scan {
            0% { top: -10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 110%; opacity: 0; }
          }
        `}</style>
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
    <div className="min-h-screen bg-white dark:bg-black pt-safe px-6 pb-10 flex flex-col justify-between transition-colors duration-500">
      <div className="mt-10">
        <div className="flex gap-2 mb-10">
          {[0, 1, 2, 3].map(i => (
             <div key={i} className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-[#007AFF] transition-all duration-500 ${i <= step ? 'w-full' : 'w-0'}`}
                />
             </div>
          ))}
        </div>

        <div className="space-y-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <span className="text-[#007AFF] font-semibold text-sm tracking-wide uppercase">Step {step + 1} of 4</span>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
             {step === 0 && "Tell us about yourself"}
             {step === 1 && "Your measurements"}
             {step === 2 && "What is your main goal?"}
             {step === 3 && "How active are you?"}
           </h1>
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 p-1 rounded-xl flex">
              {Object.values(Gender).map(g => (
                <button 
                  key={g}
                  onClick={() => update('gender', g)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${profile.gender === g ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2 pl-1">Age</label>
              <input 
                type="number" 
                value={profile.age} 
                onChange={(e) => update('age', parseInt(e.target.value))}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl text-xl font-semibold border-none focus:ring-0 text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2 pl-1">Name</label>
              <input 
                type="text" 
                value={profile.name} 
                onChange={(e) => update('name', e.target.value)}
                placeholder="Your Name"
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl text-xl font-semibold border-none focus:ring-0 text-center"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-500 mb-2 pl-1">Height (cm)</label>
                <input 
                  type="number" 
                  value={profile.height} 
                  onChange={(e) => update('height', parseInt(e.target.value))}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl text-xl font-semibold border-none focus:ring-0 text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2 pl-1">Weight (kg)</label>
                <input 
                  type="number" 
                  value={profile.weight} 
                  onChange={(e) => update('weight', parseInt(e.target.value))}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl text-xl font-semibold border-none focus:ring-0 text-center"
                />
              </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {Object.values(Goal).map(g => (
              <button 
                key={g}
                onClick={() => update('goal', g)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 active:scale-95 ${profile.goal === g ? 'border-[#007AFF] bg-blue-50/50 dark:bg-blue-900/30 ring-1 ring-[#007AFF]' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <span className={`font-semibold block text-lg ${profile.goal === g ? 'text-[#007AFF]' : 'text-gray-900 dark:text-white'}`}>{g}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {Object.values(ActivityLevel).map(l => (
              <button 
                key={l}
                onClick={() => update('activityLevel', l)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 active:scale-95 ${profile.activityLevel === l ? 'border-[#007AFF] bg-blue-50/50 dark:bg-blue-900/30 ring-1 ring-[#007AFF]' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                 <span className={`font-semibold block text-lg ${profile.activityLevel === l ? 'text-[#007AFF]' : 'text-gray-900 dark:text-white'}`}>{l}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Button onClick={nextStep} fullWidth className="bg-[#007AFF] hover:bg-blue-600 shadow-blue-200 dark:shadow-none" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto"/> : (step === 3 ? "Complete Profile" : "Continue")}
      </Button>
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

// --- Main App Component ---

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [currentView, setCurrentView] = useState<ViewState>('ONBOARDING');
  const [todayLog, setTodayLog] = useState<DayLog>(INITIAL_LOG);
  const [session, setSession] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
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
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
         fetchUserData(session.user.id);
      } else {
         setCurrentView('ONBOARDING');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
        
        if (profileData.has_onboarded) {
          // If already onboarded, go to dashboard (or paywall if logic dictates)
          setCurrentView(profileData.is_premium ? 'DASHBOARD' : 'PAYWALL');
        } else {
          // User exists but hasn't finished setup
          setCurrentView('ONBOARDING');
        }
      } else {
        // User is authenticated but no profile exists (shouldn't happen with triggers, but safe fallback)
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

  const handleOnboardingNext = () => {
    // Calculate final macros before going to Auth
    const updatedProfile = calculateMacros(profile);
    setProfile(updatedProfile);
    setCurrentView('AUTH');
  };

  const handleAuthSuccess = async () => {
    // The user is now authenticated (session listener will trigger fetchUserData).
    // However, if it's a new user, we might need to save the onboarded profile data 
    // that is currently in state to the DB.
    
    // We'll rely on the session state update to grab the user ID, but we can optimistically set view
    const { data: { session: newSession } } = await supabase.auth.getSession();
    
    if (newSession?.user?.id) {
       // Save the profile we built during onboarding
       const { error } = await supabase.from('profiles').upsert({
         id: newSession.user.id,
         name: profile.name,
         age: profile.age,
         gender: profile.gender,
         height: profile.height,
         weight: profile.weight,
         goal: profile.goal,
         activity_level: profile.activityLevel,
         has_onboarded: true,
         is_premium: false,
         targets: {
            targetCalories: profile.targetCalories,
            targetProtein: profile.targetProtein,
            targetCarbs: profile.targetCarbs,
            targetFat: profile.targetFat,
            targetFiber: profile.targetFiber,
            targetSugar: profile.targetSugar,
            maxSodium: profile.maxSodium,
            maxCholesterol: profile.maxCholesterol,
         },
         preferences: profile.preferences
       });

       if (!error) {
          setProfile(p => ({ ...p, hasOnboarded: true }));
          setCurrentView('PAYWALL');
       }
    }
  };

  const handleSubscribe = async () => {
    if (session?.user?.id) {
       await supabase.from('profiles').update({ is_premium: true }).eq('id', session.user.id);
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
    if (editForm && session?.user?.id) {
      const time = new Date();
      const hour = time.getHours();
      let mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' = 'Snack';
      
      if (hour >= 5 && hour < 11) mealType = 'Breakfast';
      else if (hour >= 11 && hour < 16) mealType = 'Lunch';
      else if (hour >= 16 && hour < 22) mealType = 'Dinner';

      const newItem: FoodLogItem = {
        ...editForm,
        id: 'temp-id', // temporary until refresh
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

      // Save to Supabase
      const { error } = await supabase.from('food_logs').insert({
        user_id: session.user.id,
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
        // image_url: capturedImage // Note: Uploading base64 to DB is bad practice. In production, upload to Supabase Storage and save the URL.
      });

      if (error) console.error("Error saving food:", error);
      else fetchUserData(session.user.id); // Refresh to get real ID
    }
  };

  const handleAddWater = async (amount: number) => {
    if (!session?.user?.id) return;

    // Optimistic Update
    setTodayLog(prev => ({ ...prev, waterIntake: (prev.waterIntake || 0) + amount }));

    // Save to Supabase
    const { error } = await supabase.from('water_logs').insert({
       user_id: session.user.id,
       date: new Date().toISOString().split('T')[0],
       amount: amount
    });
    
    if (error) console.error("Error saving water:", error);
  };
  
  const handleUpdateProfile = async (newProfile: UserProfile) => {
     const calculated = calculateMacros(newProfile);
     setProfile(calculated);

     if (session?.user?.id) {
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
       }).eq('id', session.user.id);
     }
  };
  
  const handleLogout = async () => {
     await supabase.auth.signOut();
     setProfile(INITIAL_PROFILE);
     setTodayLog(INITIAL_LOG);
     setCurrentView('ONBOARDING');
  };

  // --- Views ---

  if (isDataLoading && (currentView === 'ONBOARDING' || currentView === 'DASHBOARD')) {
      return <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#007AFF] w-8 h-8" /></div>;
  }

  if (currentView === 'ONBOARDING') {
    return <OnboardingStep profile={profile} setProfile={setProfile} onComplete={handleOnboardingNext} isLoading={isDataLoading} />;
  }

  if (currentView === 'AUTH') {
    return <AuthView onSuccess={handleAuthSuccess} profile={profile} setProfile={setProfile} />;
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
           <ProfileView profile={profile} onUpdate={handleUpdateProfile} onLogout={handleLogout} />
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
