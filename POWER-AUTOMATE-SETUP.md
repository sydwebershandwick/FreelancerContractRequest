# Power Automate Flow Setup Guide

Follow these step-by-step instructions to create the Power Automate flow for handling form submissions.

## Step 1: Create a New Flow

1. Go to [Power Automate](https://make.powerautomate.com)
2. Click **+ Create** → **Instant cloud flow**
3. Click **Skip** to start with a blank flow
4. Search for and select **"When a HTTP request is received"** trigger

## Step 2: Configure the HTTP Trigger

1. In the trigger, click **"Use sample payload to generate schema"**
2. Paste this JSON sample:

```json
{
  "jobNumber": "JOB-2024-001",
  "purchaseOrderNumber": "PO-12345",
  "purchaseOrderAmount": 50000,
  "purchaseOrderFileName": "purchase_order.pdf",
  "purchaseOrderFileSize": 1024000,
  "purchaseOrderFileType": "application/pdf",
  "purchaseOrderFileContent": "base64string",
  "invoiceSchedule": [
    {
      "date": "2024-03-01",
      "description": "Initial payment",
      "amount": 25000
    },
    {
      "date": "2024-04-01",
      "description": "Final payment",
      "amount": 25000
    }
  ],
  "invoiceTotal": 50000,
  "submittedAt": "2024-01-15T10:30:00Z"
}
```

3. Click **Done** - The schema will be generated automatically
4. Set **Method** to **POST**
5. After saving, you'll get the HTTP POST URL - copy this for later

## Step 3: Parse the JSON Data

1. Click **+ New step**
2. Search for **"Parse JSON"**
3. Select **Parse JSON** action
4. In **Content** field, select **body** from Dynamic content (under "When a HTTP request is received")
5. Click **"Use sample payload to generate schema"** and paste the same JSON sample from Step 2

## Step 4: Create SharePoint Job Item

1. Click **+ New step**
2. Search for **"SharePoint"**
3. Select **"Create item"** action
4. Configure:
   - **Site Address**: Select your SharePoint site
   - **List Name**: Select "Job Sold List" (or create it first - see list structure below)
   - Map fields:
     - **JobNumber**: Select **jobNumber** from Dynamic content (mapped to renamed Title field)
     - **PurchaseOrderNumber**: Select **purchaseOrderNumber**
     - **PurchaseOrderAmount**: Use expression: `div(body('Parse_JSON')?['purchaseOrderAmount'], 100)` (converts cents to dollars)
     - **InvoiceTotal**: Use expression: `div(body('Parse_JSON')?['invoiceTotal'], 100)` (converts cents to dollars)
     - **SubmittedAt**: Select **submittedAt**

## Step 5: Save Purchase Order File

1. Click **+ New step**
2. Search for **"SharePoint"**
3. Select **"Create file"** action
4. Configure:
   - **Site Address**: Your SharePoint site
   - **Folder Path**: Click folder icon and navigate to `/Shared Documents/Purchase Orders` (create this folder first)
   - **File Name**: Use expression: `concat(body('Parse_JSON')?['jobNumber'], '_', body('Parse_JSON')?['purchaseOrderFileName'])`
   - **File Content**: Use expression: `base64ToBinary(body('Parse_JSON')?['purchaseOrderFileContent'])`

## Step 6: Create Invoice Line Items

1. Click **+ New step**
2. Search for **"Apply to each"**
3. Select **"Apply to each"** control
4. In **Select an output from previous steps**, select **invoiceSchedule** from Dynamic content
5. Inside the loop, click **Add an action**
6. Search for **"SharePoint"** and select **"Create item"**
7. Configure:
   - **Site Address**: Your SharePoint site
   - **List Name**: "Invoice Schedule List"
   - Map fields:
     - **JobNumber**: Select **jobNumber** from Dynamic content (from Parse JSON step) - mapped to renamed Title field
     - **Description**: Select **description** from Dynamic content (under "Apply to each") - invoice description
     - **JobNumberLookup**: Click in this field and select **ID** from the "Create item" step (Step 4) - NOT jobNumber field, must be ID for lookup to work
     - **JobLink**: Use expression: `concat('https://[your-site]/Lists/JobSoldList/DispForm.aspx?ID=', outputs('Create_item')?['body/ID'])`
     - **InvoiceDate**: Select **date** from Dynamic content
     - **Amount**: Use expression: `div(item()?['amount'], 100)` (converts cents to dollars)

## Step 7: Send Response

1. After the "Apply to each" loop, click **+ New step**
2. Search for **"Response"**
3. Select **"Response"** action
4. Configure:
   - **Status Code**: 200
   - **Headers**: Add header `Content-Type` with value `application/json`
   - **Body**: 
   ```json
   {
     "message": "Form submitted successfully",
     "jobId": @{outputs('Create_item')?['body/ID']}
   }
   ```

## Step 8: Save and Test

1. Click **Save** at the top
2. Copy the HTTP POST URL from Step 2
3. Update `app.js` in your Azure Static Web App with this URL

## Required SharePoint Lists

Before running the flow, create these lists in SharePoint:

### Job Sold List
| Column Name | Type | Required |
|------------|------|----------|
| JobNumber | Single line of text | Yes |
| PurchaseOrderNumber | Single line of text | Yes |
| PurchaseOrderAmount | Currency | Yes |
| InvoiceTotal | Currency | Yes |
| SubmittedAt | Date and Time | Yes |

### Invoice Schedule List
| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| JobNumber | Single line of text | Yes | Job number (Title column renamed to JobNumber) |
| Description | Single line of text | Yes | Invoice description |
| JobNumberLookup | Lookup (to Job Sold List) | Yes | Lookup relationship to job |
| JobLink | Hyperlink or Picture | No | Direct link to job details |
| InvoiceDate | Date | Yes | Invoice due date |
| Amount | Currency | Yes | Invoice amount |

## Error Handling (Optional)

Add these steps for better error handling:

1. After each SharePoint action, add a parallel branch
2. Configure to run after: "has failed"
3. Add appropriate error handling (send email, log to list, etc.)

## Testing the Flow

1. Use the **Test** button in Power Automate
2. Select **Manually**
3. Use Postman or the form to send a test request
4. Check the run history for any errors

## Troubleshooting

- **400 Bad Request**: Check your JSON schema matches exactly
- **404 Not Found**: Verify SharePoint site URL and list names
- **500 Server Error**: Check expressions in dynamic content
- **File creation fails**: Ensure the target folder exists in SharePoint
- **Decimal values not accepted**: The form now sends amounts as integers (cents). Use `div()` expression in Power Automate to convert back to dollars

## Important Note on Currency Handling

The form sends all currency amounts as **integers in cents** to avoid decimal/JSON parsing issues:
- $10.50 is sent as 1050
- $0.50 is sent as 50
- $100.00 is sent as 10000

Power Automate must use the `div()` function to convert these back to dollar amounts when saving to SharePoint.