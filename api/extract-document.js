const { app } = require('@azure/functions');
const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');

app.http('extract-document', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Document extraction request for url "${request.url}"`);

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
            const origin = request.headers.get('origin') || '';
            const authToken = request.headers.get('x-form-token') || '';

            // Validate auth token
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

            // Get Azure Form Recognizer credentials
            const endpoint = process.env.FORM_RECOGNIZER_ENDPOINT;
            const apiKey = process.env.FORM_RECOGNIZER_KEY;

            if (!endpoint || !apiKey) {
                context.log('ERROR: Form Recognizer credentials not configured');
                return {
                    status: 500,
                    headers: {
                        'Access-Control-Allow-Origin': origin,
                        'Content-Type': 'application/json'
                    },
                    jsonBody: { error: 'Form Recognizer not configured' }
                };
            }

            // Get request body
            const requestBody = await request.text();
            let requestData;

            try {
                requestData = JSON.parse(requestBody);
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

            // Validate required fields
            if (!requestData.documentFileContent || !requestData.documentType) {
                return {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': origin,
                        'Content-Type': 'application/json'
                    },
                    jsonBody: { error: 'documentFileContent and documentType are required' }
                };
            }

            // Convert base64 to buffer
            const documentBuffer = Buffer.from(requestData.documentFileContent, 'base64');

            context.log(`Processing ${requestData.documentType} document, size: ${documentBuffer.length} bytes`);

            // Initialize Form Recognizer client
            const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

            // Analyze document using prebuilt invoice model (good for POs, invoices, etc.)
            context.log('Starting document analysis with Form Recognizer...');
            const poller = await client.beginAnalyzeDocument('prebuilt-invoice', documentBuffer);
            const result = await poller.pollUntilDone();

            context.log('Document analysis complete');

            // Extract relevant fields based on document type
            const extractedData = extractFields(result, requestData.documentType, context);

            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    extractedData,
                    confidence: calculateAverageConfidence(extractedData)
                }
            };

        } catch (error) {
            context.log('Error processing document:', error);

            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    error: 'Failed to extract document data',
                    message: error.message
                }
            };
        }
    }
});

/**
 * Extract fields from Form Recognizer result
 */
function extractFields(result, documentType, context) {
    const extractedData = {
        documentType: documentType
    };

    if (!result.documents || result.documents.length === 0) {
        context.log('No documents found in analysis result');
        return extractedData;
    }

    const document = result.documents[0];
    const fields = document.fields;

    context.log('Extracting fields from document...');

    // Common fields for all document types
    if (fields.InvoiceId || fields.PurchaseOrder) {
        extractedData.purchaseOrderNumber = {
            value: (fields.InvoiceId?.content || fields.PurchaseOrder?.content || '').trim(),
            confidence: fields.InvoiceId?.confidence || fields.PurchaseOrder?.confidence || 0
        };
    }

    if (fields.InvoiceTotal || fields.AmountDue || fields.InvoiceTotal) {
        const totalField = fields.InvoiceTotal || fields.AmountDue || fields.TotalAmount;
        extractedData.amount = {
            value: totalField?.valueAmount?.amount || totalField?.content || 0,
            confidence: totalField?.confidence || 0
        };
    }

    if (fields.VendorName || fields.CustomerName) {
        const vendorField = fields.VendorName || fields.CustomerName;
        extractedData.clientName = {
            value: (vendorField?.content || '').trim(),
            confidence: vendorField?.confidence || 0
        };
    }

    if (fields.InvoiceDate || fields.InvoiceDate) {
        const dateField = fields.InvoiceDate || fields.DueDate;
        extractedData.date = {
            value: dateField?.valueDate || dateField?.content || '',
            confidence: dateField?.confidence || 0
        };
    }

    // Extract currency from CurrencyCode or detect from content
    if (fields.CurrencyCode) {
        extractedData.currency = {
            value: fields.CurrencyCode.content || 'AUD',
            confidence: fields.CurrencyCode.confidence || 0
        };
    } else {
        // Try to detect currency from amount fields
        const amountField = fields.InvoiceTotal || fields.AmountDue;
        if (amountField?.valueAmount?.currencyCode) {
            extractedData.currency = {
                value: amountField.valueAmount.currencyCode,
                confidence: 0.9
            };
        } else {
            // Default to AUD with low confidence
            extractedData.currency = {
                value: 'AUD',
                confidence: 0.3
            };
        }
    }

    // Extract supplier/vendor information
    if (fields.VendorName) {
        extractedData.supplierName = {
            value: (fields.VendorName.content || '').trim(),
            confidence: fields.VendorName.confidence || 0
        };
    }

    if (fields.VendorAddress) {
        extractedData.supplierAddress = {
            value: (fields.VendorAddress.content || '').trim(),
            confidence: fields.VendorAddress.confidence || 0
        };
    }

    // Extract ABN/Tax ID if available
    if (fields.VendorTaxId || fields.TaxId) {
        const taxField = fields.VendorTaxId || fields.TaxId;
        extractedData.abn = {
            value: (taxField.content || '').replace(/\s/g, ''),
            confidence: taxField.confidence || 0
        };
    }

    // Extract line items for potential invoice schedule
    if (fields.Items) {
        const items = [];
        for (const item of fields.Items.values || []) {
            const itemFields = item.properties || {};
            items.push({
                description: itemFields.Description?.content || '',
                amount: itemFields.Amount?.valueAmount?.amount || itemFields.Amount?.content || 0,
                quantity: itemFields.Quantity?.valueNumber || itemFields.Quantity?.content || 1,
                confidence: itemFields.Description?.confidence || 0
            });
        }
        extractedData.lineItems = items;
    }

    context.log(`Extracted ${Object.keys(extractedData).length} fields`);

    return extractedData;
}

/**
 * Calculate average confidence score
 */
function calculateAverageConfidence(extractedData) {
    const confidenceScores = [];

    for (const key in extractedData) {
        if (extractedData[key]?.confidence !== undefined) {
            confidenceScores.push(extractedData[key].confidence);
        }
    }

    if (confidenceScores.length === 0) return 0;

    const average = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    return Math.round(average * 100) / 100; // Round to 2 decimal places
}