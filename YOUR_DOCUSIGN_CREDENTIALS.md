# Your DocuSign Setup - GRIP Dashboard

## ✅ What You Have

**Integration Key (Client ID):** `b02ec03c-8ea7-4986-8ffe-115cf2a5524c`

**App Name:** grip

**Integration Type:** Private custom integration ✓

**Authentication Method:** Authorization Code Grant (needs to be changed)

## 🚨 IMPORTANT: Change Authentication Method

Your current setup uses "Authorization Code Grant" but you need **"Service Integration"** with JWT for automated email sending.

### Step 1: Enable Service Integration (JWT)

1. Go back to your DocuSign Admin → Apps and Keys
2. Find your "grip" application
3. Under **Service Integration** section:
   - Click **"Generate RSA"**
   - This will generate a public/private keypair
   - **Download the private key file** immediately (you can only download it once!)
   - Save it securely

## 📋 What You Still Need

After generating the RSA keypair, you'll need these values:

### Required Information

1. ✅ **Integration Key:** `b02ec03c-8ea7-4986-8ffe-115cf2a5524c` (you have this)

2. ❓ **User ID:** 
   - Find this in DocuSign Admin under your account profile
   - Usually looks like: `12345678-abcd-1234-abcd-1234567890ab`
   - Or an email-like format in some cases

3. ❓ **Account ID:**
   - Also in DocuSign Admin, usually in the account dropdown
   - Format: 8 characters, e.g., `12345678`

4. ❓ **Private Key:**
   - Generated when you click "Generate RSA" (Step 1 above)
   - Looks like:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA...
   (many lines of text)
   ...
   -----END RSA PRIVATE KEY-----
   ```

### How to Find User ID and Account ID

1. Log into DocuSign at https://demo.docusign.net (or your production URL)
2. Click your profile picture/name in top right
3. Go to **My Account** or **Admin**
4. **User ID:** Usually shown in your user profile
5. **Account ID:** Shown in account settings or in the URL when you're in Admin

## 🔐 Grant Consent (CRITICAL STEP)

After generating the RSA keypair, you MUST grant consent:

1. In DocuSign Admin, go to your "grip" app
2. Scroll to **Service Integration** section
3. Click the **"Grant Consent"** button (or **"ADD USER TO CONSENT"**)
4. You'll be redirected to authorize the application
5. Click **"Allow"** or **"Accept"**

**Without this step, you'll get 401 errors even with correct credentials!**

## 📝 Convert Private Key (If Needed)

If the generated key says "RSA PRIVATE KEY" instead of "PRIVATE KEY", convert it:

```powershell
# Using OpenSSL (install from https://slproweb.com/products/Win32OpenSSL.html)
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in docusign_private_key.pem -out docusign_private_key_pkcs8.pem
```

Then use the `docusign_private_key_pkcs8.pem` file.

## 🔧 Setting Up in Supabase

### Option A: Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr
2. Click **Edge Functions** → **Manage secrets**
3. Add these 6 secrets:

| Secret Name | Value |
|------------|-------|
| `DOCUSIGN_INTEGRATION_KEY` | `b02ec03c-8ea7-4986-8ffe-115cf2a5524c` |
| `DOCUSIGN_USER_ID` | *Your User ID from DocuSign* |
| `DOCUSIGN_ACCOUNT_ID` | *Your Account ID from DocuSign* |
| `DOCUSIGN_PRIVATE_KEY` | *Paste entire private key with BEGIN/END lines* |
| `DOCUSIGN_BASE_URI` | `https://demo.docusign.net` |
| `DOCUSIGN_AUTH_SERVER` | `account-d.docusign.com` |

### Option B: Supabase CLI

```powershell
# Install CLI
npm install -g supabase

# Link to your project
supabase link --project-ref grvamqvqhzgsignycrtr

# Set secrets
supabase secrets set DOCUSIGN_INTEGRATION_KEY=b02ec03c-8ea7-4986-8ffe-115cf2a5524c
supabase secrets set DOCUSIGN_USER_ID=your-user-id-here
supabase secrets set DOCUSIGN_ACCOUNT_ID=your-account-id-here
supabase secrets set DOCUSIGN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...paste your full private key here...
-----END PRIVATE KEY-----"
supabase secrets set DOCUSIGN_BASE_URI=https://demo.docusign.net
supabase secrets set DOCUSIGN_AUTH_SERVER=account-d.docusign.com
```

## 🚀 Deploy Edge Functions

After setting secrets:

```powershell
# Deploy the DocuSign functions
supabase functions deploy docusign-send-envelope
supabase functions deploy docusign-list-templates
supabase functions deploy docusign-template-roles
```

## ✅ Checklist

- [ ] Generate RSA keypair in DocuSign Admin
- [ ] Download private key file
- [ ] Grant consent for the application
- [ ] Get your User ID from DocuSign
- [ ] Get your Account ID from DocuSign
- [ ] Convert key to PKCS#8 format (if needed)
- [ ] Set all 6 secrets in Supabase
- [ ] Deploy edge functions
- [ ] Restart dev server: `npm run dev`
- [ ] Test by creating an order and sending via DocuSign

## 🧪 Testing

1. Restart your dev server: `npm run dev`
2. Open http://localhost:5173/
3. Navigate to **Create Order** page
4. Fill in test data:
   - Agency Name: Test Agency
   - Contact Name: Your Name
   - Email: your-test-email@example.com
   - Select a plan: Standard
5. Click **"Generate & Send via DocuSign"**
6. Check console for success (no 401 error)
7. Check email for DocuSign envelope

## 🆘 Troubleshooting

### Still getting 401?
1. Verify all 6 secrets are set correctly
2. Make sure you clicked "Grant Consent" in DocuSign
3. Check that private key includes BEGIN/END lines
4. Verify User ID and Account ID are correct

### "User consent required" error
- You forgot to click "Grant Consent" button in DocuSign Admin
- Go back and authorize the application

### Private key format error
- Convert to PKCS#8 format using OpenSSL command above

## 🔒 Security Notes

- **Never commit** the private key to version control
- The private key in Supabase secrets is encrypted
- Keep your Integration Key confidential
- Use demo environment for testing, production for live

## 📞 Next Steps

Once you have the RSA keypair generated and consent granted, let me know and I'll help you:
1. Verify the secrets are set correctly
2. Test the integration
3. Troubleshoot any issues

---

**Status:** ⏳ Waiting for you to generate RSA keypair and get User ID + Account ID
