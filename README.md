This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Plans and entitlements

ChatArchive has a Free/Premium entitlement architecture. Pricing and feature
definitions live in `src/lib/billing/config.ts`.

- **Free:** conversation viewer, import, search/filters, settings, and summary
  analytics.
- **Premium:** advanced analytics at `/analytics/advanced` (monthly and weekday
  charts, busiest weekday, top month, longest conversations, and detailed
  coverage notes).

### Security model

- The server reads a signed, HttpOnly `chatarchive_entitlement` cookie and
  verifies its HMAC signature and expiry on every request.
- The cookie stores only the plan id, timestamps, and source. Feature access is
  derived from the plan on the server.
- Missing, malformed, expired, or tampered cookies resolve to Free.
- Client components receive only a narrow resolved entitlement object. Premium
  access is never granted from localStorage or a client-side boolean.
- Development-mock cookies are rejected unless the runtime is development/test
  and `CHATARCHIVE_ENABLE_DEV_MOCKS=true`.
- Every runtime fails closed to Free when `ENTITLEMENT_SIGNING_SECRET` is
  missing or shorter than 16 characters.

### Development mock controls

Set a local `ENTITLEMENT_SIGNING_SECRET` (at least 16 characters) and
`CHATARCHIVE_ENABLE_DEV_MOCKS=true`, then open `/upgrade` with `npm run dev` to
find controls that simulate Premium for 30 days or 2 minutes, set a correctly
signed but expired entitlement, or reset to Free. No payment is processed.
These controls and server actions are available only in development/test
runtimes with the explicit opt-in. There is no real checkout yet; a future
provider can replace the mock issuer while keeping the same server-side
verification seam.

### Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
