# CVPro automatic payment verification

The GitHub Pages site is static, so payment verification must run on a serverless backend.

## Backend
These Vercel-compatible functions are included:

- `api/verify-paypal.js` verifies a PayPal capture ID against the selected template price.
- `api/premium-download.js` issues a short-lived signed download URL.

## Required environment variables
Set these on the backend hosting service:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `DOWNLOAD_SECRET`

Never put the PayPal Client Secret in `index.html` or commit it to GitHub.

## PayPal
The PayPal app must be a Live app. The buyer's PayPal transaction/capture ID is sent to the verification endpoint. The endpoint checks that the capture is COMPLETED, USD, and matches the selected template price.

## Important security note
For a truly protected premium product, the premium source files should not remain publicly downloadable from GitHub Pages. After the backend is deployed, move premium files to private/server-side storage and serve them only through the verified download endpoint.

## Nagad
Nagad automatic verification requires merchant/API credentials and the applicable Nagad merchant API flow. The current website can continue to collect a Nagad Transaction ID for manual confirmation until those merchant credentials are available.
