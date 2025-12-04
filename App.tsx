import React, { useState, useEffect, useRef } from 'react';
import { Camera, ChevronLeft, ChevronRight, Check, X, Loader2, Utensils, Settings, Award } from 'lucide-react';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Navigation } from './components/Navigation';
import { MacroRing } from './components/MacroRing';
import { analyzeFoodImage, AIAnalysisResult } from './services/geminiService';
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
  hasOnboarded: false,
  isPremium: false
};

const INITIAL_LOG: DayLog = {
  date: new Date().toISOString().split('T')[0],
  items: []
};

// --- Helper Functions ---

const calculateMacros = (profile: UserProfile): UserProfile => {
  // Simplified Harris-Benedict
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
  // Default Split: 30% P, 40% C, 30% F
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

// --- Sub-components ---

const ProcessingView: React.FC<{ image: string | null }> = ({ image }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Scanning image...");

  useEffect(() => {
    const stages = [
      "Scanning image...",
      "Identifying ingredients...",
      "Estimating portion sizes...",
      "Calculating nutritional data...",
      "Finalizing..."
    ];
    
    // Simulate progress
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        // Faster at start, slower at end
        const remaining = 100 - prev;
        const jump = Math.max(0.2, remaining * 0.05); 
        return Math.min(95, prev + jump);
      });
    }, 100);

    // Cycle stages based on progress thresholds
    const stageCheck = setInterval(() => {
      setProgress(current => {
        if (current < 25) setStage(stages[0]);
        else if (current < 50) setStage(stages[1]);
        else if (current < 75) setStage(stages[2]);
        else if (current < 90) setStage(stages[3]);
        else setStage(stages[4]);
        return current;
      });
    }, 100);

    return () => {
      clearInterval(timer);
      clearInterval(stageCheck);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute w-full h-full opacity-30 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-900 rounded-full blur-[120px]" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-900 rounded-full blur-[120px]" />
        </div>

        <div className="z-10 w-full max-w-xs flex flex-col items-center">
            {/* Image Container */}
            <div className="relative w-64 h-64 mb-10 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-900">
               {image && (
                 <>
                   <img src={image} className="w-full h-full object-cover opacity-60" alt="Analyzing" />
                   
                   {/* Scanning Overlay */}
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent" />
                   
                   {/* Moving Scan Line */}
                   <div className="absolute left-0 right-0 h-[2px] bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.8)] scan-line" />
                   
                   {/* HUD Corners */}
                   <div className="absolute top-4 left-4 w-5 h-5 border-l-2 border-t-2 border-blue-500/70 rounded-tl-lg" />
                   <div className="absolute top-4 right-4 w-5 h-5 border-r-2 border-t-2 border-blue-500/70 rounded-tr-lg" />
                   <div className="absolute bottom-4 left-4 w-5 h-5 border-l-2 border-b-2 border-blue-500/70 rounded-bl-lg" />
                   <div className="absolute bottom-4 right-4 w-5 h-5 border-r-2 border-b-2 border-blue-500/70 rounded-br-lg" />
                 </>
               )}
            </div>

            {/* Progress Section */}
            <div className="w-full space-y-3 px-2">
                <div className="flex justify-between items-end">
                   <span className="text-blue-400 font-medium text-sm animate-pulse tracking-wide">{stage}</span>
                   <span className="text-gray-500 text-xs font-mono">{Math.floor(progress)}%</span>
                </div>
                
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-200"
                     style={{ width: `${progress}%` }}
                   />
                </div>
            </div>
        </div>

        <style>{`
          .scan-line {
            animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}</style>
    </div>
  );
};

const OnboardingStep: React.FC<{ 
  profile: UserProfile; 
  setProfile: (p: UserProfile) => void; 
  onComplete: () => void 
}> = ({ profile, setProfile, onComplete }) => {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
    else onComplete();
  };

  const update = (key: keyof UserProfile, value: any) => {
    setProfile({ ...profile, [key]: value });
  };

  return (
    <div className="min-h-screen bg-white pt-safe px-6 pb-10 flex flex-col justify-between">
      <div className="mt-10">
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Let's get to know you.</h1>
            <p className="text-gray-500">We need a few details to calculate your personalized nutrition plan.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <div className="flex gap-3">
                  {Object.values(Gender).map(g => (
                    <button 
                      key={g}
                      onClick={() => update('gender', g)}
                      className={`flex-1 py-3 rounded-xl border ${profile.gender === g ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input 
                  type="number" 
                  value={profile.age} 
                  onChange={(e) => update('age', parseInt(e.target.value))}
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Body Stats</h1>
            <p className="text-gray-500">Accurate measurements help us determine your baseline metabolism.</p>
            
            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                <input 
                  type="number" 
                  value={profile.height} 
                  onChange={(e) => update('height', parseInt(e.target.value))}
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input 
                  type="number" 
                  value={profile.weight} 
                  onChange={(e) => update('weight', parseInt(e.target.value))}
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Goal</h1>
            <p className="text-gray-500">What are you striving for?</p>
            
            <div className="space-y-3">
              {Object.values(Goal).map(g => (
                <button 
                  key={g}
                  onClick={() => update('goal', g)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${profile.goal === g ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <span className={`font-semibold ${profile.goal === g ? 'text-blue-700' : 'text-gray-900'}`}>{g}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Activity Level</h1>
            <p className="text-gray-500">Be honest! This changes your calorie budget significantly.</p>
            
            <div className="space-y-3">
              {Object.values(ActivityLevel).map(l => (
                <button 
                  key={l}
                  onClick={() => update('activityLevel', l)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${profile.activityLevel === l ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                   <span className={`font-semibold ${profile.activityLevel === l ? 'text-blue-700' : 'text-gray-900'}`}>{l}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button onClick={nextStep} fullWidth>
        {step === 3 ? "Complete Profile" : "Continue"}
      </Button>
    </div>
  );
};

const Paywall: React.FC<{ onSubscribe: () => void }> = ({ onSubscribe }) => {
  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center justify-end pb-10 px-6">
      <div className="absolute inset-0 opacity-40">
        <img src="https://picsum.photos/800/1200" alt="Healthy food" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
      </div>

      <div className="relative z-10 w-full text-center space-y-6">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
          <Utensils className="text-white w-8 h-8" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">Unlock AI Tracking</h1>
        <p className="text-gray-300 text-lg">
          Stop guessing portions. Snap a photo and let our AI calculate calories, macros, and nutrients instantly.
        </p>

        <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">Monthly</span>
            <span className="text-xl font-bold">$9.99/mo</span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-700 pt-4">
            <div>
              <span className="text-blue-400 font-bold block">Annual (Best Value)</span>
              <span className="text-xs text-gray-400">7-day free trial</span>
            </div>
            <span className="text-2xl font-bold">$59.99/yr</span>
          </div>
        </div>

        <Button 
          variant="primary" 
          fullWidth 
          onClick={onSubscribe} 
          className="bg-blue-600 hover:bg-blue-700 text-white border-none"
        >
          Start Free Trial
        </Button>
        <button className="text-sm text-gray-500 font-medium">Restore Purchases</button>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [currentView, setCurrentView] = useState<ViewState>('ONBOARDING');
  const [todayLog, setTodayLog] = useState<DayLog>(INITIAL_LOG);
  
  // Camera & Analysis State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load data from local storage on mount
    const savedProfile = localStorage.getItem('snapcalorie_profile');
    const savedLog = localStorage.getItem('snapcalorie_log');
    
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
      const parsedProfile = JSON.parse(savedProfile);
      if (parsedProfile.hasOnboarded) {
        setCurrentView(parsedProfile.isPremium ? 'DASHBOARD' : 'PAYWALL');
      }
    }

    if (savedLog) {
      const parsedLog = JSON.parse(savedLog);
      // Simple check to reset log if date changes
      if (parsedLog.date === new Date().toISOString().split('T')[0]) {
        setTodayLog(parsedLog);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('snapcalorie_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('snapcalorie_log', JSON.stringify(todayLog));
  }, [todayLog]);

  const handleOnboardingComplete = () => {
    const updatedProfile = calculateMacros(profile);
    setProfile({ ...updatedProfile, hasOnboarded: true });
    setCurrentView('PAYWALL');
  };

  const handleSubscribe = () => {
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
      setCurrentView('CAMERA'); // Show preview/loading
      
      setIsAnalyzing(true);
      const result = await analyzeFoodImage(base64String);
      setAnalysisResult(result);
      setIsAnalyzing(false);
      setCurrentView('REVIEW');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFood = () => {
    if (analysisResult) {
      const newItem: FoodLogItem = {
        ...analysisResult,
        id: Date.now().toString(),
        timestamp: Date.now(),
        mealType: 'Snack', // Default, could add selector
        imageUrl: capturedImage || undefined
      };
      setTodayLog(prev => ({
        ...prev,
        items: [newItem, ...prev.items]
      }));
      setCapturedImage(null);
      setAnalysisResult(null);
      setCurrentView('DASHBOARD');
    }
  };

  // --- Views ---

  if (currentView === 'ONBOARDING') {
    return <OnboardingStep profile={profile} setProfile={setProfile} onComplete={handleOnboardingComplete} />;
  }

  if (currentView === 'PAYWALL') {
    return <Paywall onSubscribe={handleSubscribe} />;
  }

  if (currentView === 'CAMERA') {
    return <ProcessingView image={capturedImage} />;
  }

  if (currentView === 'REVIEW') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="relative h-72 w-full bg-black">
          {capturedImage && (
            <img src={capturedImage} className="w-full h-full object-cover opacity-90" alt="Captured" />
          )}
          <button 
            onClick={() => setCurrentView('DASHBOARD')}
            className="absolute top-safe mt-4 left-4 bg-black/50 p-2 rounded-full text-white backdrop-blur-md"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 -mt-6 relative bg-white rounded-t-[32px] p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
          
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{analysisResult?.foodName}</h2>
              <p className="text-gray-500 text-sm mt-1">{analysisResult?.description}</p>
            </div>
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Award size={12} /> {analysisResult?.confidence}% Match
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-8">
            <div className="bg-blue-50 p-3 rounded-2xl text-center">
              <span className="block text-xl font-bold text-blue-700">{analysisResult?.calories}</span>
              <span className="text-[10px] uppercase font-bold text-blue-400">Kcal</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
              <span className="block text-xl font-bold text-gray-800">{analysisResult?.protein}g</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Prot</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
              <span className="block text-xl font-bold text-gray-800">{analysisResult?.carbs}g</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Carb</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
              <span className="block text-xl font-bold text-gray-800">{analysisResult?.fat}g</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Fat</span>
            </div>
          </div>

          <div className="space-y-3">
             <Button fullWidth onClick={handleSaveFood} className="flex items-center justify-center gap-2">
               <Check size={20} /> Log Meal
             </Button>
             <Button fullWidth variant="ghost" onClick={() => setCurrentView('DASHBOARD')} className="text-red-500 hover:bg-red-50 hover:text-red-600">
               Discard
             </Button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View Logic
  const totalCalories = todayLog.items.reduce((acc, item) => acc + item.calories, 0);
  const totalProtein = todayLog.items.reduce((acc, item) => acc + item.protein, 0);
  const totalCarbs = todayLog.items.reduce((acc, item) => acc + item.carbs, 0);
  const totalFat = todayLog.items.reduce((acc, item) => acc + item.fat, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="bg-white pt-safe pb-4 px-6 rounded-b-[32px] shadow-sm sticky top-0 z-40">
        <div className="flex justify-between items-center mb-6 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today</h1>
            <p className="text-sm text-gray-500 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
            <span className="font-bold text-gray-600 text-sm">{profile.name ? profile.name[0] : 'ME'}</span>
          </div>
        </div>

        {/* Macro Rings */}
        <div className="flex justify-between items-center px-2">
           <div className="flex flex-col items-center">
             <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="#f3f4f6" strokeWidth="10" fill="transparent" />
                  <circle 
                    cx="64" cy="64" r="58" 
                    stroke="#2563eb" strokeWidth="10" 
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * (1 - Math.min(1, totalCalories/profile.targetCalories))}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{profile.targetCalories - totalCalories}</span>
                  <span className="text-xs text-gray-500 font-medium">Kcal Left</span>
                </div>
             </div>
           </div>
           
           <div className="flex gap-4">
              <MacroRing current={totalProtein} target={profile.targetProtein} label="Protein" color="#10b981" />
              <MacroRing current={totalCarbs} target={profile.targetCarbs} label="Carbs" color="#f59e0b" />
              <MacroRing current={totalFat} target={profile.targetFat} label="Fat" color="#ef4444" />
           </div>
        </div>
      </div>

      {/* Meal List */}
      <div className="px-6 mt-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Meals</h2>
          <button className="text-blue-600 text-sm font-medium">View History</button>
        </div>

        {todayLog.items.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100/50 shadow-sm border-dashed border-gray-200">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Camera className="text-gray-400" size={24} />
            </div>
            <p className="text-gray-900 font-medium">No meals logged yet</p>
            <p className="text-gray-400 text-sm mt-1">Tap the + button to snap your first meal</p>
          </div>
        ) : (
          todayLog.items.map((item) => (
            <Card key={item.id} className="flex gap-4 items-center">
               <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                 {item.imageUrl ? (
                   <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                     <Utensils size={20} />
                   </div>
                 )}
               </div>
               <div className="flex-1 min-w-0">
                 <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                 <p className="text-xs text-gray-500 mt-0.5">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.mealType}</p>
                 <div className="flex gap-2 mt-2">
                   <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md">{item.calories} kcal</span>
                   <span className="text-[10px] font-medium bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md">{item.protein}p</span>
                 </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                  <button className="text-gray-300 hover:text-gray-600"><Settings size={16} /></button>
               </div>
            </Card>
          ))
        )}
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