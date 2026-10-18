# CVPro payment verification — deployment checklist

## Important: GitHub Pages cannot run these API functions
The public website is currently served from GitHub Pages. GitHub Pages serves static files only, so requests to `/api/verify-paypal` and `/api/premium-download` on the GitHub Pages domain will not run these Node.js handlers.

Deploy this repository to Vercel (or another Node.js serverless host) and configure the website to call that deployed API origin. Do not assume the API works until the deployed endpoint is tested.

## Required server environment variables
Configure these in the backend host settings, not in HTML or committed source:
- `PAYPAL_CLIENT_ID` — Live PayPal REST app client ID
- `PAYPAL_CLIENT_SECRET` — Live PayPal REST app secret
- `DOWNLOAD_SECRET` — a random secret with at least 32 characters

Never put the PayPal client secret or download signing secret in client-side code or public GitHub files.

## Current premium catalog
The current homepage lists:
- Executive Purple — USD 4.99
- Professional Pro — USD 6.99
- Creative Green — USD 5.99
- Dark Sidebar — USD 5.49
- Tech Developer — USD 6.49
- Portfolio Modern — USD 6.99

The secure download handler currently has source assets only for Executive Purple, Professional Pro, Creative Green, and Portfolio Modern. Dark Sidebar and Tech Developer must not be sold as downloadable products until their assets are added to the private download store.

## PayPal verification
The server checks the PayPal capture directly and requires COMPLETED status, USD currency, and the expected amount for the selected template. The buyer must enter a real PayPal capture ID. A successful amount/status check alone is not a complete commerce system: before launch, also bind each capture to the intended product/order and prevent the same capture from being redeemed for another product.

## Nagad
The current Nagad flow collects the transaction ID and opens an email for manual review. This is a request for review, not automatic payment verification. Do not grant download access until the seller independently confirms that the payment was received. Automated verification requires official Nagad merchant/API credentials and a server-side integration.

## Critical asset protection requirement
The repository is public and template files under `templates/` are directly readable/downloadable from GitHub. A signed download URL does not protect a file that is still publicly available at its raw GitHub URL. Before charging customers, move all premium source files to private storage accessible only to the serverless download handler. Deleting a file from the latest commit alone is not sufficient to erase it from public Git history.

## Pre-launch checks
1. Deploy the API functions on a serverless host and set the secrets above.
2. Configure the frontend to call the deployed API origin (GitHub Pages cannot resolve relative `/api/*` calls to a separate Vercel deployment automatically).
3. Move paid assets to private storage and verify direct public GitHub file URLs no longer expose them.
4. Test wrong IDs, pending/failed captures, wrong amounts, expired links, and repeated use of one capture ID. All must fail closed.
5. Test a real low-value purchase and refund before public launch.
