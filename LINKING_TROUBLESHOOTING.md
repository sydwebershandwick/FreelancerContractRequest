# Job Sold Form - Invoice Schedule List Linking Troubleshooting

## Issue Description
The Invoice Schedule List should have a lookup relationship to the Job Sold List through the JobNumber field, but the linking is not working at runtime.

## Root Cause Analysis
Based on the Power Automate flow configuration, the issue is in Step 6 of `POWER-AUTOMATE-SETUP.md:94`. The flow correctly maps the **ID** from the Job Sold List creation to the **JobNumber** field in the Invoice Schedule List, which should create the lookup relationship.

## Solution Steps

### 1. Verify SharePoint List Configuration

**Job Sold List** should have these columns:
- Title (Single line of text) - mapped to jobNumber
- PurchaseOrderNumber (Single line of text)
- PurchaseOrderAmount (Currency)
- InvoiceTotal (Currency)
- SubmittedAt (Date and Time)

**Invoice Schedule List** should have these columns:
- Title (Single line of text) - mapped to description
- **JobNumber (Lookup to Job Sold List)** ← This is critical!
- InvoiceDate (Date)
- Amount (Currency)

### 2. Power Automate Flow Configuration

In Step 6 of the flow (Create Invoice Line Items), ensure:
```
- JobNumber: Select **ID** from the "Create item" step (Step 4)
```

This maps the newly created Job Sold List item's ID to the JobNumber lookup field.

### 3. Testing the Linking

Use the test script to verify the flow works:

```bash
chmod +x test_power_automate.sh
./test_power_automate.sh
```

### 4. Verification Steps

After successful form submission:

1. **Check Job Sold List**: Should contain one new item with the jobNumber as Title
2. **Check Invoice Schedule List**: Should contain invoice line items with:
   - JobNumber field showing a clickable link to the Job Sold List item
   - Each invoice line properly linked to the parent job

### 5. Common Issues and Solutions

**Issue**: JobNumber field shows ID number but no link
**Solution**: Ensure the JobNumber column in Invoice Schedule List is configured as "Lookup" type pointing to Job Sold List

**Issue**: Power Automate flow fails at invoice creation step
**Solution**: Check that the Invoice Schedule List has the JobNumber lookup column properly configured

**Issue**: Links appear but clicking them shows "Access Denied"
**Solution**: Verify SharePoint permissions allow users to view both lists

## Testing Workflow

1. Run the test script: `./test_power_automate.sh`
2. Check the response for successful submission
3. Navigate to SharePoint and verify:
   - Job Sold List has new entry with jobNumber "JOB-2025-TEST-001"
   - Invoice Schedule List has 2 entries with working links in JobNumber field
4. Click the JobNumber link to ensure it navigates to the correct Job Sold List item

## Expected Behavior

When working correctly:
- Form submission creates 1 Job Sold List item
- Form submission creates N Invoice Schedule List items (based on invoice lines)
- Each Invoice Schedule item's JobNumber field shows as a clickable link
- Clicking the link navigates to the parent Job Sold List item
- The relationship is bidirectional (Job Sold List item shows related invoice lines)