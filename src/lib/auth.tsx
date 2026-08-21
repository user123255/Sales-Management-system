import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { Session, User } from '@supabase/supabase-js';

import { supabase, getFriendlyError } from './supabase';
import type {
  Department,
  UserRole,
  NotificationPreferences,
} from '../types/database';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: Department;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;

  signIn: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<void>;

  signUp: (
    email: string,
    password: string,
    fullName: string,
    department: Department
  ) => Promise<void>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;

  updateProfile: (updates: Partial<Profile>) => Promise<void>;

  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  order_updates: true,
  new_orders: true,
  completed_orders: true,
};

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the user's profile from Supabase.
   */
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return data as Profile;
  }, []);

  /**
   * Refresh the currently authenticated user's profile.
   */
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await fetchProfile(user.id);

    setProfile(profileData);
  }, [user, fetchProfile]);

  /**
   * Initialize authentication state.
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profileData = await fetchProfile(
            currentSession.user.id
          );

          if (mounted) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error);

        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profileData = await fetchProfile(
            currentSession.user.id
          );

          if (mounted) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Sign in an existing user.
   */
  const signIn = async (
    email: string,
    password: string,
    _remember = true
  ) => {
    const cleanEmail = email.trim().toLowerCase();

    const { error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (error) {
      throw new Error(getFriendlyError(error));
    }
  };

  /**
   * Create a new user account and corresponding profile.
   */
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    department: Department
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      throw new Error('Email address is required.');
    }

    if (!cleanName) {
      throw new Error('Full name is required.');
    }

    if (password.length < 6) {
      throw new Error(
        'Password must be at least 6 characters.'
      );
    }

    if (!department) {
      throw new Error('Please select a department.');
    }

    const {
      data: signUpData,
      error: signUpError,
    } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          department,
        },
      },
    });

    if (signUpError) {
      throw new Error(getFriendlyError(signUpError));
    }

    /**
     * If Supabase immediately returns a user/session,
     * create the profile now.
     *
     * If email confirmation is enabled, session may be null.
     * In that case the database trigger should create the
     * profile, or the profile can be created after confirmation.
     */
    if (signUpData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: signUpData.user.id,
            email: cleanEmail,
            full_name: cleanName,
            department,
            role: 'user' as UserRole,
            avatar_url: null,
            is_active: true,
            notification_preferences:
              DEFAULT_NOTIFICATION_PREFERENCES,
          },
          {
            onConflict: 'id',
          }
        );

      if (profileError) {
        console.error(
          'Profile creation failed:',
          profileError
        );

        throw new Error(
          'Your account was created, but your profile could not be created. Please contact an administrator.'
        );
      }
    }
  };

  /**
   * Sign out the current user.
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(getFriendlyError(error));
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  /**
   * Update the current user's profile.
   */
  const updateProfile = async (
    updates: Partial<Profile>
  ) => {
    if (!user) {
      throw new Error('Not authenticated.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      throw new Error(getFriendlyError(error));
    }

    await refreshProfile();
  };

  /**
   * Change the authenticated user's password.
   */
  const changePassword = async (
    newPassword: string
  ) => {
    if (newPassword.length < 6) {
      throw new Error(
        'Password must be at least 6 characters.'
      );
    }

    const { error } =
      await supabase.auth.updateUser({
        password: newPassword,
      });

    if (error) {
      throw new Error(getFriendlyError(error));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}