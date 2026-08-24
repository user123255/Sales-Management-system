import { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  Moon,
  Settings,
  User,
} from 'lucide-react';

import { useAuth } from '../lib/auth';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { profile } = useAuth();

  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">

        {/* Mobile Menu */}
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-text hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>


        {/* Page title area */}
        <div className="hidden lg:block">
          <h2 className="text-sm font-semibold text-text">
            Sales & Order Management System
          </h2>

          <p className="text-xs text-text-muted">
            Enterprise order management platform
          </p>
        </div>


        {/* Right actions */}
        <div className="ml-auto flex items-center gap-3">

          {/* Dark mode button */}
          <button
            type="button"
            className="rounded-lg p-2 text-text-muted transition hover:bg-slate-100 hover:text-text"
          >
            <Moon className="h-5 w-5" />
          </button>


          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-lg p-2 text-text-muted transition hover:bg-slate-100 hover:text-text"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>


          {/* Profile */}
          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setShowProfile(!showProfile)
              }
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            >

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                {profile?.full_name
                  ?.charAt(0)
                  ?.toUpperCase() || 'U'}
              </div>


              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-text">
                  {profile?.full_name || 'User'}
                </p>

                <p className="text-xs text-text-muted">
                  {profile?.role || 'Staff'}
                </p>
              </div>


              <ChevronDown className="h-4 w-4 text-text-muted" />

            </button>


            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-white p-2 shadow-lg">

                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text hover:bg-slate-50"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>


                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>

              </div>
            )}

          </div>

        </div>

      </div>
    </header>
  );
}

export default Navbar;