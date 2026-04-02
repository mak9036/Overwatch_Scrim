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

## Admin Panel

To enable admin-only post management (update/delete):

1. Create a `.env.local` file in the project root.
2. Add:

```bash
ADMIN_PANEL_PASSWORD=your_secure_password_here
```

3. Start the app with `npm run dev`.
4. Open `http://localhost:3000/admin/login` and sign in.

After login, admins can manage posts at `http://localhost:3000/admin`.

## Discord DM Notifications

This repo now includes a built-in Discord linking flow and a worker process that sends DMs for unread site notifications.

### 1) Required environment variables

Add these to `.env.local` (or your deployment environment):

```bash
SESSION_SECRET=replace_with_a_long_random_secret
DISCORD_CLIENT_ID=your_discord_app_client_id
DISCORD_CLIENT_SECRET=your_discord_app_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/account/discord/callback
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_NOTIFICATION_POLL_MS=15000
```

### 2) Discord Developer Portal setup

- Create an OAuth2 application and bot.
- In OAuth2 Redirects, add the same URL as `DISCORD_REDIRECT_URI`.
- Enable bot permissions needed for DMs (no guild admin scopes required for this flow).

### 3) Connect a website account to Discord

- Log in on the website.
- Open Account Profile.
- Click **Connect Discord** in the Discord Integration section.

### 4) Run both processes

```bash
# web app
npm run dev

# discord worker (in another terminal)
npm run discord:worker
```

The worker reads website data from `data/*.json` and sends Discord DMs to linked users when they have unread notifications.

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
