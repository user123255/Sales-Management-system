import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ArrowRight,
} from 'lucide-react';

import { supabase, getFriendlyError } from '../lib/supabase';
import { getDashboardRoute } from '../lib/permissions';

export function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      if (!data.user) {
        throw new Error(
          'Unable to sign in. Please try again.'
        );
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('department, role, is_active')
          .eq('id', data.user.id)
          .single();

      if (profileError) {
        console.error(
          'Profile loading error:',
          profileError
        );

        throw new Error(
          'Your account was authenticated, but your profile could not be loaded.'
        );
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();

        throw new Error(
          'Your account is currently inactive. Please contact the system administrator.'
        );
      }

      const department = profile?.department;

      if (!department) {
        throw new Error(
          'Your account does not have a department assigned. Please contact the system administrator.'
        );
      }

      if (rememberMe) {
        localStorage.setItem(
          'soms_remember_me',
          'true'
        );
      } else {
        localStorage.removeItem(
          'soms_remember_me'
        );
      }

      navigate(
        getDashboardRoute(department),
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error('Login error:', err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white font-sans antialiased text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">

        {/* =====================================================
            LEFT BRANDING PANEL
        ====================================================== */}

        <section className="hidden min-h-screen flex-1 bg-white p-5 lg:flex">

          <div className="relative flex h-full w-full overflow-hidden rounded-[2rem] bg-[#0A2E24]">

            {/* Ambient glow */}

            <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-[100px]" />

            <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-[#D6A84F]/10 blur-[100px]" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[100px]" />

            {/* Subtle pattern */}

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.045]"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(107, 5, 5, 0.9) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />

            {/* Branding content */}

            <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">

              {/* LOGO */}

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-950/30">
                  <span className="text-xl font-black text-white">
                    S
                  </span>
                </div>

                <div>
                  <p className="text-lg font-black tracking-tight text-white">
                    SOMS
                  </p>

                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-200/60">
                    Sales &amp; Order Management System
                  </p>
                </div>

              </div>

              {/* CENTER MESSAGE */}

              <div className="max-w-lg">

                <div className="mb-5 h-1 w-10 rounded-full bg-[#D6A84F]" />

                <h1 className="text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
                  One system.
                  <br />

                  <span className="text-emerald-300">
                    Every department.
                  </span>
                </h1>

                <p className="mt-5 max-w-md text-sm leading-6 text-emerald-50/60">
                  A simple platform for managing
                  orders, coordinating operations and
                  keeping every department connected.
                </p>

              </div>

              {/* FOOTER */}

              <div className="flex items-end justify-between border-t border-white/10 pt-5">

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/50">
                  Department Operations
                </p>

                <p className="text-xs font-medium text-white/40">
                  SOMS © 2026
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            RIGHT LOGIN SIDE
        ====================================================== */}

        <section className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[#F8FAFC] px-5 py-10 sm:px-8 lg:px-12 xl:px-16">

          {/* Background decoration */}

          <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/5 blur-[100px]" />

          <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#D6A84F]/5 blur-[100px]" />

          <div className="relative z-10 w-full max-w-[420px]">

            {/* Mobile logo */}

            <div className="mb-8 flex items-center justify-center lg:hidden">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A2E24] shadow-lg">
                  <span className="text-xl font-black text-white">
                    S
                  </span>
                </div>

                <div>
                  <p className="text-lg font-black tracking-tight text-[#0A2E24]">
                    SOMS
                  </p>

                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Sales &amp; Order Management
                  </p>
                </div>

              </div>

            </div>

            {/* LOGIN CARD */}

            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.07)] sm:p-9">

              {/* Header */}

              <div className="mb-7">

                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">

                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

                </div>

                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>

                <p className="mt-1.5 text-sm text-slate-500">
                  Sign in to continue to SOMS.
                </p>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* EMAIL */}

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Email address
                  </label>

                  <div className="group relative">

                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="you@company.com"
                      autoComplete="email"
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                </div>

                {/* PASSWORD */}

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Password
                  </label>

                  <div className="group relative">

                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-emerald-600 disabled:cursor-not-allowed"
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>

                  </div>

                </div>

                {/* OPTIONS */}

                <div className="flex items-center justify-between">

                  <label className="flex cursor-pointer items-center gap-2">

                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) =>
                        setRememberMe(
                          event.target.checked
                        )
                      }
                      disabled={loading}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />

                    <span className="text-xs font-medium text-slate-500">
                      Remember me
                    </span>

                  </label>

                  <Link
                    to="/auth/forgotpassword"
                    className="text-xs font-bold text-emerald-600 transition hover:text-emerald-500"
                  >
                    Forgot password?
                  </Link>

                </div>

                {/* SIGN IN */}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0A2E24] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0D3D2F] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

              </form>

              {/* REGISTER */}

              <div className="mt-7 border-t border-slate-100 pt-6 text-center">

                <p className="text-sm text-slate-500">
                  Don't have an account?
                </p>

                <Link
                  to="/register"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-emerald-600 transition hover:text-emerald-500"
                >
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>

              </div>

            </div>

            {/* COPYRIGHT */}

            <p className="mt-6 text-center text-[11px] font-medium text-slate-400">
              SOMS © 2026
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}