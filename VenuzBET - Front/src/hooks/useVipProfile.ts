import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  VIP_PROFILE_UPDATED_EVENT,
  type VipNivelRow,
  type VipProfile,
  getVipImageUrl,
} from '../lib/vip';

const DEFAULT_PROFILE: VipProfile = {
  ok: false,
  vip_nivel: 1,
  vip_nome: 'Bronze 1',
  vip_grupo: 'bronze',
  vip_imagem: getVipImageUrl('bronze'),
  vip_cor: 'rgb(255, 146, 17)',
  cashback_pct: 0,
  total_depositado: 0,
  deposito_minimo_atual: 0,
  proximo_nivel: 2,
  proximo_nome: 'Bronze 2',
  proximo_deposito_minimo: 100,
  falta_para_proximo: 100,
  progresso_pct: 0,
};

export function useVipProfile() {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<VipProfile>(DEFAULT_PROFILE);
  const [niveis, setNiveis] = useState<VipNivelRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNiveis = useCallback(async () => {
    const { data, error } = await supabase
      .from('vip_niveis')
      .select('*')
      .order('nivel', { ascending: true });

    if (!error && data) {
      setNiveis(data as VipNivelRow[]);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(DEFAULT_PROFILE);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('obter_vip_usuario');
      if (error) {
        console.error('obter_vip_usuario:', error);
        return;
      }

      const row = data as VipProfile | null;
      if (row?.ok) {
        setProfile({
          ...row,
          vip_imagem: row.vip_imagem || getVipImageUrl(row.vip_grupo || 'bronze'),
        });
      }
    } catch (err) {
      console.error('Erro ao buscar VIP:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchNiveis();
  }, [fetchNiveis]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handler = () => {
      void fetchProfile();
    };
    document.addEventListener(VIP_PROFILE_UPDATED_EVENT, handler);
    return () => document.removeEventListener(VIP_PROFILE_UPDATED_EVENT, handler);
  }, [fetchProfile]);

  return { profile, niveis, loading, refresh: fetchProfile };
}
