# Test Documents

This folder contains sample documents for testing the PDF extraction service.

## Sample Documents

You can use the Purchase Order PDF provided in the conversation to test the extraction service.

To test:

1. Save a PDF file to this folder (e.g., `sample-po.pdf`)
2. Run the test script:
   ```bash
   cd api
   node test-extraction.js ../test-documents/sample-po.pdf
   ```

## Expected Results

For a well-formatted Purchase Order, you should see:
- Confidence scores above 80% for most fields
- Extracted PO number, amount, dates
- Client and supplier information
- Line items (if present in document)

## Adding More Test Documents

You can add various document types to test:
- Purchase Orders (.pdf)
- Invoices (.pdf)
- Statements of Work (.pdf)
- Contracts (.pdf)

The extraction service works best with:
- Clear, high-resolution PDFs
- Standard business document layouts
- Text-based PDFs (not scanned images)
