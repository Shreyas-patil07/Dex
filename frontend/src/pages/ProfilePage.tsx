import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, ChevronDown, Film, LogOut, PlayCircle, Plus, Settings2, ShieldCheck, Star, Tv2 } from 'lucide-react';
import { EmailAuthProvider, GoogleAuthProvider, linkWithCredential, linkWithPopup, onAuthStateChanged, sendPasswordResetEmail, signOut, User as FirebaseUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../lib/firebase';

type User = { id: string; email: string; username: string | null; display_name: string | null; tagline: string | null; created_at: string };
type Watch = { id: string; tmdb_id: number; media_type: 'movie' | 'tv'; title: string; status: string; rating: number | null; watched_at: string | null; notes?: string | null; poster_path?: string | null; backdrop_path?: string | null };
type WatchStatus = { value: string; label: string };
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(user: FirebaseUser, path: string, options: RequestInit = {}) {
  const token = await user.getIdToken();
  return fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
}

const iconForStatus = (status: string) => status === 'watched' ? <Check size={17} /> : status === 'want_to_watch' ? <PlayCircle size={17} /> : <CalendarDays size={17} />;

const statusTone = (status: string) => status === 'watched'
  ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200'
  : status === 'want_to_watch'
    ? 'border-violet-400/25 bg-violet-400/[0.09] text-violet-200'
    : 'border-sky-400/20 bg-sky-400/[0.08] text-sky-200';

const statusDotTone = (status: string) => status === 'watched'
  ? 'bg-emerald-300'
  : status === 'want_to_watch'
    ? 'bg-violet-300'
    : 'bg-sky-300';

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

const WatchPoster: React.FC<{ watch: Watch }> = ({ watch }) => {
  const [failed, setFailed] = useState(false);
  const src = watch.poster_path ? `${TMDB_POSTER_BASE}${watch.poster_path}` : '';

  return (
    <div className="h-36 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 transition-transform duration-300 group-hover:scale-[1.035]">
      {src && !failed ? (
        <img
          src={src}
          alt={`${watch.title} poster`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#475569]">
          {watch.media_type === 'tv' ? <Tv2 size={23} /> : <Film size={23} />}
        </div>
      )}
    </div>
  );
};

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
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [linking, setLinking] = useState<'google' | 'password' | null>(null);
  const [linkMessage, setLinkMessage] = useState('');
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSecurity, setShowSecurity] = useState(false);

  useEffect(() => onAuthStateChanged(auth, current => { setFirebaseUser(current); setAuthReady(true); }), []);

  useEffect(() => {
    if (!openStatusMenu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('[data-watch-status-menu]')) {
        setOpenStatusMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenStatusMenu(null);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openStatusMenu]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/watch-statuses`).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      if (!active) return;
      const next = Array.isArray(data.statuses) ? data.statuses : [];
      setStatuses(next);
      if (next.length && !next.some((status: WatchStatus) => status.value === activeStatus)) setActiveStatus(next[0].value);
    }).catch(() => { if (active) setStatuses([]); });
    return () => { active = false; };
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
        if (!history.ok) { const data = await history.json().catch(() => ({})); throw new Error(data.detail || 'Could not load your watch history. Please retry.'); }
        const [profileData, historyData] = await Promise.all([profile.json(), history.json()]);
        if (active) { setUser(profileData); setWatches(historyData); }
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
  const resetPassword = async () => { if (!firebaseUser?.email) return; setResetting(true); setLinkMessage(''); try { await sendPasswordResetEmail(auth, firebaseUser.email); setLinkMessage(`Password reset email sent to ${firebaseUser.email}. Check your inbox and spam folder.`); } catch (e) { setLinkMessage(e instanceof FirebaseError && e.code === 'auth/too-many-requests' ? 'Too many requests. Please try again later.' : e instanceof Error ? e.message : 'Could not send password reset email.'); } finally { setResetting(false); } };
  const handleSignOut = async () => { await signOut(auth); window.location.href = '/'; };

  const updateStatus = async (watchId: string, nextStatus: string) => {
    if (!firebaseUser || updatingWatch) return;
    const previous = watches.find(w => w.id === watchId)?.status;
    setUpdatingWatch(watchId); setError('');
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

  const statusCounts = useMemo(() => Object.fromEntries(statuses.map(status => [status.value, watches.filter(w => w.status === status.value).length])), [statuses, watches]);
  const filteredWatches = useMemo(() => watches.filter(w => w.status === activeStatus), [watches, activeStatus]);
  const movies = watches.filter(w => w.media_type === 'movie').length;
  const series = watches.filter(w => w.media_type === 'tv').length;
  const rated = watches.filter(w => w.rating !== null);
  const average = rated.length ? (rated.reduce((sum, w) => sum + (w.rating || 0), 0) / rated.length).toFixed(1) : '—';
  const initial = (user?.display_name || user?.username || firebaseUser?.displayName || 'D').charAt(0).toUpperCase();

  if (!authReady || loading) return <div className="min-h-screen bg-transparent px-6 py-10 text-white"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-10 w-24 rounded bg-white/[0.06]" /><div className="mt-10 h-64 rounded-[2rem] bg-white/[0.04]" /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.035]" />)}</div></div></div>;
  if (!firebaseUser) return <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-center text-[#94A3B8]"><div><p>You need to be signed in to view your profile.</p><a href="/sign-up" className="mt-4 inline-block rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white">Sign in</a></div></div>;
  if (error && !user) return <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-center text-[#94A3B8]"><div><p>{error || 'Profile unavailable.'}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white">Try again</button><a href="/" className="mt-4 ml-4 inline-block text-[#A855F7]">Back to Trending</a></div></div>;

  return <div className="min-h-screen bg-transparent text-white">
    <header className="border-b border-white/[0.06]"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><a href="/" className="shrink-0"><img src="/DEXi.png" alt="Dex" className="h-10 w-22 object-contain" /></a><div className="flex items-center gap-1"><a href="/" className="rounded-xl px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.03] hover:text-white">Trending</a><button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.03] hover:text-white"><LogOut size={15} /> Sign out</button></div></div></header>

    <main className="mx-auto max-w-6xl px-6 pb-20 pt-8 sm:pt-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] shadow-[0_20px_60px_rgba(0,0,0,0.2)]"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl" /><div className="relative p-7 sm:p-10"><div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-5 sm:gap-7"><div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7C3AED]/25 to-[#A855F7]/10 text-3xl font-bold text-[#D8B4FE] ring-1 ring-[#A855F7]/25 shadow-[0_10px_30px_rgba(124,58,237,0.14)]">{initial}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A78BFA]">Your profile</p><h1 className="mt-2 truncate text-3xl font-bold tracking-tight sm:text-4xl">{user?.display_name || user?.username || 'Dex User'}</h1><p className="mt-1 text-sm text-[#64748B]">@{user?.username || 'username'}{user?.tagline ? ` · ${user.tagline}` : ''}</p></div></div><div className="flex flex-wrap gap-2"><a href="/" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-sm font-semibold text-[#CBD5E1] hover:bg-white/[0.05] hover:text-white"><Plus size={15} /> Discover</a><button onClick={() => setShowSecurity(v => !v)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${showSecurity ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/[0.06] text-[#C4B5FD]' : 'border-white/[0.08] text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'}`}><Settings2 size={15} /> Account</button></div></div></div></section>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Total titles', watches.length], ['Movies', movies], ['Series', series], ['Avg. rating', average]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"><p className="text-xs uppercase tracking-[0.15em] text-[#64748B]">{label}</p><p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold">{value}{label === 'Avg. rating' && average !== '—' && <Star size={17} className="text-[#A78BFA]" />}</p></div>)}</section>

      <section className="mt-10">
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {statuses.slice(0, 3).map(status => {
            const active = activeStatus === status.value;
            const count = statusCounts[status.value] || 0;
            const accent = status.value === 'watched'
              ? { icon: 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/15', glow: 'bg-emerald-400/10', count: 'text-emerald-200' }
              : status.value === 'want_to_watch'
                ? { icon: 'bg-violet-400/10 text-violet-300 ring-violet-300/15', glow: 'bg-violet-400/10', count: 'text-violet-200' }
                : { icon: 'bg-sky-400/10 text-sky-300 ring-sky-300/15', glow: 'bg-sky-400/10', count: 'text-sky-200' };
            const description = status.value === 'watched'
              ? 'Movies and series you have completed'
              : status.value === 'want_to_watch'
                ? 'Your personal watchlist for later'
                : 'Titles saved for the future';

            return (
              <button
                key={status.value}
                type="button"
                onClick={() => setActiveStatus(status.value)}
                aria-pressed={active}
                className={`group relative isolate min-h-[164px] overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] ${
                  active
                    ? 'border-white/[0.16] bg-white/[0.055] shadow-[0_14px_38px_rgba(0,0,0,0.22)]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.035]'
                }`}
              >
                <div className={`pointer-events-none absolute -right-9 -top-10 h-36 w-36 rounded-full blur-3xl transition-opacity ${accent.glow} ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-75'}`} />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-colors ${accent.icon}`}>
                    {iconForStatus(status.value)}
                  </span>
                  <span className={`rounded-xl border border-white/[0.07] bg-black/20 px-3 py-1.5 text-lg font-bold tabular-nums ${active ? accent.count : 'text-[#CBD5E1]'}`}>
                    {count}
                  </span>
                </div>
                <div className="relative mt-5">
                  <p className="text-base font-semibold tracking-tight text-[#F1F5F9]">{status.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#8491A5]">{description}</p>
                </div>
                <div className="relative mt-4 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${active ? 'text-[#C4B5FD]' : 'text-[#64748B]'}`}>
                    {active ? 'Currently selected' : 'Open list'}
                  </span>
                  <ArrowUpRight size={15} className={`transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${active ? 'text-[#C4B5FD]' : 'text-[#64748B]'}`} />
                </div>
              </button>
            );
          })}
        </div>

        

        {filteredWatches.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.012] p-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.035] text-[#64748B]">{iconForStatus(activeStatus)}</div><p className="mt-4 text-sm text-[#94A3B8]">No titles in {statuses.find(s => s.value === activeStatus)?.label?.toLowerCase() || 'this list'}.</p><a href="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Discover titles</a></div> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{filteredWatches.map(watch => <article key={watch.id} className="group relative isolate overflow-visible rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#171727]/90 via-[#10101B] to-[#0A0A12] p-3 shadow-[0_12px_35px_rgba(0,0,0,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-[#A78BFA]/25 hover:shadow-[0_20px_45px_rgba(0,0,0,0.32)]">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#8B5CF6]/[0.07] blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <a
            href={`/${watch.media_type}/${watch.tmdb_id}`}
            aria-label={`View ${watch.title} details`}
            title={`View ${watch.title}`}
            className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A78BFA]"
          />
          <div className="pointer-events-none relative z-10 flex min-h-36 gap-4 p-1">
            <WatchPoster watch={watch} />
            <div className="flex min-w-0 flex-1 flex-col py-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${
                  watch.media_type === 'tv'
                    ? 'border-sky-300/15 bg-sky-300/[0.07] text-sky-200'
                    : 'border-violet-300/15 bg-violet-300/[0.07] text-violet-200'
                }`}>
                  {watch.media_type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                </span>
                {watch.rating !== null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-200">
                    <Star size={11} className="fill-amber-200/80" />
                    {watch.rating.toFixed(1)}
                    <span className="font-normal text-[#64748B]">your rating</span>
                  </span>
                )}
              </div>
              <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug tracking-tight text-[#F8FAFC] transition-colors group-hover:text-white sm:text-lg">
                {watch.title}
              </h3>
              <div className="mt-auto flex items-center gap-2 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B94A8] transition-colors group-hover:text-[#C4B5FD]">
                <span>View details</span>
                <ArrowUpRight size={13} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-30" data-watch-status-menu>
            <button
              type="button"
              onClick={() => setOpenStatusMenu(current => current === watch.id ? null : watch.id)}
              disabled={updatingWatch !== null && updatingWatch !== watch.id}
              aria-label={`Update ${watch.title} status`}
              aria-haspopup="menu"
              aria-expanded={openStatusMenu === watch.id}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold tracking-wide shadow-lg shadow-black/20 backdrop-blur-xl transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] disabled:cursor-wait disabled:opacity-60 ${statusTone(watch.status)}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotTone(watch.status)}`} />
              <span>{updatingWatch === watch.id ? 'Saving…' : statuses.find(s => s.value === watch.status)?.label || watch.status}</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${openStatusMenu === watch.id ? 'rotate-180' : ''}`} />
            </button>

            {openStatusMenu === watch.id && (
              <div
                role="menu"
                aria-label={`Change ${watch.title} status`}
                className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#11111D]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-2xl"
              >
                <p className="px-3 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#64748B]">Move to list</p>
                {statuses.map(status => {
                  const selected = status.value === watch.status;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setOpenStatusMenu(null);
                        if (!selected) void updateStatus(watch.id, status.value);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-white/[0.07] text-white'
                          : 'text-[#AAB4C4] hover:bg-white/[0.045] hover:text-white'
                      }`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        status.value === 'watched'
                          ? 'bg-emerald-400/10 text-emerald-300'
                          : status.value === 'want_to_watch'
                            ? 'bg-violet-400/10 text-violet-300'
                            : 'bg-sky-400/10 text-sky-300'
                      }`}>
                        {iconForStatus(status.value)}
                      </span>
                      <span className="flex-1">{status.label}</span>
                      {selected && <Check size={14} className="text-[#C4B5FD]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </article>)}</div>}
      </section>

      {showSecurity && <section className="mt-12 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 sm:p-8"><div className="flex items-start gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-[#C4B5FD]"><ShieldCheck size={18} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A855F7]">Account security</p><h2 className="mt-2 text-2xl font-bold">Sign-in methods</h2><p className="mt-2 text-sm text-[#94A3B8]">Connect multiple ways to sign in to the same Dex account.</p></div></div><div className="mt-6 space-y-3"><div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0B14] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Google</p><p className="mt-1 text-xs text-[#64748B]">{hasGoogle ? 'Connected to this account' : 'Not connected'}</p></div>{hasGoogle ? <span className="text-sm text-emerald-400">✓ Connected</span> : <button onClick={connectGoogle} disabled={linking !== null} className="rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-semibold disabled:opacity-50">{linking === 'google' ? 'Connecting…' : 'Connect Google'}</button>}</div><div className="rounded-2xl border border-white/[0.07] bg-[#0B0B14] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Email & Password</p><p className="mt-1 text-xs text-[#64748B]">{hasPassword ? `Connected as ${firebaseUser.email}` : `Use ${firebaseUser.email || 'your email'} to sign in`}</p></div>{hasPassword && <span className="text-sm text-emerald-400">✓ Connected</span>}</div>{hasPassword ? <button onClick={resetPassword} disabled={resetting} className="mt-5 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-[#C084FC] hover:bg-white/[0.04] disabled:opacity-50">{resetting ? 'Sending…' : 'Reset password'}</button> : <form onSubmit={addPassword} className="mt-5 grid gap-3 sm:grid-cols-2"><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="New password" minLength={8} required className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Confirm password" minLength={8} required className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><button disabled={linking !== null} className="rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-semibold sm:col-span-2 disabled:opacity-50">{linking === 'password' ? 'Connecting…' : 'Add password'}</button></form>}</div></div>{linkMessage && <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-[#CBD5E1]">{linkMessage}</p>}</section>}
    </main>
  </div>;
};
