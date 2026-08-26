import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

const COOKIE_NAME = 'dex_auth_state';
const MAX_AGE = 60 * 60 * 24 * 30;

export type AuthCookieState = 'signed_in' | 'signed_out';

function getCookie(name: string): string | null {
  const value = document.cookie.split('; ').find(item => item.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

export function getCachedAuthState(): AuthCookieState | null {
  const value = getCookie(COOKIE_NAME);
  return value === 'signed_in' || value === 'signed_out' ? value : null;
}

export function setCachedAuthState(state: AuthCookieState) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(state)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
}

export function subscribeToAuthSession(onChange: (user: User | null, ready: boolean) => void) {
  const cached = getCachedAuthState();
  if (cached === 'signed_in') onChange(auth.currentUser, false);
  if (cached === 'signed_out') onChange(null, false);

  return onAuthStateChanged(auth, user => {
    setCachedAuthState(user ? 'signed_in' : 'signed_out');
    onChange(user, true);
  });
}
