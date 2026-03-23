import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.2.4';

type TokenCache = { accessToken: string; expiresAtMs: number };
let tokenCache: TokenCache | null = null;

function env(name: string, fallback?: string): string {
  const value = Deno.env.get(name) ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizePem(pem: string): string {
  // Supabase secrets often store newlines as "\n".
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
}

export type DocuSignConfig = {
  integrationKey: string;
  userId: string;
  accountId: string;
  baseUri: string; // e.g. https://demo.docusign.net
  authServer: string; // e.g. account-d.docusign.com
};

export function getDocuSignConfig(): DocuSignConfig {
  return {
    integrationKey: env('DOCUSIGN_INTEGRATION_KEY'),
    userId: env('DOCUSIGN_USER_ID'),
    accountId: env('DOCUSIGN_ACCOUNT_ID'),
    baseUri: env('DOCUSIGN_BASE_URI', 'https://demo.docusign.net'),
    authServer: env('DOCUSIGN_AUTH_SERVER', 'account-d.docusign.com'),
  };
}

async function getJwtAssertion(config: DocuSignConfig): Promise<string> {
  const privateKeyPemRaw = env('DOCUSIGN_PRIVATE_KEY');
  const privateKeyPem = normalizePem(privateKeyPemRaw);

  // `jose` expects PKCS#8 for importPKCS8.
  if (!privateKeyPem.includes('BEGIN PRIVATE KEY')) {
    throw new Error(
      'DOCUSIGN_PRIVATE_KEY must be a PKCS#8 PEM (-----BEGIN PRIVATE KEY-----). Convert your RSA key to PKCS#8.'
    );
  }

  const key = await importPKCS8(privateKeyPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ scope: 'signature impersonation' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(config.integrationKey)
    .setSubject(config.userId)
    .setAudience(config.authServer)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
}

export async function getDocuSignAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAtMs > Date.now()) {
    return tokenCache.accessToken;
  }

  const config = getDocuSignConfig();
  const assertion = await getJwtAssertion(config);

  const tokenUrl = `https://${config.authServer}/oauth/token`;
  const body = new URLSearchParams();
  body.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  body.set('assertion', assertion);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const message = json?.error_description ?? json?.error ?? 'DocuSign token request failed';
    throw new Error(message);
  }

  const accessToken = json?.access_token as string | undefined;
  const expiresIn = Number(json?.expires_in ?? 3600);
  if (!accessToken) {
    throw new Error('DocuSign did not return access_token');
  }

  tokenCache = {
    accessToken,
    // Subtract 60s as a safety buffer.
    expiresAtMs: Date.now() + Math.max(0, expiresIn - 60) * 1000,
  };

  return accessToken;
}

export async function docusignFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const config = getDocuSignConfig();
  const token = await getDocuSignAccessToken();

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${config.baseUri}/restapi/v2.1/accounts/${config.accountId}${normalizedPath}`;

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...init, headers });
}
