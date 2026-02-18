const { app } = require('@azure/functions');

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            jsonBody: {
                status: 'healthy',
                nodeVersion: process.version,
                timestamp: new Date().toISOString()
            }
        };
    }
});