const { app } = require('@azure/functions');

app.http('submit', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer, X-Form-Token'
                }
            };
        }

        try {
            // Enhanced security validation
            const origin = request.headers.get('origin') || '';
            const referer = request.headers.get('referer') || '';
            const userAgent = request.headers.get('user-agent') || '';
            const authToken = request.headers.get('x-form-token') || '';
            
            // 1. Validate auth token
            const expectedToken = process.env.FORM_AUTH_TOKEN;
            
            if (!expectedToken) {
                context.log('ERROR: FORM_AUTH_TOKEN environment variable not set');
                return {
                    status: 500,
                    headers: {
                        'Access-Control-Allow-Origin': origin,
                        'Content-Type': 'application/json'
                    },
                    jsonBody: { error: 'Server configuration error' }
                };
            }

            if (authToken !== expectedToken) {
                context.log('Blocked request - invalid auth token');
                return {
                    status: 403,
                    headers: {
                        'Access-Control-Allow-Origin': origin,
                        'Content-Type': 'application/json'
                    },
                    jsonBody: { error: 'Authentication required' }
                };
            }

            // 2. Log request details for debugging
            context.log('Request details:', {
                origin,
                referer,
                userAgent,
                hasToken: !!authToken
            });

            // Since browsers don't send parent page URL as referer from iframes,
            // we rely on the auth token as the primary security mechanism
            // The token ensures only authorized forms can submit

            // Get request body
            const requestBody = await request.text();
            let formData;
            
            try {
                formData = JSON.parse(requestBody);
            } catch (parseError) {
                context.log('Invalid JSON in request body:', parseError);
                return {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': origin,
                        'Content-Type': 'application/json'
                    },
                    jsonBody: { error: 'Invalid JSON in request body' }
                };
            }

            // Power Automate URL (stored securely server-side)
            const powerAutomateUrl = process.env.POWER_AUTOMATE_URL || 
                'https://prod-62.australiasoutheast.logic.azure.com/workflows/0b470fb6b12c4059884ab7d34dd4f52c/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=eOA9cZO2NMiXdlxUhGAVKKEeVfQNCfZjwIBOEOZDZZU';

            // Forward request to Power Automate
            context.log('Forwarding request to Power Automate...');
            
            const powerAutomateResponse = await fetch(powerAutomateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody
            });

            const responseData = await powerAutomateResponse.text();
            let jsonResponse;
            
            try {
                jsonResponse = JSON.parse(responseData);
            } catch (parseError) {
                jsonResponse = { message: responseData };
            }

            context.log('Power Automate response status:', powerAutomateResponse.status);

            return {
                status: powerAutomateResponse.status,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Content-Type': 'application/json'
                },
                jsonBody: jsonResponse
            };

        } catch (error) {
            context.log('Error processing request:', error);
            
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
                    'Content-Type': 'application/json'
                },
                jsonBody: { 
                    error: 'Internal server error',
                    message: error.message 
                }
            };
        }
    }
});