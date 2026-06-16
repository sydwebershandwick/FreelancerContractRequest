# Overall Plan: Freelancer Contract Generation System

## Overview
This plan outlines the step-by-step implementation of a freelancer contract generation system using Power Automate, adapted for scenarios where templates are not stored in SharePoint (using OneDrive for Business instead).

## Phase 1: Prerequisites and Setup

### 1. Prepare Word Templates
Create two Word documents with Content Controls for the contract fields:
- `ABN Contractor Agreement_Template_2024 - Company.docx` (for company contractors)
- `ABN Contractor Agreement_Template_2024 - Sole Trader.docx` (for sole traders)

**Content Controls to include:**
- firstName, surname, agency, freelancerEmail, abn, companyType, companyName
- workLocationState, rolePosition, duties, additionalRates
- contractorName, contractDate, startDate, endDate, dayRate, hourlyRate

Upload these templates to OneDrive for Business (create a folder like "Contract Templates").

> **Note:** If you can't use OneDrive, you'll need SharePoint or another Microsoft 365 storage location accessible via Power Automate connectors.

### 2. Set up Storage Locations
- **Contract Drafts**: Create a OneDrive folder called "Contract Drafts" for generated contract files
- **Tracking System**: Create a SharePoint list called "FreelancerContracts" with columns:
  - Title (Single line - default)
  - ContractorName (Single line of text)
  - Agency (Choice: Jack Morton, Weber Shandwick, Vocal Content)
  - FreelancerEmail (Single line of text)
  - SubmitterEmail (Single line of text)
  - Status (Choice: Draft, Draft (Revised), Ready for Signing, Sent for Signing, Signed)
  - DraftFileUrl (Single line of text)
  - ContractDate (Date only)
  - StartDate (Date only)
  - EndDate (Date only)
  - DayRate (Currency)
  - HourlyRate (Currency)

### 3. Configure Power Automate Environment
- Ensure you have Power Automate license and access to Microsoft 365 connectors
- Set up connections for: SharePoint, Outlook, Word Online (OneDrive), Office 365

## Phase 2: Build the Power Automate Flow (Flow 1)

### 4. Create the Flow
- Go to Power Automate → My flows → New flow → Instant cloud flow
- Name: `Freelancer Contract Generation`
- Trigger: **When an HTTP request is received** (POST method)

### 5. Configure HTTP Trigger
Add this JSON Schema to the "Request Body JSON Schema" field:

```json
{
  "type": "object",
  "properties": {
    "submissionType": { "type": "string" },
    "agency": { "type": "string" },
    "firstName": { "type": "string" },
    "surname": { "type": "string" },
    "freelancerEmail": { "type": "string" },
    "yourEmail": { "type": "string" },
    "abn": { "type": "string" },
    "companyType": { "type": "string" },
    "companyName": { "type": "string" },
    "workLocationState": { "type": "string" },
    "rolePosition": { "type": "string" },
    "duties": { "type": "string" },
    "dayRate": { "type": "number" },
    "hourlyRate": { "type": "number" },
    "additionalRates": { "type": "string" },
    "contractDate": { "type": "string" },
    "startDate": { "type": "string" },
    "endDate": { "type": "string" },
    "hideHourlyRateInContract": { "type": "boolean" },
    "superApplicable": { "type": "boolean" },
    "superRate": { "type": "number" },
    "submittedAt": { "type": "string" }
  },
  "required": [
    "submissionType", "agency", "firstName", "surname",
    "freelancerEmail", "yourEmail", "abn", "companyType",
    "workLocationState", "rolePosition", "duties", "hourlyRate",
    "contractDate", "startDate"
  ]
}
```

Save the flow to generate the HTTP POST URL.

### 6. Initialize Variables
Create these variables in order:

- **varContractorName** (String):
  ```
  if(equals(triggerBody()?['companyType'], 'Company'), triggerBody()?['companyName'], concat(triggerBody()?['firstName'], ' ', triggerBody()?['surname']))
  ```

- **varEndDateDisplay** (String):
  ```
  if(equals(triggerBody()?['endDate'], null), 'Valid for 12 months from the date of execution', formatDateTime(triggerBody()?['endDate'], 'd MMMM yyyy'))
  ```

- **varContractDateFormatted** (String):
  ```
  formatDateTime(triggerBody()?['contractDate'], 'd MMMM yyyy')
  ```

- **varStartDateFormatted** (String):
  ```
  formatDateTime(triggerBody()?['startDate'], 'd MMMM yyyy')
  ```

