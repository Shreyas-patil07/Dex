import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';

type User = { id: string; email: string; username: string | null; display_name: string | null; tagline: string | null; created_at: string };
type Watch = { id: string; tmdb_id: number; media_type: 'movie' | 'tv'; title: string; status: string; rating: number | null; watched_at: string | null };
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ProfilePage: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [user, setUser] = useState<User | null>(null);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), []);

  useEffect(() => {
    if (firebaseUser === null) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const token = await firebaseUser.getIdToken(true);
        const headers = { Authorization: `Bearer ${token}` };
        const [userResponse, watchesResponse] = await Promise.all([
          fetch(`${API_BASE}/api/me`, { headers }),
          fetch(`${API_BASE}/api/watches`, { headers }),
        ]);
        if (!userResponse.ok) throw new Error('Could not load your profile.');
        const profile = await userResponse.json();
        const library = watchesResponse.ok ? await watchesResponse.json() : [];
        if (active) { setUser(profile); setWatches(library); setLoading(false); }
      } catch (err) {
        if (active) { setError(err instanceof Error ? err.message : 'Could not load your profile.'); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [firebaseUser]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(auth); window.location.href = '/'; }
    finally { setSigningOut(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#080810] px-6 py-10 text-white"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-12 w-12 rounded bg-white/[0.06]" /><div className="mt-16 h-64 rounded-3xl bg-white/[0.04]" /></div></div>;
  if (!firebaseUser) return <div className="flex min-h-screen items-center justify-center bg-[#080810] px-6 text-center text-[#94A3B8]"><div><p>You need to be signed in to view your profile.</p><a href="/sign-up" className="mt-4 inline-block rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white">Sign in</a></div></div>;
  if (error || !user) return <div className="flex min-h-screen items-center justify-center bg-[#080810] px-6 text-center text-[#94A3B8]"><div><p>{error || 'Profile unavailable.'}</p><a href="/" className="mt-4 inline-block text-[#A855F7]">Back to Discover</a></div></div>;

  const movies = watches.filter(w => w.media_type === 'movie').length;
  const series = watches.filter(w => w.media_type === 'tv').length;
  const rated = watches.filter(w => w.rating !== null);
  const average = rated.length ? (rated.reduce((sum, w) => sum + (w.rating || 0), 0) / rated.length).toFixed(1) : '—';
  const initial = (user.display_name || user.username || 'D').charAt(0).toUpperCase();

  return <div className="min-h-screen bg-[#080810] text-white">
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:py-6"><a href="/"><img src="/DEXi.png" alt="Dex" className="h-12 w-12 object-contain" /></a><div className="flex items-center gap-2"><a href="/" className="rounded-xl px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-white">Discover</a><button onClick={handleSignOut} disabled={signingOut} className="rounded-xl px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-white disabled:opacity-50">{signingOut ? 'Signing out…' : 'Sign out'}</button></div></header>
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
      <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 sm:p-10"><div className="flex flex-col gap-7 sm:flex-row sm:items-center"><div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/15 text-3xl font-bold text-[#C084FC] ring-1 ring-[#A855F7]/20">{initial}</div><div className="min-w-0"><p className="text-sm uppercase tracking-[0.18em] text-[#A855F7]">Dex Profile</p><h1 className="mt-2 truncate text-3xl font-bold sm:text-4xl">{user.display_name || user.username}</h1><p className="mt-1 text-[#94A3B8]">@{user.username || 'username'}</p>{user.tagline && <p className="mt-4 max-w-xl text-sm leading-6 text-[#CBD5E1]">{user.tagline}</p>}</div></div></section>
      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Watched', watches.length], ['Movies', movies], ['Series', series], ['Avg. rating', average]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"><p className="text-xs uppercase tracking-wider text-[#64748B]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</section>
      <section className="mt-12"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A855F7]">Your history</p><h2 className="mt-2 text-2xl font-bold">Recently watched</h2></div><span className="text-sm text-[#64748B]">{watches.length} titles</span></div>{watches.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-white/[0.09] p-10 text-center"><p className="text-[#94A3B8]">Nothing here yet.</p><p className="mt-2 text-sm text-[#64748B]">Start watching and your entertainment identity will take shape.</p><a href="/" className="mt-5 inline-block rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold">Discover something</a></div> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{watches.slice(0, 8).map(watch => <article key={watch.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 hover:bg-white/[0.04]"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-semibold">{watch.title}</h3><p className="mt-1 text-xs text-[#64748B]">{watch.media_type === 'tv' ? 'Series' : 'Movie'}{watch.watched_at ? ` • ${new Date(watch.watched_at).getFullYear()}` : ''}</p></div>{watch.rating !== null && <span className="shrink-0 rounded-lg bg-white/[0.05] px-2.5 py-1 text-sm text-[#CBD5E1]">{watch.rating.toFixed(1)}</span>}</div></article>)}</div>}</section>
      <section className="mt-12 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A855F7]">Your identity</p><h2 className="mt-2 text-xl font-bold">Explore yourself through what you watch.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#94A3B8]">As your watch history grows, Dex will turn it into a picture of your entertainment taste.</p><p className="mt-5 text-xs text-[#475569]">Member since {new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p></section>
    </main>
    <footer className="relative z-10 w-full border-t border-white/[0.05] px-6 py-5 sm:py-6"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs font-mono text-[#64748B] sm:flex-row"><span>© 2026 Dex. All rights reserved.</span><div className="flex items-center gap-4 sm:gap-5"><a href="/about-me" className="hover:text-[#94A3B8]">About</a><a href="/privacy-policy" className="hover:text-[#94A3B8]">Privacy Policy</a><a href="/terms-of-service" className="hover:text-[#94A3B8]">Terms of Service</a><a href="mailto:systemrecord07@gmail.com" className="hover:text-[#94A3B8]">Contact</a></div></div></footer>
  </div>;
};
