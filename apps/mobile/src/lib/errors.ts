import { isAuthApiError } from '@supabase/supabase-js';

/** Turns a Supabase error into a short Dutch sentence a tired parent understands. */
export function friendlyError(error: unknown): string {
  if (isAuthApiError(error)) {
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return 'Je hebt net al een code gekregen. Wacht even en probeer het dan opnieuw.';
    }
    // Supabase reports a wrong code and an expired one the same way.
    if (error.code === 'otp_expired') return 'Deze code klopt niet of is verlopen. Kijk nog eens goed, of vraag een nieuwe aan.';
    if (error.code === 'email_address_invalid') return 'Dit e-mailadres klopt nog niet helemaal.';
  }
  return 'Dat lukte even niet. Check je internet en probeer het opnieuw.';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}
