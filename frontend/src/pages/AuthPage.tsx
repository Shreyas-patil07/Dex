import React, { FormEvent, useState } from 'react';
import {
  AuthCredential,
  EmailAuthProvider,
  FirebaseError,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
type AuthMode = 'signup' | 'login';

async function syncUser(username?: string, displayName?: string) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Authentication completed, but no Firebase user was found.');

  const token = await firebaseUser.getIdToken();
  const response = await fetch(`${API_BASE}/api/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username: username || undefined, display_name: displayName || undefined }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Could not create your Dex profile.');

  localStorage.setItem('dex_access_token', token);
  return data;
}

function getFirebaseMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) return error instanceof Error ? error.message : 'Authentication failed.';
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
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
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<AuthCredential | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function finishAuthentication(nextUsername?: string, nextDisplayName?: string) {
    await syncUser(nextUsername, nextDisplayName);
    window.location.href = '/';
  }

  async function handleGoogle() {
    setLoading(true);
    setMessage('');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await finishAuthentication(undefined, result.user.displayName || undefined);
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/account-exists-with-different-credential') {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (credential) setPendingGoogleCredential(credential);
        setEmail(error.customData?.email ? String(error.customData.email) : email);
        setMode('login');
        setMessage('This email already uses another sign-in method. Sign in with email and Dex will connect Google to the same account.');
      } else {
        setMessage(getFirebaseMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          await sendEmailVerification(result.user).catch(() => undefined);
          await finishAuthentication(username, displayName || undefined);
        } catch (error) {
          if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
            const googleResult = await signInWithPopup(auth, new GoogleAuthProvider());
            const credential = EmailAuthProvider.credential(email, password);
            await linkWithCredential(googleResult.user, credential);
            await finishAuthentication(username, displayName || googleResult.user.displayName || undefined);
            return;
          }
          throw error;
        }
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      if (pendingGoogleCredential) {
        try {
          await linkWithCredential(result.user, pendingGoogleCredential);
          setPendingGoogleCredential(null);
        } catch (error) {
          if (!(error instanceof FirebaseError) || error.code !== 'auth/credential-already-in-use') throw error;
        }
      }
      await finishAuthentication();
    } catch (error) {
      setMessage(getFirebaseMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === 'signup' ? 'login' : 'signup'));
    setPendingGoogleCredential(null);
    setMessage('');
  }

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 shadow-2xl shadow-black/20 sm:p-9">
          <a href="/" className="mx-auto block w-fit" aria-label="Dex home">
            <img src="/DEXi.png" alt="Dex" className="h-16 w-16 object-contain" />
          </a>
          <h1 className="mt-7 text-center text-3xl font-bold tracking-tight">
            {mode === 'signup' ? 'Create your Dex' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-[#94A3B8]">
            {mode === 'signup' ? 'Start building your entertainment identity.' : 'Continue your entertainment identity.'}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.10] bg-white px-4 py-3 font-semibold text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.35 12.27c0-.68-.06-1.34-.17-1.97H12v3.73h5.22a4.47 4.47 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.93-4.18 2.93-7.15Z" />
              <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.75Z" />
              <path fill="#FBBC05" d="M6.53 13.83a5.86 5.86 0 0 1 0-3.66V7.64H3.28a9.75 9.75 0 0 0 0 8.72l3.25-2.53Z" />
              <path fill="#EA4335" d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.25 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.39l3.25 2.53C7.3 7.86 9.46 6.14 12 6.14Z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 py-5 text-xs uppercase tracking-widest text-[#475569]">
            <span className="h-px flex-1 bg-white/[0.07]" />or<span className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name (optional)" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required minLength={3} maxLength={32} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
              </>
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required minLength={8} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-[#64748B] focus:border-[#7C3AED]" />
            <button disabled={loading} className="w-full rounded-xl bg-[#7C3AED] px-4 py-3 font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-50">
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button type="button" onClick={switchMode} className="mt-4 w-full py-2 text-sm text-[#94A3B8] hover:text-white">
            {mode === 'signup' ? 'Already have an account? Sign in' : 'New to Dex? Create an account'}
          </button>

          {message && <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#CBD5E1]">{message}</p>}
          <p className="mt-7 text-center text-xs leading-5 text-[#64748B]">By continuing, you agree to Dex's Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};
