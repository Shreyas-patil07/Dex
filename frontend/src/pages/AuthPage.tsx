import React, { FormEvent, useState } from 'react';
import {
  AuthCredential,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
type AuthMode = 'signup' | 'login';
type SignupStep = 'details' | 'verify' | 'username';

async function api(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Something went wrong.');
  return data;
}

function getFirebaseMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) return error instanceof Error ? error.message : 'Authentication failed.';
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in popup.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/email-already-in-use': 'That email already has a Dex account.',
    'auth/weak-password': 'Choose a stronger password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  };
  return messages[error.code] || error.message || 'Authentication failed.';
}

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [step, setStep] = useState<SignupStep>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<AuthCredential | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  async function syncUser() {
    return api('/api/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ display_name: fullName || auth.currentUser?.displayName || undefined }),
    });
  }

  async function completeUsername() {
    if (!usernameAvailable) return;
    setLoading(true); setMessage('');
    try {
      await api('/api/auth/username', { method: 'POST', body: JSON.stringify({ username }) });
      localStorage.setItem('dex_access_token', await auth.currentUser!.getIdToken(true));
      window.location.href = '/profile';
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save username.'); }
    finally { setLoading(false); }
  }

  async function checkUsername(value: string) {
    const normalized = value.trim().toLowerCase();
    setUsername(value.toLowerCase());
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) { setUsernameAvailable(null); return; }
    try {
      const data = await api(`/api/auth/username/available?username=${encodeURIComponent(normalized)}`);
      setUsernameAvailable(data.available);
    } catch { setUsernameAvailable(null); }
  }

  async function handleGoogle() {
    setLoading(true); setMessage('');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      setFullName(result.user.displayName || '');
      await syncUser();
      setStep('username');
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/account-exists-with-different-credential') {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (credential) setPendingGoogleCredential(credential);
        setEmail(error.customData?.email ? String(error.customData.email) : email);
        setMode('login');
        setMessage('This email already uses another sign-in method. Sign in with email and Dex will connect Google to the same account.');
      } else setMessage(getFirebaseMessage(error));
    } finally { setLoading(false); }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('');
    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(result.user);
        setStep('verify');
        setMessage('Verification email sent. Verify your email, then return here and continue.');
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      if (pendingGoogleCredential) {
        try { await linkWithCredential(result.user, pendingGoogleCredential); setPendingGoogleCredential(null); }
        catch (error) { if (!(error instanceof FirebaseError) || error.code !== 'auth/credential-already-in-use') throw error; }
      }
      await syncUser();
      setFullName(result.user.displayName || '');
      setStep('username');
    } catch (error) { setMessage(getFirebaseMessage(error)); }
    finally { setLoading(false); }
  }

  async function continueAfterVerification() {
    setLoading(true); setMessage('');
    try {
      await auth.currentUser?.reload();
      if (!auth.currentUser?.emailVerified) throw new Error('Your email is not verified yet. Open the verification email and try again.');
      await syncUser();
      setStep('username');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not verify your email.'); }
    finally { setLoading(false); }
  }

  function switchMode() {
    setMode(current => current === 'signup' ? 'login' : 'signup');
    setStep('details'); setMessage(''); setPendingGoogleCredential(null);
  }

  if (step === 'username') {
    return (
      <div className="min-h-screen bg-[#080810] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 shadow-2xl sm:p-9">
            <img src="/DEXi.png" alt="Dex" className="mx-auto h-16 w-16 object-contain" />
            <h1 className="mt-7 text-center text-3xl font-bold">Choose your username</h1>
            <p className="mt-2 text-center text-sm leading-6 text-[#94A3B8]">This is how people will find you on Dex.</p>
            <div className="mt-8 flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 focus-within:border-[#7C3AED]">
              <span className="text-[#64748B]">@</span>
              <input value={username} onChange={e => checkUsername(e.target.value)} placeholder="username" autoFocus maxLength={20} className="w-full bg-transparent px-2 py-3 text-sm outline-none" />
            </div>
            <div className="mt-3 min-h-6 text-sm">
              {usernameAvailable === true && <span className="text-emerald-400">✓ {username} is available</span>}
              {usernameAvailable === false && <span className="text-red-400">That username is already taken.</span>}
            </div>
            <button onClick={completeUsername} disabled={loading || !usernameAvailable} className="mt-5 w-full rounded-xl bg-[#7C3AED] px-4 py-3 font-semibold disabled:opacity-40">{loading ? 'Saving…' : 'Continue'}</button>
            {message && <p className="mt-4 text-sm text-[#CBD5E1]">{message}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-[#080810] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 text-center shadow-2xl sm:p-9">
            <img src="/DEXi.png" alt="Dex" className="mx-auto h-16 w-16 object-contain" />
            <h1 className="mt-7 text-3xl font-bold">Verify your email</h1>
            <p className="mt-3 text-sm leading-6 text-[#94A3B8]">We sent a verification link to <span className="text-white">{email}</span>. Verify it, then come back here.</p>
            <button onClick={continueAfterVerification} disabled={loading} className="mt-8 w-full rounded-xl bg-[#7C3AED] px-4 py-3 font-semibold disabled:opacity-50">{loading ? 'Checking…' : "I've verified my email"}</button>
            <button onClick={() => auth.currentUser && sendEmailVerification(auth.currentUser)} className="mt-3 w-full py-2 text-sm text-[#94A3B8] hover:text-white">Resend verification email</button>
            {message && <p className="mt-4 text-sm text-[#CBD5E1]">{message}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 shadow-2xl sm:p-9">
          <a href="/" className="mx-auto block w-fit"><img src="/DEXi.png" alt="Dex" className="h-16 w-16 object-contain" /></a>
          <h1 className="mt-7 text-center text-3xl font-bold">{mode === 'signup' ? 'Create your Dex' : 'Welcome back'}</h1>
          <p className="mt-2 text-center text-sm text-[#94A3B8]">{mode === 'signup' ? 'Start building your entertainment identity.' : 'Continue your entertainment identity.'}</p>
          <button type="button" onClick={handleGoogle} disabled={loading} className="mt-8 w-full rounded-xl border border-white/[0.10] bg-white px-4 py-3 font-semibold text-[#111827] disabled:opacity-50">Continue with Google</button>
          <div className="flex items-center gap-3 py-5 text-xs uppercase tracking-widest text-[#475569]"><span className="h-px flex-1 bg-white/[0.07]" />or<span className="h-px flex-1 bg-white/[0.07]" /></div>
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'signup' && <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" required maxLength={80} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" required minLength={8} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
            {mode === 'signup' && <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" type="password" required minLength={8} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />}
            <button disabled={loading} className="w-full rounded-xl bg-[#7C3AED] px-4 py-3 font-semibold disabled:opacity-50">{loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </form>
          <button type="button" onClick={switchMode} className="mt-4 w-full py-2 text-sm text-[#94A3B8] hover:text-white">{mode === 'signup' ? 'Already have an account? Sign in' : 'New to Dex? Create an account'}</button>
          {message && <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-[#CBD5E1]">{message}</p>}
        </div>
      </div>
    </div>
  );
};
