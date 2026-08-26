import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import {
  supabase,
  getFriendlyError,
} from './supabase';

import type {
  Department,
  UserRole,
  NotificationPreferences,
} from '../types/database';

/* =========================================================
   PROFILE TYPE
========================================================= */

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

/* =========================================================
   AUTH CONTEXT
========================================================= */

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

  updateProfile: (
    updates: Partial<Profile>
  ) => Promise<void>;

  changePassword: (
    newPassword: string
  ) => Promise<void>;
}

/* =========================================================
   CONTEXT
========================================================= */

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

/* =========================================================
   DEFAULT NOTIFICATION SETTINGS
========================================================= */

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences =
  {
    order_updates: true,
    new_orders: true,
    completed_orders: true,
  };

/* =========================================================
   HELPERS
========================================================= */

function getAuthErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error
  ) {
    const message = String(
      (error as { message?: unknown }).message ||
        ''
    );

    const normalized = message.toLowerCase();

    if (
      normalized.includes(
        'invalid login credentials'
      )
    ) {
      return 'Invalid email or password. Please check your email and password and try again.';
    }

    if (
      normalized.includes(
        'email not confirmed'
      )
    ) {
      return 'This account has not been confirmed yet. Disable email confirmation in Supabase Authentication settings to allow immediate login.';
    }

    if (
      normalized.includes(
        'user already registered'
      )
    ) {
      return 'An account with this email already exists. Please sign in instead.';
    }

    if (
      normalized.includes(
        'password should be at least'
      )
    ) {
      return 'Password must be at least 6 characters.';
    }

    return getFriendlyError(
      error as Parameters<
        typeof getFriendlyError
      >[0]
    );
  }

  return 'Authentication failed. Please try again.';
}

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     FETCH PROFILE
  ======================================================= */

  const fetchProfile = useCallback(
    async (
      userId: string
    ): Promise<Profile | null> => {
      if (!userId) {
        return null;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error(
            'Failed to fetch profile:',
            error
          );

          return null;
        }

        if (!data) {
          return null;
        }

        return data as Profile;
      } catch (error) {
        console.error(
          'Profile fetch failed:',
          error
        );

        return null;
      }
    },
    []
  );

  /* =======================================================
     REFRESH PROFILE
  ======================================================= */

  const refreshProfile =
    useCallback(async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      const profileData =
        await fetchProfile(user.id);

      setProfile(profileData);
    }, [user, fetchProfile]);

  /* =======================================================
     INITIALIZE AUTHENTICATION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            console.error(
              'Failed to get authentication session:',
              error
            );
          }

          if (!mounted) {
            return;
          }

          const currentSession =
            data?.session ?? null;

          const currentUser =
            currentSession?.user ?? null;

          setSession(
            currentSession
          );

          setUser(currentUser);

          if (currentUser) {
            const profileData =
              await fetchProfile(
                currentUser.id
              );

            if (mounted) {
              setProfile(
                profileData
              );
            }
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error(
            'Authentication initialization failed:',
            error
          );

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

    void initializeAuth();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (event, currentSession) => {
          if (!mounted) {
            return;
          }

          /*
           * Do not perform another Supabase request
           * directly inside the auth callback.
           *
           * Updating React state here is safer and
           * prevents auth-event loops.
           */

          setSession(
            currentSession ?? null
          );

          setUser(
            currentSession?.user ?? null
          );

          if (!currentSession?.user) {
            setProfile(null);
          }

          setLoading(false);

          /*
           * Profile loading is handled asynchronously
           * outside the callback.
           */
          if (
            currentSession?.user &&
            (
              event === 'SIGNED_IN' ||
              event === 'INITIAL_SESSION' ||
              event === 'TOKEN_REFRESHED' ||
              event === 'USER_UPDATED'
            )
          ) {
            void fetchProfile(
              currentSession.user.id
            ).then((profileData) => {
              if (mounted) {
                setProfile(
                  profileData
                );
              }
            });
          }
        }
      );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /* =======================================================
     SIGN IN
  ======================================================= */

  const signIn = async (
    email: string,
    password: string,
    _remember = true
  ): Promise<void> => {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error(
        'Email address is required.'
      );
    }

    if (!password) {
      throw new Error(
        'Password is required.'
      );
    }

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: cleanEmail,
            password,
          }
        );

      if (error) {
        throw new Error(
          getAuthErrorMessage(error)
        );
      }

      if (!data?.session) {
        throw new Error(
          'Login was not completed. Please check your email, password, and Supabase authentication settings.'
        );
      }

      /*
       * Explicitly synchronize local state.
       * This makes login work even if the auth
       * event arrives slightly later.
       */
      setSession(
        data.session
      );

      setUser(
        data.user ?? null
      );

      if (data.user) {
        const profileData =
          await fetchProfile(
            data.user.id
          );

        setProfile(
          profileData
        );
      }
    } catch (error) {
      console.error(
        'Sign in failed:',
        error
      );

      if (
        error instanceof Error
      ) {
        throw error;
      }

      throw new Error(
        'Unable to sign in. Please try again.'
      );
    }
  };

  /* =======================================================
     SIGN UP
  ======================================================= */

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    department: Department
  ): Promise<void> => {
    const cleanEmail =
      email.trim().toLowerCase();

    const cleanName =
      fullName.trim();

    if (!cleanEmail) {
      throw new Error(
        'Email address is required.'
      );
    }

    if (!cleanName) {
      throw new Error(
        'Full name is required.'
      );
    }

    if (password.length < 6) {
      throw new Error(
        'Password must be at least 6 characters.'
      );
    }

    if (!department) {
      throw new Error(
        'Please select a department.'
      );
    }

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name:
                cleanName,

              department,
            },
          },
        });

      if (error) {
        throw new Error(
          getAuthErrorMessage(
            error
          )
        );
      }

      if (!data?.user) {
        throw new Error(
          'Account creation failed. No user account was returned by Supabase.'
        );
      }

      /*
       * IMPORTANT:
       *
       * If Supabase email confirmation is disabled,
       * data.session will exist immediately and the
       * user can enter SOMS without checking email.
       *
       * If confirmation is enabled, Supabase returns
       * a user but no session. The frontend cannot
       * bypass that server-side setting.
       */

      if (data.session) {
        setSession(
          data.session
        );

        setUser(
          data.user
        );
      }

      /*
       * Try to create/update the profile.
       *
       * This works immediately when a session exists
       * and also works when a database trigger/RLS
       * allows the profile operation.
       */
      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .upsert(
          {
            id:
              data.user.id,

            email:
              cleanEmail,

            full_name:
              cleanName,

            department,

            role:
              'user' as UserRole,

            avatar_url:
              null,

            is_active:
              true,

            notification_preferences:
              DEFAULT_NOTIFICATION_PREFERENCES,
          },
          {
            onConflict: 'id',
          }
        );

      if (profileError) {
        /*
         * Do not claim that account creation failed
         * when only profile creation failed.
         *
         * A database trigger may already create the
         * profile.
         */
        console.warn(
          'Profile creation/upsert failed:',
          profileError
        );
      }

      /*
       * If there is no session, email confirmation is
       * still enabled in Supabase.
       */
      if (!data.session) {
        throw new Error(
          'Account created, but Supabase is requiring email confirmation before login. Disable "Confirm email" in Supabase Authentication settings if users should be able to log in immediately.'
        );
      }

      /*
       * Fetch the final profile.
       */
      const profileData =
        await fetchProfile(
          data.user.id
        );

      setProfile(
        profileData
      );
    } catch (error) {
      console.error(
        'Sign up failed:',
        error
      );

      if (
        error instanceof Error
      ) {
        throw error;
      }

      throw new Error(
        'Unable to create your account.'
      );
    }
  };

  /* =======================================================
     SIGN OUT
  ======================================================= */

  const signOut =
    async (): Promise<void> => {
      try {
        const {
          error,
        } =
          await supabase.auth.signOut();

        if (error) {
          throw new Error(
            getAuthErrorMessage(
              error
            )
          );
        }

        setSession(null);
        setUser(null);
        setProfile(null);
      } catch (error) {
        console.error(
          'Sign out failed:',
          error
        );

        if (
          error instanceof Error
        ) {
          throw error;
        }

        throw new Error(
          'Unable to sign out.'
        );
      }
    };

  /* =======================================================
     UPDATE PROFILE
  ======================================================= */

  const updateProfile =
    async (
      updates: Partial<Profile>
    ): Promise<void> => {
      if (!user) {
        throw new Error(
          'Not authenticated.'
        );
      }

      /*
       * Never allow the client to change the user's
       * primary identity fields accidentally.
       */
      const safeUpdates = {
        ...updates,
        id: undefined,
        created_at: undefined,
        updated_at:
          new Date().toISOString(),
      };

      delete (
        safeUpdates as Partial<Profile>
      ).id;

      delete (
        safeUpdates as Partial<Profile>
      ).created_at;

      const {
        error,
      } = await supabase
        .from('profiles')
        .update(
          safeUpdates
        )
        .eq(
          'id',
          user.id
        );

      if (error) {
        throw new Error(
          getFriendlyError(
            error
          )
        );
      }

      const profileData =
        await fetchProfile(
          user.id
        );

      setProfile(
        profileData
      );
    };

  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  const changePassword =
    async (
      newPassword: string
    ): Promise<void> => {
      if (!user) {
        throw new Error(
          'Not authenticated.'
        );
      }

      if (
        newPassword.length < 6
      ) {
        throw new Error(
          'Password must be at least 6 characters.'
        );
      }

      const {
        error,
      } =
        await supabase.auth.updateUser(
          {
            password:
              newPassword,
          }
        );

      if (error) {
        throw new Error(
          getAuthErrorMessage(
            error
          )
        );
      }
    };

  /* =======================================================
     PROVIDER
  ======================================================= */

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

/* =========================================================
   USE AUTH
========================================================= */

export function useAuth(): AuthContextType {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}