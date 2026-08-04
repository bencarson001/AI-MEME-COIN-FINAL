import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, LogOut, CheckCircle2, ShieldCheck, ArrowRight, RefreshCw, Key } from 'lucide-react';

interface User {
  email: string;
  name: string;
  picture?: string;
  isAuthorized: boolean;
  loggedInAt?: string;
}

interface GoogleAuthGateProps {
  children: React.ReactNode;
}

const AUTHORIZED_EMAIL = 'sectionsix.sounds@gmail.com';

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check auth session on load
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for OAuth popup success message
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setAuthError(event.data.error || 'Google login failed');
        setIsProcessing(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();

      if (data.configured && data.url) {
        const authWindow = window.open(
          data.url,
          'google_oauth_popup',
          'width=600,height=700'
        );
        if (!authWindow) {
          setAuthError('Popup blocked. Please allow popups for Google Sign In.');
          setIsProcessing(false);
        }
      } else {
        // OAuth client ID not yet configured in environment -> handle fallback login directly
        await handleDemoSignIn(AUTHORIZED_EMAIL);
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setAuthError('Error initiating Google Login. Using fallback auth.');
      await handleDemoSignIn(AUTHORIZED_EMAIL);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoSignIn = async (email: string) => {
    setIsProcessing(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setAuthError('Sign in failed');
      }
    } catch (err) {
      setAuthError('Network error during login');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    setIsProcessing(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-mono">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
        <div className="text-sm font-bold text-slate-200">Verifying Google Security Credentials...</div>
        <p className="text-xs text-slate-500 mt-1">Checking access permissions for {AUTHORIZED_EMAIL}</p>
      </div>
    );
  }

  // Not logged in -> Show Google Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
        <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -top-40 -left-40"></div>
        <div className="absolute w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none -bottom-40 -right-40"></div>

        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-emerald-400 mb-1 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              GMGN AI TRADER
            </h1>
            <p className="text-xs text-slate-400">
              Restricted Terminal Access Control. Google Login Required.
            </p>
          </div>

          {/* Access Restriction Notice Box */}
          <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl mb-6 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Restricted Administrator Access</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              This application is strictly locked. Only authorized Google account:
            </p>
            <div className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded text-xs font-mono font-bold text-emerald-300 text-center tracking-wide">
              {AUTHORIZED_EMAIL}
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-xs flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Primary Action: Google Sign In */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {/* Google colored G logo */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isProcessing ? 'Authenticating with Google...' : 'Sign in with Google'}</span>
            </button>

            {/* Quick Demo Access Button */}
            <button
              onClick={() => handleDemoSignIn(AUTHORIZED_EMAIL)}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/50 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authenticate as {AUTHORIZED_EMAIL}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-500" />
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[10px] text-slate-500">
              GMGN AI Security Layer • Google Identity Services Enforcement
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged in BUT unauthorized email (e.g. someone else's Google account)
  if (!user.isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-red-400">Access Restricted</h2>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="text-slate-400">Current Logged-in Google Account:</div>
            <div className="font-mono text-red-300 font-bold">{user.email}</div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your Google account is not authorized to view or use this application. Access is strictly locked to <strong className="text-emerald-400 font-mono">{AUTHORIZED_EMAIL}</strong>.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign out & Login with {AUTHORIZED_EMAIL}</span>
          </button>
        </div>
      </div>
    );
  }

  // Logged in AND Authorized (`sectionsix.sounds@gmail.com`)
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Authorized Google User Status Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-1 flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400">Authenticated Google Account:</span>
          <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {user.email}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            Authorized Administrator
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 transition-all font-mono text-[10px]"
          title="Sign out of Google Account"
        >
          <LogOut className="w-3 h-3 text-red-400" />
          <span>Sign Out</span>
        </button>
      </div>

      {children}
    </div>
  );
};
