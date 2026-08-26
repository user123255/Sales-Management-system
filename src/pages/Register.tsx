
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
  Building2,
  CheckCircle2,
} from 'lucide-react';

import { supabase, getFriendlyError } from '../lib/supabase';
import type { Department } from '../types/database';

const departments: {
  value: Department;
  label: string;
  description: string;
}[] = [
  {
    value: 'finance',
    label: 'Finance',
    description:
      'Orders, invoices, payments and debtor accounts',
  },
  {
    value: 'butchery',
    label: 'Butchery',
    description:
      'Orders, products, preparation and inventory',
  },
  {
    value: 'other',
    label: 'Other Department',
    description:
      'Create and manage departmental orders',
  },
];

export function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] =
    useState<Department>('finance');

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

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccess(false);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
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

    if (!department) {
      setError('Please select your department.');
      return;
    }

    try {
      setLoading(true);

      /*
       * =====================================================
       * CREATE SUPABASE AUTH ACCOUNT
       * =====================================================
       *
       * The database trigger created in Supabase will
       * automatically create the corresponding profiles
       * record using this metadata.
       */

      const {
        data,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            department,
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
       * =====================================================
       * PROFILE CREATION
       * =====================================================
       *
       * DO NOT INSERT INTO profiles here.
       *
       * Supabase now handles this automatically through the
       * database trigger:
       *
       * on_auth_user_created
       *
       * This prevents browser-side RLS problems.
       */

      /*
       * =====================================================
       * SIGN OUT
       * =====================================================
       *
       * Registration should finish at the login page.
       */

      await supabase.auth.signOut();

      /*
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      setSuccess(true);

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            registered: true,
            email: cleanEmail,
          },
        });
      }, 1200);
    } catch (err) {
      console.error(
        '[SOMS] Registration error:',
        err,
      );

      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * SUCCESS SCREEN
   * =========================================================
   */

  if (success) {
    return (
      <main className="min-h-screen bg-[#F8F6F1] flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl border border-[#E5E0D8]">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#287A52]/10">
            <CheckCircle2 className="h-8 w-8 text-[#287A52]" />
          </div>

          <h1 className="text-2xl font-bold text-[#20252B]">
            Account Created
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#667085]">
            Your SOMS account has been created successfully.
          </p>

          <p className="mt-2 text-sm leading-6 text-[#667085]">
            Your department has been assigned to your
            account. Please sign in using the email and
            password you just created.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-[#287A52]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Returning to login...
          </div>

        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * REGISTRATION PAGE
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#20252B]">

      <div className="min-h-screen flex">

        {/* =====================================================
            BRAND PANEL
        ====================================================== */}

        <section className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-[#641923] via-[#7A1F2B] to-[#8B2635] relative overflow-hidden">

          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#C89B3C]/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg">
                <span className="text-xl font-black text-[#7A1F2B]">
                  S
                </span>
              </div>

              <div>
                <p className="text-lg font-bold text-white">
                  SOMS
                </p>

                <p className="text-xs text-white/70">
                  Sales & Order Management System
                </p>
              </div>

            </div>

            <div className="max-w-md">

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E6C36A]">
                Create your account
              </p>

              <h2 className="mt-4 text-4xl font-bold leading-tight text-white">
                Join the SOMS management system.
              </h2>

              <p className="mt-5 text-base leading-7 text-white/75">
                Create your departmental account and use
                your credentials to sign in securely.
              </p>

              <div className="mt-8 space-y-4">

                <div className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="h-5 w-5 text-[#E6C36A]" />
                  <span className="text-sm">
                    Department-based access
                  </span>
                </div>

                <div className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="h-5 w-5 text-[#E6C36A]" />
                  <span className="text-sm">
                    Secure account authentication
                  </span>
                </div>

                <div className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="h-5 w-5 text-[#E6C36A]" />
                  <span className="text-sm">
                    Orders, inventory and reporting
                  </span>
                </div>

              </div>

            </div>

            <p className="text-xs text-white/50">
              SOMS • Internal Management Platform
            </p>

          </div>
        </section>

        {/* =====================================================
            REGISTRATION FORM
        ====================================================== */}

        <section className="flex flex-1 items-center justify-center px-6 py-10">

          <div className="w-full max-w-xl">

            <div className="mb-8">

              <div className="flex items-center gap-3 lg:hidden mb-8">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7A1F2B]">
                  <span className="text-lg font-black text-white">
                    S
                  </span>
                </div>

                <div>
                  <p className="font-bold text-[#20252B]">
                    SOMS
                  </p>

                  <p className="text-xs text-[#667085]">
                    Sales & Order Management System
                  </p>
                </div>

              </div>

              <p className="text-sm font-semibold text-[#7A1F2B]">
                Account registration
              </p>

              <h1 className="mt-2 text-3xl font-bold text-[#20252B]">
                Create your account
              </h1>

              <p className="mt-2 text-sm text-[#667085]">
                Enter your information below to create
                your SOMS account.
              </p>

            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* FULL NAME */}

              <div>

                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold text-[#344054]"
                >
                  Full name
                </label>

                <div className="relative">

                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98A2B3]" />

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Enter your full name"
                    disabled={loading}
                    autoComplete="name"
                    className="h-12 w-full rounded-xl border border-[#D0D5DD] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/10 disabled:bg-gray-100"
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#344054]"
                >
                  Email address
                </label>

                <div className="relative">

                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98A2B3]" />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    disabled={loading}
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-[#D0D5DD] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/10 disabled:bg-gray-100"
                  />

                </div>

              </div>

              {/* DEPARTMENT */}

              <div>

                <label
                  htmlFor="department"
                  className="mb-2 block text-sm font-semibold text-[#344054]"
                >
                  Department
                </label>

                <div className="relative">

                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98A2B3]" />

                  <select
                    id="department"
                    value={department}
                    onChange={(event) =>
                      setDepartment(
                        event.target.value as Department,
                      )
                    }
                    disabled={loading}
                    className="h-12 w-full appearance-none rounded-xl border border-[#D0D5DD] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/10 disabled:bg-gray-100"
                  >
                    {departments.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>

                </div>

                <p className="mt-2 text-xs text-[#667085]">
                  {
                    departments.find(
                      (item) =>
                        item.value === department,
                    )?.description
                  }
                </p>

              </div>

              {/* PASSWORD */}

              <div>

                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[#344054]"
                >
                  Password
                </label>

                <div className="relative">

                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98A2B3]" />

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
                    placeholder="Create a password"
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-[#D0D5DD] bg-white pl-12 pr-12 text-sm outline-none transition focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/10 disabled:bg-gray-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value,
                      )
                    }
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#667085] hover:bg-gray-100"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>

                </div>

                <p className="mt-2 text-xs text-[#667085]">
                  Password must contain at least 6 characters.
                </p>

              </div>

              {/* CONFIRM PASSWORD */}

              <div>

                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-[#344054]"
                >
                  Confirm password
                </label>

                <div className="relative">

                  <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98A2B3]" />

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
                    placeholder="Confirm your password"
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-[#D0D5DD] bg-white pl-12 pr-12 text-sm outline-none transition focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/10 disabled:bg-gray-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value,
                      )
                    }
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#667085] hover:bg-gray-100"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>

                </div>

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#641923] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}

              </button>

            </form>

            {/* LOGIN LINK */}

            <div className="mt-8 text-center">

              <p className="text-sm text-[#667085]">
                Already have an account?{' '}

                <Link
                  to="/login"
                  className="font-semibold text-[#7A1F2B] hover:underline"
                >
                  Sign in
                </Link>

              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

export default Register;

