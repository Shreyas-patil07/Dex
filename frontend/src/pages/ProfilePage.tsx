import React, { useEffect, useMemo, useState } from 'react';
import { EmailAuthProvider, GoogleAuthProvider, linkWithCredential, linkWithPopup, onAuthStateChanged, sendPasswordResetEmail, signOut, User as FirebaseUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Check, ChevronDown } from 'lucide-react';
import { auth } from '../lib/firebase';

type User = { id: string; email: string; username: string | null; display_name: string | null; tagline: string | null; created_at: string };
type Watch = { id: string; tmdb_id: number; media_type: 'movie' | 'tv'; title: string; status: string; rating: number | null; watched_at: string | null };
type WatchStatus = { value: string; label: string };
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(user: FirebaseUser, path: string, options: RequestInit = {}) {
  const token = await user.getIdToken(true);
  return fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
}

export const ProfilePage: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [statuses, setStatuses] = useState<WatchStatus[]>([]);
  const [activeStatus, setActiveStatus] = useState('watched');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingWatch, setUpdatingWatch] = useState<string | null>(null);
  const [linking, setLinking] = useState<'google' | 'password' | null>(null);
  const [linkMessage, setLinkMessage] = useState('');
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => onAuthStateChanged(auth, current => { setFirebaseUser(current); setAuthReady(true); }), []);

  useEffect(() => {
    fetch(`${API_BASE}/api/watch-statuses`).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      const next = Array.isArray(data.statuses) ? data.statuses : [];
      setStatuses(next);
      if (next.length && !next.some((status: WatchStatus) => status.value === activeStatus)) setActiveStatus(next[0].value);
    }).catch(() => setStatuses([]));
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser) { if (authReady) setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        setLoading(true); setError('');
        const sync = await request(firebaseUser, '/api/auth/sync', { method: 'POST', body: JSON.stringify({ display_name: firebaseUser.displayName || undefined }) });
        if (!sync.ok) { const data = await sync.json().catch(() => ({})); throw new Error(data.detail || 'Could not synchronize your Dex account.'); }
        const [profile, history] = await Promise.all([request(firebaseUser, '/api/me'), request(firebaseUser, '/api/watches')]);
        if (!profile.ok) { const data = await profile.json().catch(() => ({})); throw new Error(data.detail || 'Could not load your profile.'); }
        if (active) { setUser(await profile.json()); setWatches(history.ok ? await history.json() : []); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Could not load your profile.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [authReady, firebaseUser]);

  const providers = firebaseUser?.providerData.map(p => p.providerId) || [];
  const hasGoogle = providers.includes('google.com');
  const hasPassword = providers.includes('password');
  const connectGoogle = async () => { if (!firebaseUser) return; setLinking('google'); setLinkMessage(''); try { await linkWithPopup(firebaseUser, new GoogleAuthProvider()); await firebaseUser.reload(); setFirebaseUser(auth.currentUser); setLinkMessage('Google is now connected to this Dex account.'); } catch (e) { setLinkMessage(e instanceof FirebaseError && e.code === 'auth/credential-already-in-use' ? 'That Google account is already connected to another account.' : e instanceof Error ? e.message : 'Could not connect Google.'); } finally { setLinking(null); } };
  const addPassword = async (event: React.FormEvent) => { event.preventDefault(); if (!firebaseUser?.email) return setLinkMessage('This account does not have an email address.'); if (password.length < 8) return setLinkMessage('Password must be at least 8 characters.'); if (password !== confirmPassword) return setLinkMessage('Passwords do not match.'); setLinking('password'); setLinkMessage(''); try { await linkWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, password)); await firebaseUser.reload(); setFirebaseUser(auth.currentUser); setPassword(''); setConfirmPassword(''); setLinkMessage('Email & Password is now connected to this Dex account.'); } catch (e) { setLinkMessage(e instanceof FirebaseError && e.code === 'auth/provider-already-linked' ? 'Email & Password is already connected.' : e instanceof FirebaseError && e.code === 'auth/credential-already-in-use' ? 'This email already belongs to another Firebase account.' : e instanceof Error ? e.message : 'Could not connect Email & Password.'); } finally { setLinking(null); } };
  const resetPassword = async () => { if (!firebaseUser?.email) return; setResetting(true); setLinkMessage(''); try { await sendPasswordResetEmail(auth, firebaseUser.email); setLinkMessage(`Password reset email sent to ${firebaseUser.email}. Check your inbox and spam folder.`); } catch (e) { setLinkMessage(e instanceof FirebaseError && e.code === 'auth/invalid-email' ? 'The account email is invalid.' : e instanceof FirebaseError && e.code === 'auth/too-many-requests' ? 'Too many requests. Please try again later.' : e instanceof Error ? e.message : 'Could not send password reset email.'); } finally { setResetting(false); } };
  const handleSignOut = async () => { await signOut(auth); window.location.href = '/'; };

  const updateStatus = async (watchId: string, nextStatus: string) => {
    if (!firebaseUser || updatingWatch) return;
    const previous = watches.find(w => w.id === watchId)?.status;
    setUpdatingWatch(watchId);
    try {
      const response = await request(firebaseUser, `/api/watches/${encodeURIComponent(watchId)}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || 'Could not update status.');
      const updated: Watch = await response.json();
      setWatches(current => current.map(w => w.id === watchId ? updated : w));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status.');
      if (previous) setWatches(current => current.map(w => w.id === watchId ? { ...w, status: previous } : w));
    } finally { setUpdatingWatch(null); }
  };

  const filteredWatches = useMemo(() => watches.filter(w => w.status === activeStatus), [watches, activeStatus]);
  const statusCounts = useMemo(() => Object.fromEntries(statuses.map(status => [status.value, watches.filter(w => w.status === status.value).length])), [statuses, watches]);

  if (!authReady || loading) return <div className="min-h-screen bg-transparent px-6 py-10 text-white"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-12 w-12 rounded bg-white/[0.06]" /><div className="mt-16 h-64 rounded-3xl bg-white/[0.04]" /></div></div>;
  if (!firebaseUser) return <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-center text-[#94A3B8]"><div><p>You need to be signed in to view your profile.</p><a href="/sign-up" className="mt-4 inline-block rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white">Sign in</a></div></div>;
  if (error || !user) return <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-center text-[#94A3B8]"><div><p>{error || 'Profile unavailable.'}</p><a href="/" className="mt-4 inline-block text-[#A855F7]">Back to Trending</a></div></div>;

  const movies = watches.filter(w => w.media_type === 'movie').length;
  const series = watches.filter(w => w.media_type === 'tv').length;
  const rated = watches.filter(w => w.rating !== null);
  const average = rated.length ? (rated.reduce((sum, w) => sum + (w.rating || 0), 0) / rated.length).toFixed(1) : '—';
  const initial = (user.display_name || user.username || 'D').charAt(0).toUpperCase();

  return <div className="min-h-screen bg-transparent text-white">
    <header className="border-b border-white/[0.06]"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:py-6"><a href="/"><img src="/DEXi.png" alt="Dex" className="h-10 w-22 object-contain" /></a><div className="flex gap-2"><a href="/" className="rounded-xl px-4 py-2 text-sm text-[#94A3B8] hover:text-white">Trending</a><button onClick={handleSignOut} className="rounded-xl px-4 py-2 text-sm text-[#94A3B8] hover:text-white">Sign out</button></div></div></header>
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-10"><section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 sm:p-10"><div className="flex items-center gap-7"><div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/15 text-3xl font-bold text-[#C084FC] ring-1 ring-[#A855F7]/20">{initial}</div><div><p className="text-sm uppercase tracking-[0.18em] text-[#A855F7]">Dex Profile</p><h1 className="mt-2 text-3xl font-bold">{user.display_name || user.username}</h1><p className="mt-1 text-[#94A3B8]">@{user.username || 'username'}</p></div></div></section>
      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Watched', watches.filter(w => w.status === 'watched').length], ['Movies', movies], ['Series', series], ['Avg. rating', average]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"><p className="text-xs uppercase tracking-wider text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</section>

      <section className="mt-12"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A855F7]">Your list</p><h2 className="mt-2 text-2xl font-bold">Watchlist</h2><p className="mt-2 text-sm text-[#64748B]">Move titles between your saved statuses. Changes are stored in Firestore.</p></div>
        <div className="mt-5 flex flex-wrap gap-2">{statuses.map(status => <button key={status.value} onClick={() => setActiveStatus(status.value)} className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${activeStatus === status.value ? 'border-[#8B5CF6]/35 bg-[#8B5CF6]/[0.045] text-[#C4B5FD]' : 'border-white/[0.06] text-[#8490A3] hover:border-white/[0.11] hover:text-[#B7C0CF]'}`}>{status.label}<span className="ml-2 text-xs text-[#64748B]">{statusCounts[status.value] || 0}</span></button>)}</div>
        {filteredWatches.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/[0.09] p-10 text-center"><p className="text-[#94A3B8]">No titles in this list.</p><a href="/" className="mt-5 inline-block rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold">Discover something</a></div> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{filteredWatches.map(w => <article key={w.id} className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.03]"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-semibold">{w.title}</h3><p className="mt-1 text-xs text-[#64748B]">{w.media_type === 'tv' ? 'Series' : 'Movie'}{w.rating !== null ? ` • ${w.rating.toFixed(1)}` : ''}</p></div><div className="relative shrink-0"><select value={w.status} onChange={e => updateStatus(w.id, e.target.value)} disabled={updatingWatch === w.id} className="appearance-none rounded-lg border border-white/[0.07] bg-[#0B0B14] py-2 pl-3 pr-8 text-xs text-[#CBD5E1] outline-none"><option disabled value={w.status}>{statuses.find(s => s.value === w.status)?.label || w.status}</option>{statuses.filter(s => s.value !== w.status).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" /></div></div>{updatingWatch === w.id && <p className="mt-3 text-xs text-[#8B5CF6]">Saving…</p>}</article>)}</div>}
      </section>

      <section className="mt-12 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A855F7]">Account</p><h2 className="mt-2 text-2xl font-bold">Sign-in methods</h2><p className="mt-2 text-sm text-[#94A3B8]">Connect multiple sign-in methods to the same Dex account.</p><div className="mt-6 space-y-3"><div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0B14] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Google</p><p className="mt-1 text-xs text-[#64748B]">{hasGoogle ? 'Connected to this account' : 'Not connected'}</p></div>{hasGoogle ? <span className="text-sm text-emerald-400">✓ Connected</span> : <button onClick={connectGoogle} disabled={linking !== null} className="rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-semibold disabled:opacity-50">{linking === 'google' ? 'Connecting…' : 'Connect Google'}</button>}</div><div className="rounded-2xl border border-white/[0.07] bg-[#0B0B14] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Email & Password</p><p className="mt-1 text-xs text-[#64748B]">{hasPassword ? `Connected as ${firebaseUser.email}` : `Use ${firebaseUser.email || 'your email'} to sign in`}</p></div>{hasPassword && <span className="text-sm text-emerald-400">✓ Connected</span>}</div>{hasPassword ? <button onClick={resetPassword} disabled={resetting} className="mt-5 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-[#C084FC] hover:bg-white/[0.04] disabled:opacity-50">{resetting ? 'Sending…' : 'Reset password'}</button> : <form onSubmit={addPassword} className="mt-5 grid gap-3 sm:grid-cols-2"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" minLength={8} required className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" minLength={8} required className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><button disabled={linking !== null} className="rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-semibold sm:col-span-2 disabled:opacity-50">{linking === 'password' ? 'Connecting…' : 'Add password'}</button></form>}</div></div>{linkMessage && <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-[#CBD5E1]">{linkMessage}</p>}</section>

      <section className="mt-12 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A855F7]">Your identity</p><h2 className="mt-2 text-xl font-bold">Explore yourself through what you watch.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#94A3B8]">As your watch history grows, Dex will turn it into a picture of your entertainment taste.</p></section>
    </main>
  </div>;
};
