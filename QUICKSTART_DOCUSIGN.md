# Quick Start: DocuSign Integration

## 🚀 Get DocuSign Working in 5 Steps

### Step 1: Create DocuSign Developer Account
1. Go to https://developers.docusign.com/
2. Sign up for a free developer account
3. Verify your email

### Step 2: Create Integration
1. In the DocuSign Admin dashboard, go to **Apps and Keys**
2. Click **Add App and Integration Key**
3. Give it a name (e.g., "GRIP Dashboard")
4. Copy the **Integration Key** (you'll need this)

### Step 3: Generate RSA Keypair
1. In the same app settings, click **Generate RSA**
2. Download the private key file
3. Copy your **User ID** from the dashboard
4. Copy your **Account ID** from the dashboard

### Step 4: Set Supabase Secrets

#### Option A: Using Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr
2. Click **Edge Functions** → **Manage secrets**
3. Add these secrets:

```
DOCUSIGN_INTEGRATION_KEY = <paste your integration key>
DOCUSIGN_USER_ID = <paste your user id>
DOCUSIGN_ACCOUNT_ID = <paste your account id>
DOCUSIGN_PRIVATE_KEY = <paste entire private key including BEGIN/END lines>
DOCUSIGN_BASE_URI = https://demo.docusign.net
DOCUSIGN_AUTH_SERVER = account-d.docusign.com
```

#### Option B: Using Supabase CLI
```powershell
npm install -g supabase
supabase link --project-ref grvamqvqhzgsignycrtr
supabase secrets set DOCUSIGN_INTEGRATION_KEY=your-key
supabase secrets set DOCUSIGN_USER_ID=your-user-id
supabase secrets set DOCUSIGN_ACCOUNT_ID=your-account-id
supabase secrets set DOCUSIGN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...paste key here...
-----END PRIVATE KEY-----"
supabase secrets set DOCUSIGN_BASE_URI=https://demo.docusign.net
supabase secrets set DOCUSIGN_AUTH_SERVER=account-d.docusign.com
```

### Step 5: Deploy Edge Functions
```powershell
supabase functions deploy docusign-send-envelope
supabase functions deploy docusign-list-templates
supabase functions deploy docusign-template-roles
```

## ✅ Test It

1. Restart your dev server: `npm run dev`
2. Open http://localhost:5173/
3. Click **Create Order** in the top navigation
4. Fill out the form with test data
5. Click **Generate & Send via DocuSign**
6. Check browser console - should see success (no 401 error)
7. Check the recipient's email for DocuSign message

## 🆘 Common Issues

### "401 Unauthorized"
- Make sure all 6 secrets are set in Supabase
- Verify the private key includes the BEGIN/END lines
- Check that Integration Key is correct

### "Private key must be PKCS#8"
Convert your key:
```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in key.pem -out key_pkcs8.pem
```

### "User consent required"
In DocuSign Admin:
1. Go to your Integration settings
2. Click **Grant Consent**
3. Authorize the application

## 📚 Need More Help?

See the detailed guide: `DOCUSIGN_SETUP.md`

## 🎯 What This Fixes

After setup, when you click "Generate & Send via DocuSign":
- ✅ No more 401 errors
- ✅ Client receives DocuSign envelope via email
- ✅ Client can sign the agreement online
- ✅ You get notified when signed
- ✅ Signed documents stored in DocuSign

---

**Estimated Time:** 15-20 minutes for first-time setup
