const { app } = require('@azure/functions');
const https = require('https');

// Map ABR entity type codes to form company types
const ENTITY_TYPE_MAP = {
  'IND': 'Sole Trader',   // Individual/Sole Trader
  'PRV': 'Company',       // Australian Private Company
  'PUB': 'Company',       // Australian Public Company
  'PTR': 'Company',       // Partnership
  'TRT': 'Company',       // Trust
  'OTH': 'Company',       // Other
};

function extractXmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
  return match ? match[1].trim() : '';
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

app.http('abn-lookup', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const origin = request.headers.get('origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Form-Token',
    };

    if (request.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }

    // Validate auth token
    const authToken = request.headers.get('x-form-token');
    const expectedToken = process.env.FORM_AUTH_TOKEN;
    if (expectedToken && authToken !== expectedToken) {
      return { status: 403, headers: corsHeaders, jsonBody: { error: 'Forbidden' } };
    }

    // Check ABR GUID is configured
    const abrGuid = process.env.ABR_GUID;
    if (!abrGuid) {
      context.log('ABR_GUID environment variable not configured');
      return {
        status: 503,
        headers: corsHeaders,
        jsonBody: { error: 'ABR_GUID not configured' }
      };
    }

    // Get and validate ABN from query string
    const url = new URL(request.url);
    const rawAbn = url.searchParams.get('abn') || '';
    const abn = rawAbn.replace(/\s/g, '');

    if (!/^\d{11}$/.test(abn)) {
      return {
        status: 400,
        headers: corsHeaders,
        jsonBody: { error: 'ABN must be 11 digits' }
      };
    }

    try {
      const abrUrl = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv202001?searchString=${abn}&includeHistoricalDetails=N&authenticationGuid=${abrGuid}`;
      context.log(`Looking up ABN: ${abn}`);
      const xml = await fetchUrl(abrUrl);

      // Check for exception/error in response
      const exceptionDesc = extractXmlTag(xml, 'exceptionDescription');
      if (exceptionDesc) {
        context.log(`ABR returned exception: ${exceptionDesc}`);
        return {
          status: 404,
          headers: corsHeaders,
          jsonBody: { error: exceptionDesc }
        };
      }

      // Check ABN is current
      const isCurrentIndicator = extractXmlTag(xml, 'isCurrentIndicator');
      const abnStatus = isCurrentIndicator === 'Y' ? 'Active' : 'Cancelled';

      // Extract entity type
      const entityTypeCode = extractXmlTag(xml, 'entityTypeCode');
      const entityTypeDescription = extractXmlTag(xml, 'entityDescription');
      const companyType = ENTITY_TYPE_MAP[entityTypeCode] || 'Company';

      // Extract entity name — companies use organisationName, sole traders use givenName/familyName
      let entityName = '';
      if (entityTypeCode === 'IND') {
        const givenName = extractXmlTag(xml, 'givenName');
        const familyName = extractXmlTag(xml, 'familyName');
        entityName = [givenName, familyName].filter(Boolean).join(' ');
      } else {
        // Try main name first, fall back to trading name
        const orgNameMatch = xml.match(/<mainName[^>]*>[\s\S]*?<organisationName>([^<]+)<\/organisationName>/);
        entityName = orgNameMatch ? orgNameMatch[1].trim() : extractXmlTag(xml, 'organisationName');
      }

      // GST registration
      const gstMatch = xml.match(/<goodsAndServicesTax[^>]*>[\s\S]*?<isCurrentIndicator>([^<]+)<\/isCurrentIndicator>/);
      const gstRegistered = gstMatch ? gstMatch[1].trim() === 'Y' : false;

      context.log(`ABN ${abn}: ${entityName} (${entityTypeDescription}) — ${abnStatus}`);

      return {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        jsonBody: {
          entityName,
          companyType,
          entityTypeDescription,
          abnStatus,
          gstRegistered,
        }
      };
    } catch (error) {
      context.log('ABN lookup error:', error.message);
      return {
        status: 502,
        headers: corsHeaders,
        jsonBody: { error: 'Failed to reach ABR service' }
      };
    }
  }
});
