# PDF Extraction Service - Summary

## What Was Built

A complete Azure Form Recognizer integration for automatically extracting data from Purchase Orders, invoices, and other financial documents.

## Files Created

### Azure Function (Backend)
- **[api/extract-document.js](api/extract-document.js)** - Main extraction endpoint
  - Accepts PDF files (as base64)
  - Uses Azure Form Recognizer to extract structured data
  - Returns field values with confidence scores
  - Supports Purchase Orders, Invoices, SOWs, Contracts, etc.

### Configuration
- **[api/package.json](api/package.json)** - Updated with `@azure/ai-form-recognizer` dependency
- **[api/.env.example](api/.env.example)** - Environment variable template

### Documentation
- **[SETUP-EXTRACTION.md](SETUP-EXTRACTION.md)** - Complete setup guide
- **[api/README-EXTRACTION.md](api/README-EXTRACTION.md)** - API documentation
- **[test-documents/README.md](test-documents/README.md)** - Testing guide

### Testing
- **[api/test-extraction.js](api/test-extraction.js)** - Test script for verifying extraction

## How It Works

```
1. User uploads PDF to form
   ↓
2. Frontend sends base64-encoded PDF to /api/extract-document
   ↓
3. Azure Function receives request
   ↓
4. Form Recognizer analyzes document (prebuilt-invoice model)
   ↓
5. Extract structured fields:
   - PO Number, Amount, Date
   - Client name, Supplier info
   - Currency, ABN/Tax ID
   - Line items
   ↓
6. Return JSON with extracted data + confidence scores
   ↓
7. Frontend auto-populates form fields
```

## API Endpoint

**POST** `/api/extract-document`

**Request:**
```json
{
  "documentType": "Purchase Order",
  "documentFileContent": "base64_pdf_content"
}
```

**Response:**
```json
{
  "success": true,
  "confidence": 0.92,
  "extractedData": {
    "purchaseOrderNumber": { "value": "4503605212", "confidence": 0.98 },
    "amount": { "value": 28296.00, "confidence": 0.95 },
    "clientName": { "value": "Reckitt Benckiser (Australia) PTY LTD", "confidence": 0.96 },
    "currency": { "value": "AUD", "confidence": 0.90 },
    "date": { "value": "2025-07-14", "confidence": 0.93 }
  }
}
```

## Next Steps

### 1. Setup Azure Form Recognizer (Required)
Follow [SETUP-EXTRACTION.md](SETUP-EXTRACTION.md):
- Create Form Recognizer resource in Azure
- Copy endpoint and API key
- Configure environment variables in Static Web App
- Deploy updated code

### 2. Integrate with DocumentForm (Frontend)
Modify [src/components/DocumentForm.jsx](src/components/DocumentForm.jsx):

```javascript
// Add state for extraction status
const [isExtracting, setIsExtracting] = useState(false);
const [extractedData, setExtractedData] = useState(null);

// When file is uploaded
const handleFileChange = async (e) => {
  const file = e.target.files[0];
  setFormData(prev => ({ ...prev, purchaseOrderFile: file }));

  // Trigger extraction
  await extractDocumentData(file);
};

// Extract data from PDF
const extractDocumentData = async (file) => {
  setIsExtracting(true);

  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);

    // Call extraction API
    const response = await fetch('/api/extract-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Form-Token': authToken
      },
      body: JSON.stringify({
        documentType: formData.persuasiveEvidence,
        documentFileContent: base64
      })
    });

    const result = await response.json();

    if (result.success) {
      // Auto-populate form fields
      setFormData(prev => ({
        ...prev,
        purchaseOrderNumber: result.extractedData.purchaseOrderNumber?.value || '',
        purchaseOrderAmount: result.extractedData.amount?.value || '',
        client: result.extractedData.clientName?.value || '',
        currency: result.extractedData.currency?.value || 'AUD'
      }));

      setExtractedData(result.extractedData);
    }
  } catch (error) {
    console.error('Extraction failed:', error);
  } finally {
    setIsExtracting(false);
  }
};
```

### 3. Add User Feedback (UX Enhancement)
```javascript
// Show processing state
{isExtracting && (
  <div className="extraction-status">
    <span className="spinner"></span>
    Processing document... This may take a few seconds.
  </div>
)}

// Show success with confidence indicator
{extractedData && (
  <div className="extraction-success">
    ✓ Document processed!
    Confidence: {(extractedData.confidence * 100).toFixed(0)}%
    <br />
    Please review extracted data below.
  </div>
)}
```

### 4. Optional: SharePoint Integration
After extraction, save to SharePoint list for review workflow:
- Create SharePoint list with extracted fields
- Power Automate flow to monitor list
- User reviews in form, then approves
- Final submission updates SharePoint item

## Benefits

✅ **Saves Time**: Auto-fill forms instead of manual data entry
✅ **Reduces Errors**: OCR more accurate than manual typing
✅ **User Control**: Users review and correct before submission
✅ **Audit Trail**: Confidence scores show data quality
✅ **Scalable**: Handles various document types (PO, Invoice, SOW, etc.)

## Testing

### Local Testing
```bash
# 1. Start Azure Functions locally
cd api
npm install
func start

# 2. Test with sample PDF
node test-extraction.js ../test-documents/sample-po.pdf
```

### Production Testing
```bash
# Set your production endpoint
export API_ENDPOINT=https://your-app.azurestaticapps.net/api/extract-document

# Run test
node api/test-extraction.js test-documents/sample-po.pdf
```

## Cost Estimate

**Azure Form Recognizer Pricing:**
- **Free Tier**: 500 pages/month (good for testing and low volume)
- **Standard**: $1.50 per 1,000 pages analyzed

**Example Monthly Costs:**
- 100 POs/month = **Free** (under 500 pages)
- 1,000 POs/month = ~**$1.50/month**
- 10,000 POs/month = ~**$15/month**

Very affordable for most use cases!

## Troubleshooting

See [SETUP-EXTRACTION.md](SETUP-EXTRACTION.md#troubleshooting) for common issues and solutions.

## Support Resources

- **Azure Form Recognizer Docs**: https://learn.microsoft.com/azure/ai-services/document-intelligence/
- **Prebuilt Invoice Model**: https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-invoice
- **API Reference**: https://learn.microsoft.com/javascript/api/@azure/ai-form-recognizer/

---

**Ready to use!** Follow the setup guide to get started.