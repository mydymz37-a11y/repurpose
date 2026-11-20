# RepurposeKit

A bilingual (English/Arabic) content repurposing workspace with user-owned OpenAI or Google Gemini API keys.

## Features
- Email-code sign-in through Hatchable authentication.
- Transform source text into a campaign pack: executive summary, 10 LinkedIn posts, 10 X posts, 5 short-video scripts, 5 Instagram concepts, newsletter, YouTube SEO, SEO headlines, seven-day calendar, platform CTAs, and review checklist.
- Paste text, extract public article text (best effort), attempt public YouTube captions (best effort), or import TXT, Markdown, PDF, and DOCX in-browser.
- Set language, tone, audience, brand, keywords, CTA, and avoid-list.
- Save, list, open, and delete projects in your account.
- Export content as TXT, Markdown/Notion-ready Markdown, CSV, or JSON.
- Save, test, replace, and delete your own AI key from account Settings.
- Server-side encrypted AI keys using AES-GCM; key records are account-scoped and never returned by the status endpoint.
- User-owned AI usage: users pay their selected provider directly; the app does not include AI credits.

## AI keys and costs
Supported providers: OpenAI and Gemini. Key encryption requires the project owner's AI_KEYS_ENCRYPTION_SECRET (64 hex characters) configured in Hatchable setup. Keys are decrypted server-side only for the generation request. Customers must create and maintain their own provider accounts, API keys, billing, and usage limits.

## Current limitations
- Automatic article and YouTube extraction is not guaranteed; paste text/transcripts if it fails.
- Scanned PDFs and OCR are not supported.
- No automatic social publishing or scheduling.
- Checkout, payment processing, and AppSumo vendor-code integration are not implemented.
- License codes are issued through owner-only admin endpoints, stored hashed, and redeemed internally. This is not connected to AppSumo's vendor redemption API or payment webhook.
- Pricing shown on the marketing page is illustrative and not connected to checkout.

## Release checks
- Deploy validator currently reports no errors or warnings.
- Authenticated end-to-end tests (signup/login, saving a real AI key, AI generation with provider billing, project CRUD, and license redemption) still require manual testing with an actual user account and provider key.
- Legal pages are draft product disclosures and require review against the seller's actual business, jurisdictions, retention practices, and marketplace requirements.

## Hosting
Hatchable handles hosting, auth, and PostgreSQL. Public app: https://repurposekit.hatchable.site