- **varDayRateDisplay** (String):
  ```
  if(or(equals(triggerBody()?['dayRate'], null), equals(triggerBody()?['dayRate'], 0)), '', if(equals(triggerBody()?['companyType'], 'Sole Trader'), concat('$', string(mul(triggerBody()?['dayRate'], 1.12)), ' per day (incl. Super)'), concat('$', string(triggerBody()?['dayRate']), ' per day')))
  ```

- **varHourlyRateDisplay** (String):
  ```
  if(equals(triggerBody()?['hideHourlyRateInContract'], true), '', if(equals(triggerBody()?['companyType'], 'Sole Trader'), concat('$', string(mul(triggerBody()?['hourlyRate'], 1.12)), ' per hour (incl. Super)'), concat('$', string(triggerBody()?['hourlyRate']), ' per hour')))
  ```

- **varFileName** (String):
  ```
  concat('Contract_', triggerBody()?['firstName'], '_', triggerBody()?['surname'], '_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.docx')
  ```

### 7. Template Population Logic
- Add a **Condition** to check `companyType` equals "Company"

**If Yes (Company):**
- Use "Populate a Microsoft Word template" action
- Location: OneDrive for Business
- Folder: /Contract Templates
- File: ABN Contractor Agreement_Template_2024 - Company.docx
- Map all Content Control fields to trigger data and variables

**If No (Sole Trader):**
- Use "Populate a Microsoft Word template" action
- Location: OneDrive for Business
- Folder: /Contract Templates
- File: ABN Contractor Agreement_Template_2024 - Sole Trader.docx
- Map all Content Control fields to trigger data and variables

### 8. Unify Template Outputs
- Add **Compose** action named `UnifiedDocumentOutput`
- Inputs expression:
  ```
  if(equals(triggerBody()?['companyType'], 'Company'), body('Populate_a_Microsoft_Word_template'), body('Populate_a_Microsoft_Word_template_2'))
  ```

### 9. Handle New vs Revision Submissions
- Add **Condition** to check `submissionType` equals "New"

**If Yes (New Contract):**
- Create file in OneDrive "Contract Drafts" folder using `varFileName` and `UnifiedDocumentOutput`
- Create item in FreelancerContracts list with all contract details
- Compose draft URL for Word Online

**If No (Revision):**
- Get existing contract from FreelancerContracts list (filter by email and agency)
- Update file in OneDrive using existing filename
- Update tracking list item status to "Draft (Revised)"
- Get existing draft URL

### 10. Send Notifications
- Send email to finance team with contract details and edit link
- Include HTML table with contractor info, role, dates, submitter
- Provide link to open draft in Word Online

### 11. Return Response
- Add **Response** action with status 200
- Return JSON with success message and draft URL

## Phase 3: Integration and Testing

### 12. Connect to Frontend
- Add the Power Automate HTTP URL as `POWER_AUTOMATE_URL` in:
  - GitHub repository secrets
  - Azure Static Web App environment variables
- Update form submission to POST data to this URL

### 13. Test the Flow
- Test with sample data for both company and sole trader scenarios
- Test new submissions and revisions
- Verify email notifications and file generation work correctly

### 14. Handle Edge Cases
- Add error handling for missing templates or connection issues
- Implement retry logic if needed
- Add logging for troubleshooting

## Phase 4: Additional Flows (Future Implementation)

### 15. Contract Finalization Flow (Flow 2)
- Trigger: When status changes to "Ready for Signing"
- Send to DocuSign/Adobe Sign for signatures
- Update tracking status to "Sent for Signing"

### 16. Post-Signing Flow (Flow 3)
- Trigger: When contract is signed
- Move completed contract to final storage
- Send confirmation emails to all parties
- Update tracking system with final status

## Key Adjustments for No SharePoint Templates
- **Template Storage**: Use OneDrive for Business instead of SharePoint document library
- **File Operations**: Use OneDrive connectors instead of SharePoint ones
- **Tracking**: Can still use SharePoint list, or switch to Excel/OneDrive file if needed
- **Alternative**: If Microsoft 365 storage isn't available, consider using Azure Blob Storage or another cloud storage with appropriate connectors

## Success Criteria
- [ ] Templates created and uploaded to OneDrive
- [ ] Storage locations configured
- [ ] Power Automate flow built and tested
- [ ] Frontend integrated with flow
- [ ] Email notifications working
- [ ] Tracking system operational
- [ ] Both new contracts and revisions handled correctly

## Notes
- This plan assumes access to Microsoft 365 services (OneDrive, SharePoint, Outlook)
- If Microsoft 365 isn't available, alternative automation platforms may be needed
- All dates should be validated and formatted consistently
- Consider adding approval workflows for contract finalization</content>
<parameter name="filePath">/workspace/OVERALL_PLAN.md