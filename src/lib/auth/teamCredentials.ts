/**
 * Login address derivation, shared with the server.
 *
 * The definition lives in api/_credentials.ts because the serverless function
 * can only import what ships beside it. Vite inlines this re-export at build
 * time, so the browser carries no dependency on that folder at runtime and
 * both sides are guaranteed to derive the same address.
 */
export {
  buildTeamEmail,
  isValidUsername,
  isValidCompanyCode,
  looksLikeEmail,
} from '../../../api/_credentials';
