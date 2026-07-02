# Setting Up Real Payments (Stripe)

This app is a **static, client-only** front end (vanilla HTML/CSS/JS + LocalStorage, no server/database).
That constrains how payments can work: a secret API key must never live in client-side JS, so this
guide uses **Stripe Payment Links**, which need zero backend code. It also documents the
production-grade path if/when you add a server.

## Option A — No-code MVP: Stripe Payment Links (works today)

1. Create a Stripe account at https://dashboard.stripe.com/register (or log in).
2. In the Dashboard: **Product catalog → Add product**.
   - Name: `LIFEMAXXING Premium`
   - Pricing: Recurring, €9.99 / month (match the price shown in the app's upgrade buttons).
3. Go to **Payment links → New**, select the product/price you just created.
4. Under the link's settings, set an **"After payment" confirmation** to *redirect customers to your
   website* and use:
   ```
   https://yourdomain.com/index.html?upgraded=1
   ```
   (If you deploy at the root, `https://yourdomain.com/?upgraded=1` works too.)
5. Copy the generated payment link URL (looks like `https://buy.stripe.com/xxxxxxxx`).
6. Open `app.js` and replace the placeholder near the top:
   ```js
   const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/REPLACE_WITH_YOUR_LINK";
   ```
   with your real link.
7. Deploy. Clicking any "Upgrade to Premium" button now opens Stripe Checkout in a new tab. After a
   successful payment, Stripe redirects the user back with `?upgraded=1`, and `app.js` flips
   `state.premium = true` in LocalStorage, unlocking the AI analysis, velocity chart, and skill trees.

### ⚠️ Important limitation of Option A
Because there's no backend, **anyone can manually type `?upgraded=1` into the URL** and unlock
Premium without paying — there is no server-side verification of the Stripe session. This is fine for
an MVP / soft launch, but do not rely on it once real revenue is at stake.

## Option B — Production-grade: Stripe Checkout Sessions + Webhooks

Once you add any backend (even a single serverless function), do this instead:

1. Add a minimal server endpoint (Node/Express, Vercel/Netlify function, Cloudflare Worker, etc.)
   that creates a Stripe Checkout Session server-side using your **secret key** (never expose it to
   the browser):
   ```js
   const session = await stripe.checkout.sessions.create({
     mode: "subscription",
     line_items: [{ price: "price_XXXX", quantity: 1 }],
     success_url: "https://yourdomain.com/?upgraded=1&session_id={CHECKOUT_SESSION_ID}",
     cancel_url: "https://yourdomain.com/",
   });
   ```
2. Have `app.js`'s `startUpgradeCheckout()` call that endpoint (via `fetch`) instead of opening a
   static link, then redirect the browser to `session.url`.
3. Add a **Stripe webhook** endpoint listening for `checkout.session.completed` and
   `customer.subscription.deleted`. On the former, mark the user premium in your real database (not
   LocalStorage); on the latter, revoke it.
4. Require user accounts (email/password or OAuth) so premium status is tied to an identity you
   control server-side, not just a browser's LocalStorage.
5. Verify the `session_id` server-side before trusting the `?upgraded=1` redirect, and drive the
   client's premium flag from an authenticated `/api/me` call rather than the URL parameter.

## Testing

Stripe provides test mode with fake card numbers (e.g. `4242 4242 4242 4242`, any future expiry, any
CVC). Use your **test** Payment Link / keys until you're ready to go live, then switch to live mode.

## Checklist before accepting real money

- [ ] Business entity / tax details configured in Stripe
- [ ] Terms of Service, Privacy Policy, and Refund Policy reviewed by counsel (see `LEGAL.md` as a
      starting point, not a final document)
- [ ] Clear pricing and cancellation flow disclosed to users
- [ ] Webhook-based verification (Option B) if you expect meaningful revenue or fraud risk
- [ ] Customer support / dispute process in place
