<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/026992f5-e88f-4dc8-8e94-2ac1ca873479

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Online multi-device setup

1. In the Supabase SQL Editor, run [20260909_online_operations.sql](supabase/migrations/20260909_online_operations.sql). This is the current migration; do not run the older `20260902` draft for a new deployment.
2. Deploy the Node server (`npm run build`, then `npm start`) to a public HTTPS service. Configure its environment with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, a long random `AUTH_SECRET`, and `ALLOWED_ORIGINS` containing the exact web-app URL(s). Never place the service-role key in the client app.
3. Build the client with `VITE_API_URL=https://your-server.example` and deploy/rebuild the Android app. Every device must use that same API URL.
4. Sign in as an existing manager account, then create staff accounts from Team. New accounts are manager-created and receive an individual PIN. Their company, division, photo, role, and venue/area assignments are stored with their profile.

The app keeps working with its local cache when a device loses connectivity. Cloud changes and live updates require the public API to be reachable. Push notifications require Firebase Cloud Messaging credentials and Android Firebase configuration; they are intentionally not faked by this repository.
