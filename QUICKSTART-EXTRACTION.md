# Quick Start - PDF Extraction Service

Get your PDF extraction service running in 10 minutes!

**Production URL**: https://nice-sea-0988e6c00.1.azurestaticapps.net

## Prerequisites Checklist

- [ ] Azure subscription
- [ ] Azure Static Web App deployed
- [ ] Node.js 18+ installed

## Setup Steps

### 1. Create Azure Form Recognizer (3 minutes)

```bash
# Option A: Azure Portal (Recommended for first time)
# 1. Go to https://portal.azure.com
# 2. Click "+ Create a resource"
# 3. Search "Form Recognizer"
# 4. Create with F0 (Free) tier in Australia Southeast
# 5. Copy Endpoint and Key from "Keys and Endpoint" page
```

```bash
# Option B: Azure CLI (Fast if you have CLI installed)
az cognitiveservices account create \
  --name jobsoldform-formrecognizer \
  --resource-group <your-resource-group> \
  --kind FormRecognizer \
  --sku F0 \
  --location australiasoutheast

# Get endpoint and key
az cognitiveservices account show \
  --name jobsoldform-formrecognizer \
  --resource-group <your-resource-group> \
  --query properties.endpoint

az cognitiveservices account keys list \
  --name jobsoldform-formrecognizer \
  --resource-group <your-resource-group>
```

### 2. Configure Static Web App (2 minutes)

1. Go to Azure Portal → Your Static Web App
2. Click "Configuration" under Settings
3. Add these application settings:

| Name | Value |
|------|-------|
| `FORM_RECOGNIZER_ENDPOINT` | `https://your-resource.cognitiveservices.azure.com/` |
| `FORM_RECOGNIZER_KEY` | `your_key_here` |

4. Click "Save"

### 3. Deploy Code (3 minutes)

```bash
# Dependencies are already installed!
# Just commit and push:

git add .
git commit -m "Add PDF extraction service"
git push

# Wait 2-3 minutes for deployment
```

### 4. Test It! (2 minutes)

**Save the sample PO PDF from the chat to `test-documents/sample-po.pdf`**

Then test locally:

```bash
# Test against production API
export API_ENDPOINT=https://your-app.azurestaticapps.net/api/extract-document

node api/test-extraction.js test-documents/sample-po.pdf
```

**Expected Output:**
```
==========================================================
PDF Extraction Test
==========================================================
PDF File: test-documents/sample-po.pdf
...
✓ Extraction successful!

Extracted Fields:
----------------------------------------------------------
  PO Number           : 4503605212
                        ✓ Confidence: 98.0%
  Amount              : $28,296.00
                        ✓ Confidence: 95.0%
  Client Name         : Reckitt Benckiser (Australia) PTY LTD
                        ✓ Confidence: 96.0%
```

## Troubleshooting

### "Form Recognizer not configured"
→ Check environment variables are saved in Static Web App configuration

### "Authentication required"
→ Ensure FORM_AUTH_TOKEN is set correctly

### Test fails to connect
→ Wait 2-3 minutes after deployment for changes to propagate

## Next Steps

Once extraction works:

1. **Integrate with DocumentForm** - See [EXTRACTION-SUMMARY.md](EXTRACTION-SUMMARY.md#2-integrate-with-documentform-frontend)
2. **Add SharePoint** - Save extracted data to SharePoint lists
3. **Monitor Costs** - Set up budget alerts in Azure

## Full Documentation

- **Setup Guide**: [SETUP-EXTRACTION.md](SETUP-EXTRACTION.md)
- **API Docs**: [api/README-EXTRACTION.md](api/README-EXTRACTION.md)
- **Summary**: [EXTRACTION-SUMMARY.md](EXTRACTION-SUMMARY.md)

---

**Questions?** Check the troubleshooting sections in the full documentation.