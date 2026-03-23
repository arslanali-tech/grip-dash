# DocuSign Setup - Visual Step-by-Step Guide

## 🎯 Your Mission

Get these 3 pieces of information from DocuSign and set them up in Supabase.

---

## Step 1: Generate RSA Keypair (Private Key)

### In your DocuSign Apps and Keys page:

1. Find your "grip" application
2. Scroll down to **"Service Integration"** section
3. Look for **"RSA Keypairs"**
4. Click the blue **"Generate RSA"** button
5. A private key will be generated
6. Click **"Download"** - save the file (e.g., `docusign_private_key.txt`)
7. ⚠️ You can only download this ONCE! Save it securely!

**What it looks like:**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAxyz...
(many lines)
...xyz123
-----END RSA PRIVATE KEY-----
```

### After generating:
- You'll see the keypair listed with an ID (e.g., `12345678-abcd-efgh`)
- The public key is stored in DocuSign automatically

---

## Step 2: Grant Consent (CRITICAL!)

### Still in the same "grip" app page:

1. After generating the RSA keypair, scroll to **"Service Integration"** section
2. Look for a button that says:
   - **"Grant Consent"** OR
   - **"ADD USER TO CONSENT"** OR
   - A consent URL link
3. Click it
4. You'll be redirected to a DocuSign authorization page
5. Click **"Allow"** or **"Accept"** to authorize the app
6. You'll be redirected back

**Why this matters:** Without consent, DocuSign will reject all API calls with 401 errors, even if credentials are correct!

---

## Step 3: Find Your User ID

### Method A: In the Apps and Keys page
- Look at the top of the page
- You might see "API Username" or "User ID"
- Copy it (format: `12345678-1234-1234-1234-123456789abc`)

### Method B: In Account Settings
1. Click your profile/avatar in top-right corner
2. Go to **"My Preferences"** or **"Account"**
3. Look for **"API Username"** or **"User ID"**
4. Copy it

---

## Step 4: Find Your Account ID

### Method A: Look at the URL
When you're in the DocuSign Admin panel, the URL looks like:
```
https://admindemo.docusign.com/...?accountId=12345678
```
The `accountId` parameter (8 characters) is your Account ID!

### Method B: In Account Settings
1. Click the account dropdown in top navigation
2. Go to **"Account Settings"**
3. Look for **"Account ID"** 
4. Usually 8 characters or digits

---

## Step 5: Set Up in Supabase

### Using Supabase Dashboard (Recommended):

1. Go to: https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr

2. In left sidebar, click **"Edge Functions"**

3. Click **"Manage secrets"** or **"Secrets"**

4. Add these 6 secrets one by one:

| Secret Name | What to paste | Example |
|------------|---------------|---------|
| `DOCUSIGN_INTEGRATION_KEY` | Your integration key | `b02ec03c-8ea7-4986-8ffe-115cf2a5524c` |
| `DOCUSIGN_USER_ID` | User ID from Step 3 | `12345678-1234-1234-1234-123456789abc` |
| `DOCUSIGN_ACCOUNT_ID` | Account ID from Step 4 | `12345678` |
| `DOCUSIGN_PRIVATE_KEY` | Contents of private key file | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `DOCUSIGN_BASE_URI` | Fixed value | `https://demo.docusign.net` |
| `DOCUSIGN_AUTH_SERVER` | Fixed value | `account-d.docusign.com` |

**For the Private Key:**
- Open the downloaded private key file in Notepad
- Copy EVERYTHING including the `-----BEGIN` and `-----END` lines
- Paste it directly into Supabase

---

## Step 6: Convert Private Key Format (If Needed)

If you get errors about private key format, you need to convert from RSA to PKCS#8.

### Using OpenSSL on Windows:

1. **Install OpenSSL:**
   - Download from: https://slproweb.com/products/Win32OpenSSL.html
   - Install the "Win64 OpenSSL" version

