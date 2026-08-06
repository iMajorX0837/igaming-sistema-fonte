import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchBetHistoryCached,
  getCachedBetHistory,
  type BetHistoryItem,
} from '../lib/userProfileCache';

export function useBetHistory(period: string, enabled = true) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;

  const [betHistory, setBetHistory] = useState<BetHistoryItem[]>(() => {
    if (!userId) return [];
    return getCachedBetHistory(userId, period) ?? [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled || !isAuthenticated || !userId) return false;
    return !getCachedBetHistory(userId, period);
  });

  const loadHistory = useCallback(async () => {
    if (!enabled || !isAuthenticated || !userId) {
      setBetHistory([]);
      setIsLoading(false);
      return;
    }

    const cached = getCachedBetHistory(userId, period);
    if (cached) {
      setBetHistory(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await fetchBetHistoryCached(userId, period);
      setBetHistory(data);
    } catch {
      if (!cached) {
        setBetHistory([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isAuthenticated, userId, period]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return { betHistory, isLoading, refresh: loadHistory };
}
