import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function MainLayout() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  /*
   * Sidebar state
   *
   * collapsed:
   * Controls desktop sidebar width.
   *
   * sidebarOpen:
   * Controls the mobile sidebar.
   */
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /*
   * Collapse / expand sidebar
   */
  const handleToggleSidebar = () => {
    setCollapsed((current) => !current);
  };

  /*
   * Close mobile sidebar
   */
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  /*
   * Open mobile sidebar
   */
  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };

  /*
   * Sign out
   *
   * We use Supabase directly here so the actual
   * authenticated session is terminated.
   */
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('SIGN OUT ERROR:', error);
        window.alert(
          error.message || 'Unable to sign out. Please try again.'
        );
        return;
      }

      /*
       * Close the sidebar before leaving the application.
       */
      setSidebarOpen(false);

      /*
       * Send the user to the login page.
       */
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('SIGN OUT ERROR:', error);

      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to sign out. Please try again.'
      );
    }
  };

  /*
   * Determine the current department.
   *
   * Sidebar expects a Department value.
   */
  const department = profile?.department || 'other';

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar
        department={department}
        collapsed={collapsed}
        mobileOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        onToggle={handleToggleSidebar}
        onLogout={handleLogout}
      />

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div
        className={`
          min-h-screen
          transition-all duration-300 ease-out
          ${collapsed ? 'lg:pl-[82px]' : 'lg:pl-[280px]'}
        `}
      >

        {/* ===================================================
            TOP NAVBAR
        =================================================== */}

        <Navbar
          onMenuClick={handleOpenSidebar}
        />

        {/* ===================================================
            PAGE CONTENT
        =================================================== */}

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>

      </div>

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={handleCloseSidebar}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

    </div>
  );
}

export default MainLayout;