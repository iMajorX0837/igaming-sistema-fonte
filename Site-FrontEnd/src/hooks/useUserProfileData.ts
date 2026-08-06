import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  EMPTY_USER_PROFILE,
  fetchUserProfileCached,
  getCachedUserProfile,
  setCachedUserProfile,
  type UserProfileData,
} from '../lib/userProfileCache';

export function useUserProfileData(enabled = true) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;

  const [userData, setUserData] = useState<UserProfileData>(() => {
    if (!userId) return EMPTY_USER_PROFILE;
    return getCachedUserProfile(userId) ?? EMPTY_USER_PROFILE;
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled || !isAuthenticated || !userId) return false;
    return !getCachedUserProfile(userId);
  });

  const loadProfile = useCallback(async () => {
    if (!enabled || !isAuthenticated || !userId) {
      setUserData(EMPTY_USER_PROFILE);
      setIsLoading(false);
      return;
    }

    const cached = getCachedUserProfile(userId);
    if (cached) {
      setUserData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await fetchUserProfileCached(userId);
      setUserData(data);
    } catch {
      if (!cached) {
        setUserData(EMPTY_USER_PROFILE);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isAuthenticated, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateUserData = useCallback(
    (patch: Partial<UserProfileData>) => {
      if (!userId) return;
      setUserData((prev) => {
        const next = { ...prev, ...patch };
        setCachedUserProfile(userId, next);
        return next;
      });
    },
    [userId]
  );

  return { userData, isLoading, updateUserData, refresh: loadProfile };
}
