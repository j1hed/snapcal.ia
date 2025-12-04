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
  hasOnboarded: boolean;
  isPremium: boolean;
}

export interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
}

export type ViewState = 'ONBOARDING' | 'PAYWALL' | 'DASHBOARD' | 'CAMERA' | 'REVIEW' | 'PROFILE';
