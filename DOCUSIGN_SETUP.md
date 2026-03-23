# DocuSign Integration Setup Guide

## Overview
The GRIP Dashboard uses DocuSign to send service agreements to clients via email. The integration uses Supabase Edge Functions that need proper configuration.

## Current Issue
The application is showing a **401 Unauthorized** error when trying to send DocuSign envelopes because the required credentials are not configured in your Supabase project.

## Required DocuSign Credentials

You need to set up the following environment variables in your Supabase project:

### 1. DocuSign Developer Account Setup

1. Go to [DocuSign Developer](https://developers.docusign.com/)
2. Create a free developer account if you don't have one
3. Create an Integration Key (Application)
4. Generate an RSA keypair for JWT authentication
5. Add your User ID to the integration
6. Get your Account ID from your DocuSign account

### 2. Required Environment Variables

These need to be set as **secrets** in your Supabase project (not in .env.local):

```bash
DOCUSIGN_INTEGRATION_KEY=<your-integration-key>
DOCUSIGN_USER_ID=<your-user-id>
DOCUSIGN_ACCOUNT_ID=<your-account-id>
DOCUSIGN_PRIVATE_KEY=<your-rsa-private-key-in-pkcs8-format>
DOCUSIGN_BASE_URI=https://demo.docusign.net  # Use https://na3.docusign.net for production
DOCUSIGN_AUTH_SERVER=account-d.docusign.com   # Use account.docusign.com for production
DOCUSIGN_DEFAULT_TEMPLATE_ID=<optional-default-template-id>
```

### 3. Setting Secrets in Supabase

#### Option A: Using Supabase CLI (Recommended)

```powershell
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref grvamqvqhzgsignycrtr

# Set secrets
supabase secrets set DOCUSIGN_INTEGRATION_KEY=your-integration-key
supabase secrets set DOCUSIGN_USER_ID=your-user-id
supabase secrets set DOCUSIGN_ACCOUNT_ID=your-account-id
supabase secrets set DOCUSIGN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0...
(your full private key)
...
-----END PRIVATE KEY-----"
supabase secrets set DOCUSIGN_BASE_URI=https://demo.docusign.net
supabase secrets set DOCUSIGN_AUTH_SERVER=account-d.docusign.com
supabase secrets set DOCUSIGN_DEFAULT_TEMPLATE_ID=your-template-id
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr
2. Navigate to **Edge Functions** → **Manage secrets**
3. Add each secret listed above

### 4. Deploy Edge Functions

After setting the secrets, deploy the DocuSign edge functions:

```powershell
# Deploy all functions
supabase functions deploy

# Or deploy specific DocuSign functions
supabase functions deploy docusign-send-envelope
supabase functions deploy docusign-list-templates
supabase functions deploy docusign-template-roles
```

### 5. Optional: Configure Frontend Template ID

If you want to specify a default template ID from the frontend, update `.env.local`:

```
VITE_DOCUSIGN_TEMPLATE_ID=your-template-id-here
```

## Converting RSA Key to PKCS#8 Format

If your DocuSign private key is not in PKCS#8 format, convert it using OpenSSL:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in docusign_private_key.pem -out docusign_private_key_pkcs8.pem
```

## Testing the Integration

1. After setting up all credentials and deploying functions
2. Restart your dev server: `npm run dev`
3. Navigate to "Create Order" page
4. Fill in the form and click "Generate & Send via DocuSign"
5. Check the browser console for any errors
6. The recipient should receive an email from DocuSign

## Troubleshooting

### 401 Unauthorized Error
- Ensure all required secrets are set in Supabase
- Verify your DocuSign Integration Key has JWT authentication enabled
- Check that the User ID matches your DocuSign account
- Ensure the private key is in PKCS#8 format

### Template Not Found Error
- Verify the template ID exists in your DocuSign account
- Make sure you're using the correct template ID format (UUID)
- Templates must be in the same account as your credentials

### Rate Limiting
- DocuSign has rate limits on API calls
- The application includes a 60-second cooldown for magic links
- Consider implementing additional throttling for high-volume usage

## Alternative: Document-Based Envelopes (No Template)

If you don't want to use templates, you can send documents directly by:

1. Setting `VITE_DOCUSIGN_USE_DOCUMENT=true` in `.env.local`
2. Placing your PDF at the specified path (default: `./service-agreement.pdf`)
3. Or providing a `documentUrl` when calling the function

This will embed the document directly in the envelope instead of using a template.

## Security Notes

- Never commit `.env.local` or any files containing secrets to version control
- Use different credentials for development (demo.docusign.net) and production
- Regularly rotate your private keys
- Keep your integration key secure
- Use Supabase RLS policies to restrict who can call the edge functions
