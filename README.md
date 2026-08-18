# Audit Devrika

## Variabile de mediu

Auditul pe cont Google Ads conectat (`/google-ads`):

| Variabila | Rol |
|---|---|
| `GADS_OAUTH_CLIENT_ID` / `GADS_OAUTH_CLIENT_SECRET` | clientul OAuth prin care prospectul da acces de citire |
| `GADS_DEVELOPER_TOKEN` | dreptul de a citi conturi reale prin Google Ads API |
| `GADS_REDIRECT_URI` | implicit `http://localhost:3000/api/google-ads/callback` |
| `GADS_SESSION_SECRET` | semnatura cookie-ului de sesiune (**obligatoriu in productie**) |
| `GADS_DEMO=1` | mod demo: tot fluxul merge pe cifre simulate, fara Google si fara chei |
| `DASH_USER` / `DASH_PASS` | parola dashboard-ului intern `/dashboard` (**obligatorii in productie** — fara ele raspunde 503) |

Mod demo, pentru demonstratii si testare fara cont real:

```bash
GADS_DEMO=1 npm run dev
```

Raportul generat asa poarta vizibil banda "MOD DEMO — cifre simulate".

---

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
