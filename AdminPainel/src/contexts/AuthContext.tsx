import { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { adminPageCache } from '../lib/adminPageCache';
import { logAdminAction } from '../lib/adminLogger';
import { initClientInfo } from '../lib/clientInfo';
import { AdminUser, mapSupabaseUserToUser } from '../lib/userCargo';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** true após get_user_cargo confirmar cargo no servidor (M3) */
  cargoVerified: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA: boolean; challengeToken?: string }>;
  verify2FA: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  loadingCargo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_INIT_TIMEOUT_MS = 12_000;

const shouldIgnoreAuthEvent = (event: string, hasUser: boolean): boolean => {
  if (event === 'TOKEN_REFRESHED') return true;
  if (event === 'USER_UPDATED' && hasUser) return true;
  return false;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCargo, setLoadingCargo] = useState(false);
  const [cargoVerified, setCargoVerified] = useState(false);

  const mountedRef = useRef(true);
  const initializationCompleteRef = useRef(false);
  const userRef = useRef<AdminUser | null>(null);

  const applyUserUpdate = (nextUser: AdminUser | null) => {
    userRef.current = nextUser;
    setUser(nextUser);
  };

  useEffect(() => {
    mountedRef.current = true;
    initializationCompleteRef.current = false;
    void initClientInfo();

    let initTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const finishInitialLoading = () => {
      if (!mountedRef.current || initializationCompleteRef.current) return;
      initializationCompleteRef.current = true;
      setLoading(false);
    };

    const resolveUserFromSession = async (
      supabaseUser: Parameters<typeof mapSupabaseUserToUser>[0]
    ) => {
      if (!mountedRef.current) return null;

      setLoadingCargo(true);
      setCargoVerified(false);

      try {
        const resolvedUser = await mapSupabaseUserToUser(supabaseUser);
        if (mountedRef.current) {
          applyUserUpdate(resolvedUser);
          setCargoVerified(true);
        }
        return resolvedUser;
      } catch (error) {
        console.error('[AuthContext] Erro ao resolver cargo:', error);
        if (mountedRef.current) {
          applyUserUpdate(null);
          setCargoVerified(false);
        }
        return null;
      } finally {
        if (mountedRef.current) {
          setLoadingCargo(false);
        }
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await Promise.race([
          supabase.auth.validateSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('validateSession timeout')), SESSION_INIT_TIMEOUT_MS)
          ),
        ]);

        if (!mountedRef.current) return;

        if (error) {
          console.error('[AuthContext] Erro ao verificar sessão:', error);
          applyUserUpdate(null);
          setCargoVerified(true);
          finishInitialLoading();
          return;
        }

        if (session?.user) {
          await resolveUserFromSession(session.user);
        } else {
          applyUserUpdate(null);
          setCargoVerified(true);
        }

        finishInitialLoading();
      } catch (error) {
        console.warn('[AuthContext] initializeAuth falhou, aguardando onAuthStateChange:', error);
        applyUserUpdate(null);
        setCargoVerified(true);
        initTimeoutId = setTimeout(() => {
          if (mountedRef.current && !initializationCompleteRef.current) {
            console.warn('[AuthContext] Timeout de inicialização, liberando UI');
            finishInitialLoading();
          }
        }, SESSION_INIT_TIMEOUT_MS);
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      if (shouldIgnoreAuthEvent(event, !!session?.user)) {
        return;
      }

      if (session?.user) {
        try {
          await resolveUserFromSession(session.user);
        } catch (error) {
          console.error('[AuthContext] Erro ao resolver usuário:', error);
          if (!initializationCompleteRef.current) {
            applyUserUpdate(null);
            setCargoVerified(false);
          }
        }
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session?.user)) {
        if (event === 'SIGNED_OUT') {
          adminPageCache.clear();
        }
        applyUserUpdate(null);
        setCargoVerified(true);
        setLoadingCargo(false);
      }

      finishInitialLoading();
    });

    return () => {
      mountedRef.current = false;
      if (initTimeoutId) clearTimeout(initTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Erro ao fazer login');
    }

    if (data.requires2FA && data.challengeToken) {
      return { requires2FA: true, challengeToken: data.challengeToken };
    }

    if (data.user) {
      setLoadingCargo(true);
      setCargoVerified(false);

      const userData = await mapSupabaseUserToUser(data.user);

      if (!userData.cargo || userData.cargo !== 'admin') {
        await supabase.auth.signOut();
        setCargoVerified(false);
        setLoadingCargo(false);
        throw new Error('Esta conta não possui permissões de administrador');
      }

      applyUserUpdate(userData);
      setCargoVerified(true);
      initializationCompleteRef.current = true;
      setLoading(false);
      setLoadingCargo(false);

      void logAdminAction({
        acao: 'Login no painel admin',
        detalhes: `Acesso realizado por ${email}`,
        categoria: 'sistema',
      });
    }

    return { requires2FA: false };
  };

  const verify2FA = async (challengeToken: string, code: string) => {
    if (!challengeToken || !code) {
      throw new Error('Código de verificação obrigatório');
    }

    const { data, error } = await supabase.auth.verify2FALogin({ challengeToken, code });

    if (error) {
      throw new Error(error.message || 'Código inválido');
    }

    if (data.user) {
      setLoadingCargo(true);
      setCargoVerified(false);

      const userData = await mapSupabaseUserToUser(data.user);

      if (!userData.cargo || userData.cargo !== 'admin') {
        await supabase.auth.signOut();
        setCargoVerified(false);
        setLoadingCargo(false);
        throw new Error('Esta conta não possui permissões de administrador');
      }

      applyUserUpdate(userData);
      setCargoVerified(true);
      initializationCompleteRef.current = true;
      setLoading(false);
      setLoadingCargo(false);

      void logAdminAction({
        acao: 'Login no painel admin (2FA)',
        detalhes: `Acesso com 2FA por ${data.user.email ?? 'admin'}`,
        categoria: 'sistema',
      });
    }
  };

  const logout = async () => {
    const email = userRef.current?.email;

    await logAdminAction({
      acao: 'Logout do painel admin',
      detalhes: email ? `Sessão encerrada por ${email}` : 'Sessão encerrada',
      categoria: 'sistema',
    });

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message || 'Erro ao fazer logout');
    }

    adminPageCache.clear();
    applyUserUpdate(null);
    setCargoVerified(false);
    setLoadingCargo(false);
  };

  const isAdmin = useMemo(
    () => cargoVerified && user?.cargo === 'admin',
    [cargoVerified, user?.cargo]
  );
  const isAuthenticated = useMemo(() => !!user && cargoVerified, [user, cargoVerified]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isAdmin,
      cargoVerified,
      login,
      verify2FA,
      logout,
      loading,
      loadingCargo,
    }),
    [user, isAuthenticated, isAdmin, cargoVerified, loading, loadingCargo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
