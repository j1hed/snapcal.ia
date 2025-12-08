
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum Goal {
  LoseWeight = 'Lose Weight',
  Maintain = 'Maintain',
  GainMuscle = 'Gain Muscle'
}

export enum ActivityLevel {
  Sedentary = 'Sedentary',
  Light = 'Lightly Active',
  Moderate = 'Moderately Active',
  Active = 'Very Active'
}

export interface UserPreferences {
  darkMode: boolean;
  notifications: boolean; // General push notifications
  weeklyReports: boolean; // New setting for weekly summaries
  healthSync: boolean;
  unlockedAwards?: string[]; // Array of Achievement IDs
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  goal: Goal;
  activityLevel: ActivityLevel;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  // Extended targets
  targetFiber: number;
  targetSugar: number;
  maxSodium: number;
  maxCholesterol: number;
  
  hasOnboarded: boolean;
  isPremium: boolean;
  
  preferences: UserPreferences;
}

export interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Extended nutrients
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
}

export interface FoodLogItem extends MacroData {
  id: string;
  name: string;
  timestamp: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  imageUrl?: string;
  confidence?: number;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  items: FoodLogItem[];
  waterIntake: number; // in ml
}

export type ViewState = 'ONBOARDING' | 'AUTH' | 'PAYWALL' | 'DASHBOARD' | 'PROGRESS' | 'CAMERA' | 'REVIEW' | 'PROFILE' | 'AWARDS';