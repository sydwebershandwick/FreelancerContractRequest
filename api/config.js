const { app } = require('@azure/functions');

app.http('config', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const origin = request.headers.get('origin') || '';
        const url = new URL(request.url);
        const spKey = url.searchParams.get('spkey');
        
        // Define valid SharePoint keys (you can have multiple for different environments)
        const validSharePointKeys = process.env.SHAREPOINT_KEYS ? 
            process.env.SHAREPOINT_KEYS.split(',') : 
            ['sharepoint-2024-secure'];
        
        // Validate the SharePoint key
        if (!spKey || !validSharePointKeys.includes(spKey)) {
            context.log('Invalid or missing SharePoint key:', spKey);
            return {
                status: 403,
                headers: {
                    'Access-Control-Allow-Origin': origin || '*',
                    'Content-Type': 'application/json'
                },
                jsonBody: { error: 'Invalid authorization key' }
            };
        }
        
        // Only provide real token if SharePoint key is valid
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': origin || '*',
                'Content-Type': 'application/json'
            },
            jsonBody: {
                authToken: process.env.FORM_AUTH_TOKEN || ''
            }
        };
    }
});