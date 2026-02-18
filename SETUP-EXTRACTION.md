# PDF Extraction Service - Setup Guide

This guide will help you set up the Azure Form Recognizer PDF extraction service for automatically extracting data from Purchase Orders and other documents.

## Prerequisites

- Azure subscription
- Azure Static Web App already deployed
- Node.js 18+ installed locally (for testing)

## Step 1: Create Azure Form Recognizer Resource

1. **Navigate to Azure Portal**
   - Go to [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Azure account

2. **Create Form Recognizer Resource**
   - Click "+ Create a resource"
   - Search for "Form Recognizer" or "Azure AI Document Intelligence"
   - Click "Create"

3. **Configure the Resource**
   - **Subscription**: Select your subscription
   - **Resource Group**: Use the same resource group as your Static Web App
   - **Region**: Australia Southeast (recommended for performance)
   - **Name**: Choose a unique name (e.g., `jobsoldform-formrecognizer`)
   - **Pricing Tier**:
     - **F0 (Free)**: 500 pages/month - Good for testing
     - **S0 (Standard)**: $1.50/1000 pages - For production

4. **Review and Create**
   - Click "Review + create"
   - Click "Create"
   - Wait for deployment to complete (usually 1-2 minutes)

## Step 2: Get API Credentials

1. **Navigate to Your Form Recognizer Resource**
   - Go to "Resource Management" → "Keys and Endpoint"

2. **Copy Credentials**
   - **Endpoint**: Copy the full endpoint URL
     - Example: `https://jobsoldform-formrecognizer.cognitiveservices.azure.com/`
   - **Key**: Copy either "KEY 1" or "KEY 2"
     - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

   ⚠️ **Important**: Keep these credentials secure! Don't commit them to git.

## Step 3: Configure Azure Static Web App

1. **Navigate to Your Static Web App**
   - Go to Azure Portal → Your Static Web App resource

2. **Add Environment Variables**
   - Go to "Settings" → "Configuration"
   - Click "+ Add" for each variable:

   | Name | Value | Example |
   |------|-------|---------|
   | `FORM_RECOGNIZER_ENDPOINT` | Your Form Recognizer endpoint | `https://your-resource.cognitiveservices.azure.com/` |
   | `FORM_RECOGNIZER_KEY` | Your Form Recognizer key | `a1b2c3d4e5f6...` |

3. **Save Configuration**
   - Click "Save" at the top
   - The app will restart automatically

## Step 4: Install Dependencies

1. **Open Terminal in the `api` folder**
   ```bash
   cd api
   npm install
   ```

   This will install:
   - `@azure/functions` (already installed)
   - `@azure/ai-form-recognizer` (newly added)

## Step 5: Test Locally (Optional)

1. **Create Local Settings File**
   ```bash
   cd api
   cp .env.example local.settings.json
   ```

2. **Edit `api/local.settings.json`**
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "FORM_RECOGNIZER_ENDPOINT": "https://your-resource.cognitiveservices.azure.com/",
       "FORM_RECOGNIZER_KEY": "your_key_here",
       "FORM_AUTH_TOKEN": "1f34ab3575caa4e2e5e749209be888e8c656db9adac4e5f85bf646866806bb9e"
     }
   }
   ```

3. **Install Azure Functions Core Tools** (if not already installed)
   ```bash
   npm install -g azure-functions-core-tools@4
   ```

4. **Start Local Azure Functions**
   ```bash
   cd api
   func start
   ```

   You should see:
   ```
   Functions:
     extract-document: [POST] http://localhost:7071/api/extract-document
     submit: [POST] http://localhost:7071/api/submit
   ```

5. **Test with Sample PDF**
   ```bash
   # Save the sample PO PDF from the chat to test-documents/sample-po.pdf
   node test-extraction.js ../test-documents/sample-po.pdf
   ```

## Step 6: Deploy to Azure

The extraction service will be automatically deployed with your next git push since it's in the `api/` folder.

1. **Commit the New Files**
   ```bash
   git add api/extract-document.js api/package.json
   git commit -m "Add PDF extraction service with Azure Form Recognizer"
   git push
   ```

2. **Verify Deployment**
   - Go to Azure Portal → Static Web App → "Deployments"
   - Wait for the deployment to complete (2-5 minutes)
   - Check the deployment logs for any errors

## Step 7: Test Production Endpoint

1. **Get Your Static Web App URL**
   - Example: `https://your-app.azurestaticapps.net`

2. **Test the Endpoint**
   ```bash
   # Set environment variable
   export API_ENDPOINT=https://your-app.azurestaticapps.net/api/extract-document

   # Run test
   node api/test-extraction.js test-documents/sample-po.pdf
   ```

## Verification Checklist

- [ ] Azure Form Recognizer resource created
- [ ] Endpoint and Key copied
- [ ] Environment variables configured in Static Web App
- [ ] Dependencies installed (`npm install` in api folder)
- [ ] Local testing successful (optional)
- [ ] Code committed and pushed
- [ ] Deployment completed successfully
- [ ] Production endpoint responds correctly

## Troubleshooting

### Issue: "Form Recognizer not configured" error

**Solution:**
- Verify environment variables are set in Azure Static Web App configuration
- Ensure variable names are exactly: `FORM_RECOGNIZER_ENDPOINT` and `FORM_RECOGNIZER_KEY`
- Check endpoint URL ends with a `/`
- Restart the Static Web App after configuration changes

### Issue: "Authentication required" error

**Solution:**
- Ensure `X-Form-Token` header is included in request
- Verify the token matches `FORM_AUTH_TOKEN` environment variable

### Issue: Local testing fails with "connection refused"

**Solution:**
- Ensure Azure Functions Core Tools are installed: `func --version`
- Check `func start` is running in the `api` folder
- Verify no other service is using port 7071

### Issue: Low confidence scores (<70%)

**Solution:**
- Ensure PDF is high quality (not scanned/blurry)
- Check document follows standard invoice/PO layout
- Try with a different document to verify service is working
- Consider using custom trained model for non-standard formats

### Issue: Deployment fails

**Solution:**
- Check deployment logs in Azure Portal
- Verify package.json includes all dependencies
- Ensure Node.js version is 18+ in package.json engines

## Cost Monitoring

1. **Navigate to Form Recognizer Resource**
   - Go to "Cost Management" → "Cost analysis"

2. **Set Up Alerts** (Recommended)
   - Go to "Cost Management" → "Budgets"
   - Create a budget alert (e.g., $10/month)
   - Set email notification threshold

3. **Monitor Usage**
   - Free tier: 500 pages/month
   - Standard: ~$1.50 per 1,000 pages
   - Check monthly usage in "Metrics" section

## Next Steps

Once the extraction service is set up:

1. **Integrate with DocumentForm** - Modify the React form to call the extraction endpoint
2. **Add SharePoint Integration** - Save extracted data to SharePoint lists
3. **Implement Review Workflow** - Allow users to verify and correct extracted data
4. **Add Progress Indicators** - Show extraction status to users

See [README-EXTRACTION.md](api/README-EXTRACTION.md) for API documentation and integration details.

## Security Notes

- Never commit `local.settings.json` to git (already in .gitignore)
- Rotate API keys regularly (every 90 days recommended)
- Use Azure Key Vault for production secrets (optional, more secure)
- Monitor API usage for unexpected spikes

## Support

For issues with:
- **Azure Form Recognizer**: [Azure Support](https://docs.microsoft.com/azure/cognitive-services/form-recognizer/)
- **This Integration**: Check troubleshooting section above or review logs in Azure Portal