import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  User,
  Building2,
  CheckCircle2,
} from 'lucide-react';

import { supabase, getFriendlyError } from '../lib/supabase';
import type { Department } from '../types/database';
import { getDashboardRoute } from '../lib/permissions';

const departments: {
  value: Department;
  label: string;
}[] = [
  {
    value: 'finance',
    label: 'Finance',
  },
  {
    value: 'butchery',
    label: 'Butchery',
  },
  {
    value: 'other',
    label: 'Other Department',
  },
];

export function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [department, setDepartment] =
    useState<Department>('finance');

  const [otherDepartment, setOtherDepartment] =
    useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [
    emailConfirmationRequired,
    setEmailConfirmationRequired,
  ] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccess(false);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtherDepartment =
      otherDepartment.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!department) {
      setError('Please select your department.');
      return;
    }

    if (
      department === 'other' &&
      !cleanOtherDepartment
    ) {
      setError('Please enter your department name.');
      return;
    }

    if (!password) {
      setError('Please create a password.');
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must contain at least 6 characters.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              department,
              department_name:
                department === 'other'
                  ? cleanOtherDepartment
                  : null,
              role: 'user',
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.user) {
        throw new Error(
          'The account could not be created. Please try again.',
        );
      }

      /*
       * Supabase email confirmation is enabled.
       */
      if (!data.session) {
        setEmailConfirmationRequired(true);
        setSuccess(true);
        return;
      }

      /*
       * Create or update profile.
       */
      const { error: profileError } =
        await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              email: cleanEmail,
              full_name: cleanName,
              department,
              role: 'user',
              avatar_url: null,
              is_active: true,
              notification_preferences: {
                order_updates: true,
                new_orders: true,
                completed_orders: true,
              },
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: 'id',
            },
          );

      if (profileError) {
        console.error(
          'Profile creation error:',
          profileError,
        );

        throw new Error(
          'Your account was created, but your profile could not be created. Please contact the system administrator.',
        );
      }

      setSuccess(true);

      setTimeout(() => {
        navigate(
          getDashboardRoute(department),
          {
            replace: true,
          },
        );
      }, 800);
    } catch (err) {
      console.error(
        'Registration error:',
        err,
      );

      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * SUCCESS SCREEN
   * ============================================================
   */

  if (success) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
        <div className="flex min-h-screen items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">

            {/* Logo */}
            <div className="mb-7 flex justify-center">
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

            {/* Success card */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.07)]">

              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-[#0A2E24]">
                Account created
              </h1>

              {emailConfirmationRequired ? (
                <>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Your SOMS account has been created
                    successfully.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Please check your email and confirm
                    your address before signing in.
                  </p>

                  <Link
                    to="/login"
                    className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0A2E24] text-sm font-bold text-white shadow-lg transition hover:bg-[#0D3D2F]"
                  >
                    Go to sign in
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Your account has been created.
                  Redirecting you to your dashboard...
                </p>
              )}

            </div>

            <p className="mt-6 text-center text-[11px] font-medium text-slate-400">
              SOMS © 2026
            </p>

          </div>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * REGISTER PAGE
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">

      {/* Background decoration */}
      <div className="pointer-events-none fixed -right-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/5 blur-[100px]" />

      <div className="pointer-events-none fixed -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#D6A84F]/5 blur-[100px]" />

      <div className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">

        <div className="w-full max-w-[620px]">

          {/* ====================================================
              TOP BRAND
          ===================================================== */}

          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A2E24] shadow-lg shadow-emerald-950/10">
                <span className="text-lg font-black text-white">
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

          {/* ====================================================
              REGISTER CARD
          ===================================================== */}

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.07)]">

            {/* ==================================================
                REGISTER HEADER
            ================================================== */}

            <div className="relative overflow-hidden bg-[#0A2E24] px-7 py-7 sm:px-9">

              {/* Decorative glow */}
              <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#D6A84F]/10 blur-3xl" />

              <div className="relative">

                {/* Gold accent */}
                <div className="mb-4 h-1 w-9 rounded-full bg-[#D6A84F]" />

                {/* Heading */}
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Create your account
                </h1>

                {/* Subtitle */}
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Set up your SOMS account to get started.
                </p>

              </div>
            </div>

            {/* ==================================================
                FORM CONTENT
            ================================================== */}

            <div className="px-7 py-7 sm:px-9 sm:py-8">

              {/* Error */}
              {error && (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* =================================================
                    NAME + EMAIL
                ================================================== */}

                <div className="grid gap-5 sm:grid-cols-2">

                  {/* NAME */}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Full name
                    </label>

                    <div className="group relative">

                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-500" />

                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(event) =>
                          setFullName(
                            event.target.value,
                          )
                        }
                        placeholder="Your full name"
                        autoComplete="name"
                        disabled={loading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label
                      htmlFor="registerEmail"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Email address
                    </label>

                    <div className="group relative">

                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-500" />

                      <input
                        id="registerEmail"
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target.value,
                          )
                        }
                        placeholder="you@company.com"
                        autoComplete="email"
                        disabled={loading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                    </div>
                  </div>

                </div>

                {/* =================================================
                    DEPARTMENT
                ================================================== */}

                <div>

                  <label
                    htmlFor="department"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Department
                  </label>

                  <div className="group relative">

                    <Building2 className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-500" />

                    <select
                      id="department"
                      value={department}
                      onChange={(event) =>
                        setDepartment(
                          event.target
                            .value as Department,
                        )
                      }
                      disabled={loading}
                      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {departments.map(
                        (item) => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        ),
                      )}
                    </select>

                    <ArrowRight className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />

                  </div>
                </div>

                {/* =================================================
                    OTHER DEPARTMENT
                ================================================== */}

                {department === 'other' && (
                  <div>

                    <label
                      htmlFor="otherDepartment"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Department name
                    </label>

                    <div className="group relative">

                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-500" />

                      <input
                        id="otherDepartment"
                        type="text"
                        value={otherDepartment}
                        onChange={(event) =>
                          setOtherDepartment(
                            event.target.value,
                          )
                        }
                        placeholder="e.g. Kitchen, Catering, Operations"
                        autoComplete="organization"
                        disabled={loading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                    </div>
                  </div>
                )}

                {/* =================================================
                    PASSWORDS
                ================================================== */}

                <div className="grid gap-5 sm:grid-cols-2">

                  {/* PASSWORD */}
                  <div>

                    <label
                      htmlFor="registerPassword"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Password
                    </label>

                    <div className="group relative">

                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-500" />

                      <input
                        id="registerPassword"
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value,
                          )
                        }
                        placeholder="Create password"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (value) => !value,
                          )
                        }
                        disabled={loading}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-emerald-600"
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

                  {/* CONFIRM PASSWORD */}
                  <div>

                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Confirm password
                    </label>

                    <div className="group relative">

                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-500" />

                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword
                            ? 'text'
                            : 'password'
                        }
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(
                            event.target.value,
                          )
                        }
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (value) => !value,
                          )
                        }
                        disabled={loading}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-emerald-600"
                        aria-label={
                          showConfirmPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>

                    </div>
                  </div>

                </div>

                {/* =================================================
                    SUBMIT
                ================================================== */}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0A2E24] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0D3D2F] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

              </form>

              {/* =================================================
                  LOGIN LINK
              ================================================== */}

              <div className="mt-6 border-t border-slate-100 pt-5 text-center">

                <p className="text-sm text-slate-500">
                  Already have an account?
                </p>

                <Link
                  to="/login"
                  className="mt-1.5 inline-flex items-center gap-1 text-sm font-bold text-emerald-600 transition hover:text-emerald-500"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>

              </div>

            </div>

          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-[11px] font-medium text-slate-400">
            SOMS © 2026
          </p>

        </div>

      </div>
    </main>
  );
}

export default Register;