2. **Convert the key:**
   ```powershell
   cd "C:\path\to\where\you\saved\key"
   
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in docusign_private_key.txt -out docusign_private_key_pkcs8.txt
   ```

3. **Use the new file:**
   - Open `docusign_private_key_pkcs8.txt`
   - Copy the contents
   - Update the `DOCUSIGN_PRIVATE_KEY` secret in Supabase

---

## Step 7: Deploy Edge Functions

### Using Supabase CLI:

```powershell
# Install Supabase CLI globally
npm install -g supabase

# Navigate to your project
cd D:\a\grip_dashboard_real_1_2g4ufg

# Link to your Supabase project
supabase link --project-ref grvamqvqhzgsignycrtr

# Deploy the functions
supabase functions deploy docusign-send-envelope
supabase functions deploy docusign-list-templates
supabase functions deploy docusign-template-roles
```

### Or Using Supabase Dashboard:

1. In Supabase dashboard, go to **Edge Functions**
2. Click **"Deploy function"** for each function
3. Select the function files from your project

---

## Step 8: Test the Integration

1. **Restart your dev server:**
   ```powershell
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Open the app:**
   - Go to http://localhost:5173/
   - Click **"Create Order"** in the navigation

3. **Fill in test data:**
   - Agency Name: `Test Agency`
   - Contact Name: `Test User`
   - Email: `your-email@example.com` (use your real email to receive test)
   - Phone: `07700 900000`
   - Select Plan: `Standard`

4. **Click "Generate & Send via DocuSign"**

5. **Check results:**
   - Browser console should show success (no 401 error)
   - You should see green success message
   - Check your email for DocuSign envelope

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ No 401 error in browser console
- ✅ "DocuSign agreement sent to the client" message appears
- ✅ Email arrives with DocuSign envelope
- ✅ You can open and view the agreement

---

## 🆘 Common Problems

### Problem: "401 Unauthorized"
**Causes:**
- You didn't click "Grant Consent"
- Wrong User ID or Account ID
- Private key not set correctly

**Fix:**
1. Go back to DocuSign and click "Grant Consent"
2. Double-check all 6 secrets in Supabase
3. Make sure private key includes BEGIN/END lines

### Problem: "Invalid integration key"
**Cause:** Wrong Integration Key

**Fix:** 
- Your key is: `b02ec03c-8ea7-4986-8ffe-115cf2a5524c`
- Update in Supabase if different

### Problem: "Private key format error"
**Cause:** Key is in RSA format instead of PKCS#8

**Fix:** Convert using OpenSSL (see Step 6 above)

### Problem: Function not found
**Cause:** Edge functions not deployed

**Fix:** Run `supabase functions deploy` commands

---

## 📋 Quick Checklist

Before testing, make sure you have:

- [ ] Generated RSA keypair in DocuSign
- [ ] Downloaded private key file
- [ ] Clicked "Grant Consent" button
- [ ] Found your User ID
- [ ] Found your Account ID  
- [ ] Set all 6 secrets in Supabase (check spelling!)
- [ ] Deployed edge functions
- [ ] Restarted dev server

---

## 🎉 What Happens After Setup

Once working, here's the flow:

1. You fill out "Create Order" form
2. Click "Generate & Send via DocuSign"
3. Backend creates DocuSign envelope
4. DocuSign sends email to client
5. Client receives email with "Review Document" button
6. Client clicks, signs the agreement online
7. You get notification when signed
8. Signed document stored in DocuSign

---

## 📞 Need Help?

If you're stuck, provide:
- Screenshot of the error in browser console
- Which step you're on
- What you've tried so far

---

**Your Integration Key:** `b02ec03c-8ea7-4986-8ffe-115cf2a5524c`

**Your Supabase Project:** `grvamqvqhzgsignycrtr`

**Current Status:** ⏳ Waiting for RSA keypair generation and User/Account IDs
