import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { docusignFetch } from '../_shared/docusign.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const res = await docusignFetch('/templates?count=100&order_by=modified&order=desc', {
      method: 'GET',
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      return new Response(JSON.stringify({ error: json }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const templates = (json?.envelopeTemplates as any[] | undefined) ?? [];

    return new Response(
      JSON.stringify({
        templates: templates.map((t) => ({
          templateId: t?.templateId ?? t?.template_id ?? t?.id,
          name: t?.name ?? 'Untitled template',
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
