import React, { FormEvent, useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

type GoogleCredentialResponse = { credential: string };
type AuthMode = 'signup' | 'login';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (parent: HTMLElement, options: { theme: string; size: string; width?: string }) => void;
        };
      };
    };
  }
}

async function parseResponse(response: Response): Promise<{ data: any; error?: string }> {
  const data = await response.json().catch(() => ({}));
  return response.ok ? { data } : { data, error: data.detail || 'Something went wrong.' };
}

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.dexGoogle = 'true';
    script.onload = () => {
      const mount = document.getElementById('google-signin');
      if (!mount || !window.google) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      mount.innerHTML = '';
      window.google.accounts.id.renderButton(mount, { theme: 'filled_black', size: 'large', width: '100%' });
    };
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  async function handleGoogleCredential(response: GoogleCredentialResponse) {
    setLoading(true);
    setMessage('');
    try {
      const result = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const { data, error } = await parseResponse(result);
      if (error) {
        if (result.status === 409) {
          setPendingGoogleCredential(response.credential);
          setMode('login');
          setMessage('An account already uses this Google email. Sign in with that email and Dex will connect Google to the same account.');
          return;
        }
        throw new Error(error);
      }
      localStorage.setItem('dex_access_token', data.access_token);
      window.location.href = '/';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'signup'
        ? { email, username, password, display_name: displayName || undefined }
        : { email, password };

      const result = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const { data, error } = await parseResponse(result);
      if (error) throw new Error(error);

      if (mode === 'login' && pendingGoogleCredential) {
        const linkResult = await fetch(`${API_BASE}/api/auth/google/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.access_token}` },
          body: JSON.stringify({ credential: pendingGoogleCredential }),
        });
        const linked = await parseResponse(linkResult);
        if (linked.error) throw new Error(linked.error);
        setPendingGoogleCredential('');
      }

      if (mode === 'signup') {
        setMode('login');
        setMessage('Account created. Sign in to continue.');
        return;
      }

      localStorage.setItem('dex_access_token', data.access_token);
      window.location.href = '/';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 shadow-2xl shadow-black/20 sm:p-9">
          <a href="/" className="mx-auto block w-fit" aria-label="Dex home"><img src="/DEXi.png" alt="Dex" className="h-16 w-16 object-contain" /></a>
          <h1 className="mt-7 text-center text-3xl font-bold tracking-tight">{mode === 'signup' ? 'Create your Dex' : 'Welcome back'}</h1>
          <p className="mt-2 text-center text-sm leading-6 text-[#94A3B8]">{mode === 'signup' ? 'Start building your entertainment identity.' : 'Continue your entertainment identity.'}</p>

          <div className="mt-8 space-y-3">
            <div id="google-signin" className="flex min-h-11 justify-center" />
            {!GOOGLE_CLIENT_ID && <p className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2 text-xs text-[#FCD34D]">Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.</p>}
            <div className="flex items-center gap-3 py-2 text-xs uppercase tracking-widest text-[#475569]"><span className="h-px flex-1 bg-white/[0.07]" />or<span className="h-px flex-1 bg-white/[0.07]" /></div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'signup' && <>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name (optional)" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required minLength={3} maxLength={32} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
            </>}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required minLength={8} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
            <button disabled={loading} className="w-full rounded-xl bg-[#7C3AED] px-4 py-3 font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-50">{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </form>

          <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(''); }} className="mt-4 w-full py-2 text-sm text-[#94A3B8] hover:text-white">{mode === 'signup' ? 'Already have an account? Sign in' : 'New to Dex? Create an account'}</button>
          {message && <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#CBD5E1]">{message}</p>}
          <p className="mt-7 text-center text-xs leading-5 text-[#64748B]">By continuing, you agree to Dex's Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};
