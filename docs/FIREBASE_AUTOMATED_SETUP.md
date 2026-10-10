# Automated Firebase setup (GitHub Actions does the work)

You do 6 small things in your browser. GitHub Actions does everything else.

1. **Create the project.** <https://console.firebase.google.com> → Add project. Note the *Project ID*
   (shown under Project settings).
2. **Upgrade to Blaze** (Usage and billing). Then in Google Cloud → Billing → Budgets, add a budget alert.
3. **Create a deploy key.** <https://console.cloud.google.com/iam-admin/serviceaccounts> (select your
   project) → *Create service account* named `gh-deployer` → give it the role **Owner** → open it →
   *Keys* → *Add key* → *JSON* → a file downloads.
   (Owner is only needed for the first setup. Afterwards you can lower it, or delete the key.)
4. **Add it to GitHub.** Repo → Settings → Secrets and variables → Actions:
   * Secrets: `GCP_SA_KEY` = the **entire contents** of the JSON file.
     Optional now, needed for payments/admin: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
     (use `rzp_test_…` first), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (8+ characters).
   * Variables: `GCP_PROJECT_ID` = your project id. Optional: `SITE_URL` (defaults to
     `https://<project>.web.app`), `GCP_REGION` (default `asia-south1`).
5. **Merge the branch into `main`** (or run the workflow from the branch via the Actions tab).
6. Actions → **Firebase** → *Run workflow* → `bootstrap-and-deploy`.

Your site appears at `https://<project-id>.web.app`. Then run the workflow again with
`create-admin` to get your admin login.

To make every push to `main` redeploy automatically (tests must pass first), add the variable
`AUTO_DEPLOY` = `true` once the first manual run has succeeded.

Moving your old MongoDB data and adding your own domain: see `docs/FIREBASE_DEPLOYMENT.md`
sections 6 and 7. Delete the `GCP_SA_KEY` secret and the key when you no longer need it.
