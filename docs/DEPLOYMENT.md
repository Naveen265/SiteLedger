# Deployment

## Supabase

1. Create a project at supabase.com. Choose the region closest to your users;
   for India that is Mumbai (`ap-south-1`).
2. Open the SQL editor and run the migrations in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_audit_and_functions.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_storage.sql`
3. Under **Authentication, Providers**, confirm Email is enabled.
   For a first run, turn **Confirm email** off under **Authentication, Sign in
   and up** so you can sign in immediately. Turn it back on before real users.
4. Copy the Project URL and the anon public key from **Project settings,
   Data API**.

## Vercel

1. Push the repository to GitHub.
2. Import it on Vercel. The Vite framework preset is detected automatically;
   `vercel.json` already sets the build command, output directory, client side
   routing rewrites, asset caching and security headers.
3. Add these environment variables for **all** environments:

   | Key | Value | Reaches the browser |
   | --- | --- | --- |
   | `SUPABASE_URL` | your Supabase project URL | **no** |
   | `SUPABASE_ANON_KEY` | your anon public key | **no** |
   | `VITE_SITE_URL` | your production URL | yes |
   | `VITE_AUTH_PHONE_ENABLED` | `false` | yes |
   | `VITE_STORAGE_PROVIDER` | `supabase` | yes |

   The first two carry **no** `VITE_` prefix, and that is deliberate. Vite only
   inlines `VITE_` prefixed variables into the bundle, so the absence of the
   prefix is what keeps the credentials on the server. Adding one would publish
   them.

4. Deploy.

### Verifying the credentials are not exposed

After the first deployment, from the project root:

```bash
npm run build
grep -r "supabase.co" dist/ | grep -v "\*.supabase.co"
```

This should return nothing. The one permitted match, `*.supabase.co`, is a
wildcard string inside the Supabase library itself, not your project.

In the browser, open DevTools, Network, and sign in. Every request should go to
your own domain under `/api/supabase/...`. No request should be addressed to a
`.supabase.co` host.

## Subdomain

Under **Settings, Domains**, add your subdomain. Vercel will show the DNS record
to create with your domain registrar, which is a `CNAME` pointing at
`cname.vercel-dns.com`. Propagation is usually minutes.

Once the domain resolves, update `VITE_SITE_URL` to the subdomain and redeploy,
so password reset links point at the right host.

## Supabase redirect URLs

Under **Authentication, URL configuration**, set:

- **Site URL** — your production subdomain
- **Redirect URLs** — add `https://<your-subdomain>/reset-password` and
  `http://localhost:5173/reset-password`

Without these, password reset links will not return to the app.

## First run

1. Open the deployed app and choose **Create company**.
2. Fill in your name, company name, email and password.
3. You are now the owner and land on the company view with the onboarding
   checklist.
4. To populate demo data, run `supabase/seed/seed.sql` in the SQL editor, then
   `select seed_demo_data();`.

## Turning on phone and OTP login later

Site staff do not reliably have email, so phone plus OTP is the intended login.
It needs a paid SMS provider.

1. Set up MSG91, Twilio or MessageBird.
2. In Supabase, under **Authentication, Providers, Phone**, enable it and enter
   the provider credentials.
3. Set `VITE_AUTH_PHONE_ENABLED=true` in Vercel and redeploy.

No code changes. The provider is already implemented behind the adapter in
`src/lib/auth/providers/phoneOtp.ts`.
