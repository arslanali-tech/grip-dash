import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { docusignFetch } from '../_shared/docusign.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const templateId = String(body?.templateId ?? '').trim();

    if (!templateId) {
      return new Response(JSON.stringify({ error: 'templateId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await docusignFetch(`/templates/${encodeURIComponent(templateId)}/recipients`, {
      method: 'GET',
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      return new Response(JSON.stringify({ error: json }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signers = (json?.signers as any[] | undefined) ?? [];

    return new Response(
      JSON.stringify({
        roles: signers.map((s) => ({
          roleName: s?.roleName,
          recipientId: s?.recipientId,
          routingOrder: s?.routingOrder,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
