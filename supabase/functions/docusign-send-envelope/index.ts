import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { docusignFetch } from '../_shared/docusign.ts';

async function resolveRoleName(templateId: string, providedRoleName?: string) {
  const trimmed = (providedRoleName ?? '').trim();
  if (trimmed) return trimmed;

  const rolesRes = await docusignFetch(`/templates/${encodeURIComponent(templateId)}/recipients`, {
    method: 'GET',
  });

  const rolesJson = (await rolesRes.json().catch(() => ({}))) as any;
  if (!rolesRes.ok) {
    throw new Error(rolesJson?.message ?? 'Could not fetch template recipients');
  }

  const signers = (rolesJson?.signers as any[] | undefined) ?? [];
  const firstRoleName = String(signers?.[0]?.roleName ?? '').trim();
  if (!firstRoleName) {
    throw new Error('Could not determine a signer roleName from the template');
  }

  return firstRoleName;
}
async function loadDocument(body: any) {
  const documentUrl = String(body?.documentUrl ?? '').trim();
  const documentPath = String(body?.documentPath ?? './service-agreement.pdf').trim();
  const documentName = String(body?.documentName ?? 'Service Agreement').trim() || 'Service Agreement';
  const fileExtension = String(body?.fileExtension ?? 'pdf').trim() || 'pdf';

  let bytes: Uint8Array | null = null;

  if (documentUrl) {
    const res = await fetch(documentUrl);
    if (!res.ok) {
      throw new Error(`Could not fetch documentUrl (${res.status})`);
    }
    const ab = await res.arrayBuffer();
    bytes = new Uint8Array(ab);
  } else {
    try {
      bytes = await Deno.readFile(documentPath);
    } catch (e) {
      throw new Error(`Document not found at ${documentPath}: ${(e as Error).message}`);
    }
  }

  const documentBase64 = encodeBase64(bytes);

  return { documentBase64, documentName, fileExtension };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const templateId = String(body?.templateId ?? '').trim();
    const recipientEmail = String(body?.recipientEmail ?? '').trim();
    const recipientName = String(body?.recipientName ?? '').trim();
    const roleName = String(body?.roleName ?? '').trim();
    const emailSubject = String(body?.emailSubject ?? '').trim();
    const useDocument = Boolean(body?.useDocument);
    const anchorString = String(body?.anchorString ?? '').trim();
    const anchorXOffset = Number(body?.anchorXOffset ?? 0);
    const anchorYOffset = Number(body?.anchorYOffset ?? 0);

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'recipientEmail is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!recipientName) {
      return new Response(JSON.stringify({ error: 'recipientName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fallbackTemplate = (Deno.env.get('DOCUSIGN_DEFAULT_TEMPLATE_ID') ?? '').trim();
    const shouldUseTemplate = !useDocument && (templateId || fallbackTemplate);

    if (shouldUseTemplate) {
      let resolvedTemplateId: string;
      try {
        resolvedTemplateId = (() => {
          if (templateId) return templateId;
          if (fallbackTemplate) return fallbackTemplate;
          throw new Error('templateId is required and DOCUSIGN_DEFAULT_TEMPLATE_ID is not set');
        })();
      } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const resolvedRoleName = await resolveRoleName(resolvedTemplateId, roleName);

      const envelopePayload: Record<string, unknown> = {
        templateId: resolvedTemplateId,
        templateRoles: [
          {
            email: recipientEmail,
            name: recipientName,
            roleName: resolvedRoleName,
          },
        ],
        status: 'sent',
      };

      if (emailSubject) {
        envelopePayload.emailSubject = emailSubject;
      }

      const res = await docusignFetch('/envelopes', {
        method: 'POST',
        body: JSON.stringify(envelopePayload),
      });

      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        return new Response(JSON.stringify({ error: json }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          envelopeId: json?.envelopeId,
          status: json?.status,
          uri: json?.uri,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Document-based envelope (no template)
    const { documentBase64, documentName, fileExtension } = await loadDocument(body);

    const envelopePayload: Record<string, unknown> = {
      emailSubject: emailSubject || `GRIP Service Agreement for ${recipientName || 'your agency'}`,
      documents: [
        {
          documentBase64,
          name: documentName,
          fileExtension,
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: recipientEmail,
            name: recipientName,
            recipientId: '1',
            tabs: anchorString
              ? {
                  signHereTabs: [
                    {
                      anchorString,
                      anchorUnits: 'pixels',
                      anchorXOffset,
                      anchorYOffset,
                    },
                  ],
                }
              : undefined,
          },
        ],
      },
      status: 'sent',
    };

    const res = await docusignFetch('/envelopes', {
      method: 'POST',
      body: JSON.stringify(envelopePayload),
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      return new Response(JSON.stringify({ error: json }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        envelopeId: json?.envelopeId,
        status: json?.status,
        uri: json?.uri,
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
