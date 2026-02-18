/**
 * Test script for PDF extraction service
 *
 * Usage:
 *   node test-extraction.js <path-to-pdf>
 *
 * Example:
 *   node test-extraction.js ../test-documents/sample-po.pdf
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:7071/api/extract-document';
const AUTH_TOKEN = process.env.FORM_AUTH_TOKEN || '1f34ab3575caa4e2e5e749209be888e8c656db9adac4e5f85bf646866806bb9e';

async function testExtraction(pdfPath) {
    console.log('='.repeat(60));
    console.log('PDF Extraction Test');
    console.log('='.repeat(60));
    console.log(`PDF File: ${pdfPath}`);
    console.log(`API Endpoint: ${API_ENDPOINT}`);
    console.log('');

    // Read PDF file
    if (!fs.existsSync(pdfPath)) {
        console.error(`Error: File not found: ${pdfPath}`);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(pdfPath);
    const base64Content = fileBuffer.toString('base64');
    const fileSizeKB = (fileBuffer.length / 1024).toFixed(2);

    console.log(`File size: ${fileSizeKB} KB`);
    console.log(`Base64 encoded size: ${(base64Content.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Prepare request
    const payload = {
        documentType: 'Purchase Order',
        documentFileContent: base64Content
    };

    console.log('Sending request to extraction service...');
    const startTime = Date.now();

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Form-Token': AUTH_TOKEN
            },
            body: JSON.stringify(payload)
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`Response status: ${response.status} ${response.statusText}`);
        console.log(`Processing time: ${duration} seconds`);
        console.log('');

        const result = await response.json();

        if (response.ok) {
            console.log('✓ Extraction successful!');
            console.log('');
            displayResults(result);
        } else {
            console.error('✗ Extraction failed');
            console.error('Error:', result.error || result.message);
        }

    } catch (error) {
        console.error('✗ Request failed');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

function displayResults(result) {
    console.log('='.repeat(60));
    console.log('EXTRACTION RESULTS');
    console.log('='.repeat(60));
    console.log(`Overall Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('');

    const data = result.extractedData;

    // Display extracted fields
    console.log('Extracted Fields:');
    console.log('-'.repeat(60));

    displayField('Document Type', data.documentType);
    displayField('PO Number', data.purchaseOrderNumber);
    displayField('Amount', data.amount, (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    displayField('Client Name', data.clientName);
    displayField('Date', data.date);
    displayField('Currency', data.currency);
    displayField('Supplier Name', data.supplierName);
    displayField('Supplier Address', data.supplierAddress);
    displayField('ABN', data.abn);

    // Display line items if available
    if (data.lineItems && data.lineItems.length > 0) {
        console.log('');
        console.log('Line Items:');
        console.log('-'.repeat(60));

        data.lineItems.forEach((item, index) => {
            console.log(`  Item ${index + 1}:`);
            console.log(`    Description: ${item.description}`);
            console.log(`    Quantity: ${item.quantity}`);
            console.log(`    Amount: $${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            console.log(`    Confidence: ${(item.confidence * 100).toFixed(1)}%`);
            console.log('');
        });
    }

    console.log('='.repeat(60));
    console.log('');

    // Generate summary
    const confidenceLevel = result.confidence >= 0.9 ? 'High' :
                           result.confidence >= 0.7 ? 'Medium' : 'Low';
    const recommendation = result.confidence >= 0.9 ? 'Data appears accurate, minimal review needed' :
                          result.confidence >= 0.7 ? 'Review extracted data before use' :
                          'Low confidence - manual entry recommended';

    console.log('Summary:');
    console.log(`  Confidence Level: ${confidenceLevel}`);
    console.log(`  Recommendation: ${recommendation}`);
    console.log('');

    // List fields that need review (confidence < 0.8)
    const lowConfidenceFields = [];
    for (const key in data) {
        if (data[key]?.confidence !== undefined && data[key].confidence < 0.8) {
            lowConfidenceFields.push({
                field: key,
                confidence: (data[key].confidence * 100).toFixed(1)
            });
        }
    }

    if (lowConfidenceFields.length > 0) {
        console.log('Fields requiring review (confidence < 80%):');
        lowConfidenceFields.forEach(field => {
            console.log(`  - ${formatFieldName(field.field)}: ${field.confidence}%`);
        });
        console.log('');
    }

    // Generate form-ready JSON
    console.log('Form-Ready Data (for auto-population):');
    console.log('-'.repeat(60));
    const formData = {
        purchaseOrderNumber: data.purchaseOrderNumber?.value || '',
        purchaseOrderAmount: data.amount?.value || 0,
        client: data.clientName?.value || '',
        currency: data.currency?.value || 'AUD',
        // Map first line item to invoice schedule if available
        invoiceSchedule: data.lineItems ? data.lineItems.map(item => ({
            description: item.description,
            amount: item.amount,
            date: data.date?.value || ''
        })) : []
    };
    console.log(JSON.stringify(formData, null, 2));
    console.log('');
}

function displayField(label, fieldData, formatter = null) {
    if (!fieldData) {
        console.log(`  ${label.padEnd(20)}: (not found)`);
        return;
    }

    if (typeof fieldData === 'string') {
        console.log(`  ${label.padEnd(20)}: ${fieldData}`);
        return;
    }

    const value = formatter ? formatter(fieldData.value) : fieldData.value;
    const confidence = (fieldData.confidence * 100).toFixed(1);
    const confidenceIndicator = fieldData.confidence >= 0.9 ? '✓' :
                                fieldData.confidence >= 0.7 ? '○' : '⚠';

    console.log(`  ${label.padEnd(20)}: ${value}`);
    console.log(`  ${' '.repeat(20)}  ${confidenceIndicator} Confidence: ${confidence}%`);
}

function formatFieldName(fieldName) {
    return fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage: node test-extraction.js <path-to-pdf>');
    console.log('');
    console.log('Example:');
    console.log('  node test-extraction.js ../test-documents/sample-po.pdf');
    console.log('');
    console.log('Environment variables:');
    console.log('  API_ENDPOINT    - Extraction API endpoint (default: http://localhost:7071/api/extract-document)');
    console.log('  FORM_AUTH_TOKEN - Authentication token');
    process.exit(1);
}

const pdfPath = path.resolve(args[0]);
testExtraction(pdfPath);