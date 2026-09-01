import { describe, expect, it } from 'vitest';
import { toUserMessage } from './errors';

/**
 * Error copy is part of the product, not an afterthought. Every message here
 * has to say what happened and what to do about it, because these are the
 * moments a user is most likely to give up.
 */
describe('toUserMessage', () => {
  it('explains the email rate limit and names the setting that avoids it', () => {
    // Supabase's built-in mail service allows only a couple of messages an
    // hour, which is easy to exhaust while first setting a project up.
    const message = toUserMessage(new Error('email rate limit exceeded'));
    expect(message).toMatch(/hour/i);
    expect(message).toMatch(/email confirmation/i);
  });

  it('handles the security cooldown wording', () => {
    const message = toUserMessage(
      new Error('For security purposes, you can only request this after 54 seconds.'),
    );
    expect(message).toMatch(/wait/i);
  });

  it('tells an existing user to sign in rather than sign up again', () => {
    expect(toUserMessage(new Error('User already registered'))).toMatch(/sign in/i);
  });

  it('explains an unconfirmed email', () => {
    expect(toUserMessage(new Error('Email not confirmed'))).toMatch(/confirmation email/i);
  });

  it('maps permission failures to the role that fixes them', () => {
    expect(toUserMessage({ code: '42501' })).toMatch(/owner/i);
  });

  it('maps a duplicate row to opening the existing record', () => {
    expect(toUserMessage({ code: '23505' })).toMatch(/already exists/i);
  });

  it('recognises an offline browser', () => {
    expect(toUserMessage(new Error('Failed to fetch'))).toMatch(/connection/i);
  });

  it('never returns an empty string, whatever it is given', () => {
    expect(toUserMessage(null).length).toBeGreaterThan(0);
    expect(toUserMessage(undefined).length).toBeGreaterThan(0);
    expect(toUserMessage({}).length).toBeGreaterThan(0);
  });
});
