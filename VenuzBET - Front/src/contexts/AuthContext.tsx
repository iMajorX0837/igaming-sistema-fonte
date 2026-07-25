import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { clearUserProfileCaches } from '../lib/userProfileCache';
import { getTrackingParamsForSignup } from '../lib/trackingParams';
import { mapAuthError } from '../lib/authErrors';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    cpf: string,
    email: string,
    phone: string,
    password: string,
    referralCode?: string,
    usuarioNome?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(mapSupabaseUserToUser(session.user));
      } else if (event !== 'INITIAL_SESSION') {
        clearUserProfileCaches();
        setUser(null);
      }

      // INITIAL_SESSION dispara com memória vazia (cookies HttpOnly) — aguarda validateSession.
      if (event !== 'INITIAL_SESSION') {
        setLoading(false);
      }
    });

    void supabase.auth.validateSession().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const mapSupabaseUserToUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.email?.split('@')[0] || '',
    };
  };

  const login = async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      throw new Error('Informe seu e-mail e senha para continuar.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('E-mail inválido. Verifique o endereço digitado.');
    }

    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      throw new Error(mapAuthError(error, 'Não foi possível fazer login. Tente novamente.'));
    }

    if (!data.session?.user) {
      throw new Error('Não foi possível iniciar a sessão. Tente novamente.');
    }

    if (data.user) {
      setUser(mapSupabaseUserToUser(data.user));
    }
  };

  const register = async (
    cpf: string,
    email: string,
    phone: string,
    password: string,
    referralCode?: string,
    usuarioNome?: string
  ) => {
    const trimmedEmail = email.trim();
    const cpfDigits = cpf.replace(/\D/g, '');
    const phoneDigits = phone.replace(/\D/g, '');

    if (!cpfDigits || !trimmedEmail || !phoneDigits || !password) {
      throw new Error('Preencha todos os campos para criar sua conta.');
    }

    if (cpfDigits.length !== 11) {
      throw new Error('CPF inválido. Digite os 11 números corretamente.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('E-mail inválido. Verifique o endereço digitado.');
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      throw new Error('Telefone inválido. Use DDD + número (10 ou 11 dígitos).');
    }

    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    // Extrai o usuario do email (parte antes do @)
    // Exemplo: pedro-ferreira@gmail.com -> pedro-ferreira
    const usuario = trimmedEmail.split('@')[0];

    const trimmedNome = usuarioNome?.trim() || '';
    const tracking = getTrackingParamsForSignup();

    // Criar usuário no Supabase
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          cpf: cpfDigits,
          phone: phoneDigits,
          usuario,
          referral_code: referralCode || null,
          ...(trimmedNome ? { usuario_nome: trimmedNome } : {}),
          ...tracking,
        },
      },
    });

    if (error) {
      throw new Error(mapAuthError(error, 'Não foi possível criar sua conta. Tente novamente.'));
    }

    if (data.user) {
      // O trigger handle_new_user vai inserir os dados automaticamente
      // incluindo o código de indicação se fornecido
      // Não precisamos fazer upsert manual aqui, o trigger cuida disso
      
      setUser(mapSupabaseUserToUser(data.user));
    }
  };

  const logout = async () => {
    const userId = user?.id;
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message || 'Erro ao fazer logout');
    }
    clearUserProfileCaches(userId);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
