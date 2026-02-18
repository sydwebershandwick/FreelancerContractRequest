# Job Sold Form - React App for Azure Static Web Apps

A React-based form application designed to be deployed as an Azure Static Web App and embedded in SharePoint via iframe. The form sends data to Power Automate for processing.

## Features

- Clean, responsive React form interface
- Dynamic invoice line items with add/remove functionality
- File upload with drag-and-drop support
- Automatic total validation (invoice total must match PO amount)
- Power Automate integration
- SharePoint iframe compatibility
- Built with Create React App

## Setup Instructions

### 1. Power Automate Flow Setup

Follow the detailed instructions in [`POWER-AUTOMATE-SETUP.md`](./POWER-AUTOMATE-SETUP.md) to create your Power Automate flow.

### 2. Configure the Application

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Power Automate webhook URL:
   ```
   REACT_APP_POWER_AUTOMATE_URL=https://prod-xx.westus.logic.azure.com/workflows/...
   ```

### 3. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### 4. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

### 5. Deploy to Azure Static Web Apps

#### Option A: GitHub Integration
1. Push your code to a GitHub repository
2. Create an Azure Static Web App resource
3. Connect it to your GitHub repository
4. Use these build settings:
   - App location: `/`
   - Api location: `` (leave empty)
   - Output location: `build`

#### Option B: Manual Deployment
1. Build the app locally: `npm run build`
2. Use Azure Static Web Apps CLI:
   ```bash
   npm install -g @azure/static-web-apps-cli
   swa deploy ./build --deployment-token <your-token>
   ```

### 6. Embed in SharePoint

Add the following iframe code to your SharePoint page:

```html
<iframe 
  src="https://nice-sea-0988e6c00.1.azurestaticapps.net" 
  width="100%" 
  height="1200" 
  frameborder="0"
  style="border: none;">
</iframe>
```

## Power Automate Flow Structure

The form sends the following JSON structure:

```json
{
  "jobNumber": "string",
  "purchaseOrderNumber": "string",
  "purchaseOrderAmount": number,
  "purchaseOrderFileName": "string",
  "purchaseOrderFileSize": number,
  "purchaseOrderFileType": "string",
  "purchaseOrderFileContent": "base64string",
  "invoiceSchedule": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number
    }
  ],
  "invoiceTotal": number,
  "submittedAt": "ISO 8601 datetime"
}
```

## SharePoint List Structure

Create the following lists in SharePoint:

### 1. Job Sold List
| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| JobNumber | Single line of text | Yes | Job number (Title column renamed to JobNumber) |
| PurchaseOrderNumber | Single line of text | Yes | Purchase order reference |
| PurchaseOrderAmount | Currency | Yes | PO amount |
| InvoiceTotal | Currency | Yes | Total invoice amount |
| SubmittedAt | Date and Time | Yes | Submission timestamp |

### 2. Invoice Schedule List
| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| JobNumber | Single line of text | Yes | Job number (Title column renamed to JobNumber) |
| Description | Single line of text | Yes | Invoice description |
| JobNumberLookup | Lookup (to Job Sold List) | Yes | Lookup relationship to job |
| JobLink | Hyperlink or Picture | No | Direct link to job details |
| InvoiceDate | Date | Yes | Invoice due date |
| Amount | Currency | Yes | Invoice amount |

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## Security Considerations

1. Store the Power Automate URL in environment variables
2. The URL is still exposed in the built JavaScript bundle
3. Consider implementing additional authentication if needed
4. Validate all data in Power Automate flow before creating SharePoint items
5. Set appropriate CORS policies in Azure Static Web App configuration

## Troubleshooting

1. **CORS errors**: Check the `staticwebapp.config.json` file and ensure your SharePoint domain is allowed
2. **File upload issues**: Verify file size limits in both client and Power Automate
3. **Iframe not loading**: Ensure SharePoint allows embedding from your Azure domain
4. **Build errors**: Make sure you have Node.js 14+ installed
5. **Environment variables not working**: Ensure variable names start with `REACT_APP_`