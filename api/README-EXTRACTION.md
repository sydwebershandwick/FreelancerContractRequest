# PDF Extraction Service

This Azure Function uses Azure Form Recognizer to automatically extract data from Purchase Orders and other financial documents.

## Setup

### 1. Create Azure Form Recognizer Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Form Recognizer** (or **Azure AI Document Intelligence**) resource
3. Choose your subscription, resource group, and region (recommend: Australia Southeast)
4. Select pricing tier (F0 for free tier or S0 for production)
5. Once deployed, go to **Keys and Endpoint** section
6. Copy the **Endpoint** and **Key 1**

### 2. Configure Environment Variables

Add these to your Azure Static Web App configuration or local.settings.json:

```json
{
  "FORM_RECOGNIZER_ENDPOINT": "https://your-resource-name.cognitiveservices.azure.com/",
  "FORM_RECOGNIZER_KEY": "your_api_key_here"
}
```

### 3. Install Dependencies

```bash
cd api
npm install
```

## API Endpoint

### POST /api/extract-document

Extracts structured data from a PDF document using Azure Form Recognizer.

**Request Headers:**
- `Content-Type: application/json`
- `X-Form-Token: <your-auth-token>`

**Request Body:**
```json
{
  "documentType": "Purchase Order",
  "documentFileContent": "base64_encoded_pdf_content_here"
}
```

**Response:**
```json
{
  "success": true,
  "confidence": 0.92,
  "extractedData": {
    "documentType": "Purchase Order",
    "purchaseOrderNumber": {
      "value": "4503605212",
      "confidence": 0.98
    },
    "amount": {
      "value": 28296.00,
      "confidence": 0.95
    },
    "clientName": {
      "value": "Reckitt Benckiser (Australia) PTY LTD",
      "confidence": 0.96
    },
    "date": {
      "value": "2025-07-14",
      "confidence": 0.93
    },
    "currency": {
      "value": "AUD",
      "confidence": 0.90
    },
    "supplierName": {
      "value": "Lansky Enterprises Pty Ltd",
      "confidence": 0.94
    },
    "supplierAddress": {
      "value": "822 Level 7, George St, Chippendale, SYDNEY NSW 2008",
      "confidence": 0.89
    },
    "abn": {
      "value": "17003274655",
      "confidence": 0.91
    },
    "lineItems": [
      {
        "description": "AU 2025 SMP PR",
        "amount": 28296.00,
        "quantity": 28296,
        "confidence": 0.87
      }
    ]
  }
}
```

## Supported Document Types

The service uses Azure Form Recognizer's **prebuilt-invoice** model, which works well for:

- Purchase Orders
- Invoices
- Statements of Work
- Contracts with pricing information
- Letters of Intent
- Email confirmations with financial details

## Confidence Scores

Each extracted field includes a confidence score (0-1):
- **0.9+**: Very high confidence, likely accurate
- **0.8-0.9**: High confidence, review recommended
- **0.7-0.8**: Medium confidence, verify data
- **<0.7**: Low confidence, manual entry recommended

## Error Handling

**400 Bad Request:**
- Missing required fields
- Invalid JSON

**403 Forbidden:**
- Invalid or missing auth token

**500 Internal Server Error:**
- Form Recognizer configuration error
- Document analysis failed

## Testing Locally

1. Create `api/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FORM_RECOGNIZER_ENDPOINT": "your_endpoint",
    "FORM_RECOGNIZER_KEY": "your_key",
    "FORM_AUTH_TOKEN": "1f34ab3575caa4e2e5e749209be888e8c656db9adac4e5f85bf646866806bb9e"
  }
}
```

2. Run Azure Functions locally:
```bash
cd api
npm install
func start
```

3. Test the endpoint:
```bash
curl -X POST http://localhost:7071/api/extract-document \
  -H "Content-Type: application/json" \
  -H "X-Form-Token: 1f34ab3575caa4e2e5e749209be888e8c656db9adac4e5f85bf646866806bb9e" \
  -d '{"documentType": "Purchase Order", "documentFileContent": "base64_content"}'
```

## Integration with DocumentForm

The extracted data is designed to auto-populate the DocumentForm fields:

| Extracted Field | Form Field |
|----------------|------------|
| `purchaseOrderNumber.value` | Purchase Order Number |
| `amount.value` | Purchase Order Amount |
| `clientName.value` | Client |
| `currency.value` | Currency |
| `date.value` | Document Date |
| `lineItems[].description` | Invoice Schedule Description |
| `lineItems[].amount` | Invoice Schedule Amount |

## Performance

- Average processing time: 3-8 seconds per document
- Supports documents up to 500 pages
- Maximum file size: 500 MB
- Concurrent requests: Limited by Form Recognizer quota

## Cost Considerations

Azure Form Recognizer pricing (as of 2025):
- **Free Tier (F0):** 500 pages/month free
- **Standard (S0):** $1.50 per 1,000 pages analyzed

For production use, monitor usage in Azure Portal Cost Management.

## Troubleshooting

### "Form Recognizer not configured" error
- Verify environment variables are set correctly
- Check endpoint URL format (should end with `/`)
- Ensure API key is valid

### Low confidence scores
- Ensure PDF quality is good (not scanned/blurry)
- Check document is in supported format
- Verify document follows standard invoice/PO layout

### Timeout errors
- Large documents may take longer to process
- Consider implementing progress polling for large files
- Check Form Recognizer service health in Azure Portal