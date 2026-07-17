import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { clearUserProfileCaches } from '../lib/userProfileCache';
import { getTrackingParamsForSignup } from '../lib/trackingParams';
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUserToUser(session.user));
      } else {
        clearUserProfileCaches();
        setUser(null);
      }
      setLoading(false);
    });

    void supabase.auth.validateSession().finally(() => {
      setLoading(false);
    });

    return () => {
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
    if (!cpf || !email || !phone || !password) {
      throw new Error('Todos os campos são obrigatórios');
    }

    // Extrai o usuario do email (parte antes do @)
    // Exemplo: pedro-ferreira@gmail.com -> pedro-ferreira
    const usuario = email.split('@')[0];

    const trimmedNome = usuarioNome?.trim() || '';
    const tracking = getTrackingParamsForSignup();

    // Criar usuário no Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          cpf,
          phone,
          usuario,
          referral_code: referralCode || null,
          ...(trimmedNome ? { usuario_nome: trimmedNome } : {}),
          ...tracking,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Erro ao criar conta');
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
