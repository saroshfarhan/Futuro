"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserProfile } from "@/lib/api";

interface ProfileContextValue {
  profile: UserProfile;
  userId: string;
  updateProfile: (delta: Partial<UserProfile>) => void;
  setUserId: (id: string) => void;
  profileCompletion: number;
  newFields: string[];
  clearNewFields: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  age: "Age",
  salary: "Salary",
  family_size: "Family size",
  health_priorities: "Health priorities",
  retirement_age: "Retirement age",
  risk_tolerance: "Risk profile",
  current_plan: "Current plan",
  location: "Location",
  is_pregnant: "Pregnancy status",
  is_student: "Student status",
  occupation: "Occupation",
};

const COMPLETION_FIELDS = ["age", "salary", "family_size", "health_priorities", "retirement_age"];

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({});
  const [userId, setUserId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("futuro_user_id") || `demo-${Math.random().toString(36).slice(2, 9)}`;
    }
    return "demo-user";
  });
  const [newFields, setNewFields] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("futuro_profile");
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch {}
    }
    localStorage.setItem("futuro_user_id", userId);
  }, [userId]);

  const updateProfile = useCallback((delta: Partial<UserProfile>) => {
    if (!delta || Object.keys(delta).length === 0) return;

    setProfile((prev) => {
      const next = { ...prev };
      const newlyFound: string[] = [];

      for (const [key, val] of Object.entries(delta)) {
        if (val === null || val === undefined) continue;
        if (key === "health_priorities" && Array.isArray(val)) {
          const existing = new Set(prev.health_priorities || []);
          const merged = [...new Set([...existing, ...val])];
          if (merged.length > existing.size) {
            (next as any)[key] = merged;
            newlyFound.push(key);
          }
        } else {
          if ((prev as any)[key] === undefined || (prev as any)[key] === null) {
            newlyFound.push(key);
          }
          (next as any)[key] = val;
        }
      }

      if (newlyFound.length > 0) {
        setNewFields(newlyFound.map((f) => FIELD_LABELS[f] || f));
      }

      localStorage.setItem("futuro_profile", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearNewFields = useCallback(() => setNewFields([]), []);

  const profileCompletion = Math.round(
    (COMPLETION_FIELDS.filter((f) => (profile as any)[f] !== undefined).length /
      COMPLETION_FIELDS.length) *
      100
  );

  return (
    <ProfileContext.Provider
      value={{ profile, userId, updateProfile, setUserId, profileCompletion, newFields, clearNewFields }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProfileProvider");
  return ctx;
}
