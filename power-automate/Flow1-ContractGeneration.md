# Flow 1: Freelancer Contract Generation

## Create the Flow

1. Go to **Power Automate** > **My flows** > **New flow** > **Instant cloud flow**
2. Name: `Freelancer Contract Generation`
3. Trigger: **When an HTTP request is received**
4. Click **Create**

---

## Step 1: Configure the HTTP Trigger

Click on the trigger and paste this **JSON Schema** into the "Request Body JSON Schema" field:

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

Method: **POST**

> After saving, this trigger will generate a unique **HTTP POST URL**. Copy this URL - it becomes your `POWER_AUTOMATE_URL` secret in GitHub.

---

## Step 2: Initialize Variable - varContractorName

- Click **+ New step** > search **Initialize variable**
- **Name**: `varContractorName`
- **Type**: String
- **Value**: Click into the value field, then click **Expression** tab, paste:

```
if(equals(triggerBody()?['companyType'], 'Company'), triggerBody()?['companyName'], concat(triggerBody()?['firstName'], ' ', triggerBody()?['surname']))
```

Click **OK**.

---

## Step 3: Initialize Variable - varEndDateDisplay

- **+ New step** > **Initialize variable**
- **Name**: `varEndDateDisplay`
- **Type**: String
- **Value** (Expression):

```
if(equals(triggerBody()?['endDate'], null), 'Valid for 12 months from the date of execution', formatDateTime(triggerBody()?['endDate'], 'd MMMM yyyy'))
```

---

## Step 4: Initialize Variable - varContractDateFormatted

- **+ New step** > **Initialize variable**
- **Name**: `varContractDateFormatted`
- **Type**: String
- **Value** (Expression):

```
formatDateTime(triggerBody()?['contractDate'], 'd MMMM yyyy')
```

---

## Step 5: Initialize Variable - varStartDateFormatted

- **+ New step** > **Initialize variable**
- **Name**: `varStartDateFormatted`
- **Type**: String
- **Value** (Expression):

```
formatDateTime(triggerBody()?['startDate'], 'd MMMM yyyy')
```

---

## Step 6: Initialize Variable - varDayRateDisplay

- **+ New step** > **Initialize variable**
- **Name**: `varDayRateDisplay`
- **Type**: String
- **Value** (Expression):

```
if(or(equals(triggerBody()?['dayRate'], null), equals(triggerBody()?['dayRate'], 0)), '', if(equals(triggerBody()?['companyType'], 'Sole Trader'), concat('$', string(mul(triggerBody()?['dayRate'], 1.12)), ' per day (incl. Super)'), concat('$', string(triggerBody()?['dayRate']), ' per day')))
```

---

## Step 7: Initialize Variable - varHourlyRateDisplay

- **+ New step** > **Initialize variable**
- **Name**: `varHourlyRateDisplay`
- **Type**: String
- **Value** (Expression):

```
if(equals(triggerBody()?['hideHourlyRateInContract'], true), '', if(equals(triggerBody()?['companyType'], 'Sole Trader'), concat('$', string(mul(triggerBody()?['hourlyRate'], 1.12)), ' per hour (incl. Super)'), concat('$', string(triggerBody()?['hourlyRate']), ' per hour')))
```

---

## Step 8: Initialize Variable - varFileName

- **+ New step** > **Initialize variable**
- **Name**: `varFileName`
- **Type**: String
- **Value** (Expression):

```
concat('Contract_', triggerBody()?['firstName'], '_', triggerBody()?['surname'], '_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.docx')
```

---

## Step 9: Condition - Select template by companyType

- **+ New step** > **Condition**
- Value: `companyType` (Dynamic content from trigger)
- Operator: **is equal to**
- Value: `Company`

---

## Step 9a (If Yes - Company): Populate Company template

Inside the **If yes** branch:

- **Add an action** > search **Populate a Microsoft Word template** (Word Online Business connector)
- **Location**: Your SharePoint site (select from dropdown)
- **Document Library**: `ContractTemplates`
- **File**: `ABN Contractor Agreement_Template_2024 - Company.docx`

Once selected, the action will show all Content Control tags from the Company template. Map each one:

| Content Control Tag | Value (use Dynamic content) |
|---|---|
| `firstName` | `firstName` (from trigger) |
| `surname` | `surname` (from trigger) |
| `agency` | `agency` (from trigger) |
| `freelancerEmail` | `freelancerEmail` (from trigger) |
| `abn` | `abn` (from trigger) |
| `companyType` | `companyType` (from trigger) |
| `companyName` | `companyName` (from trigger) |
| `workLocationState` | `workLocationState` (from trigger) |
| `rolePosition` | `rolePosition` (from trigger) |
| `duties` | `duties` (from trigger) |
| `additionalRates` | `additionalRates` (from trigger) |
| `contractorName` | `varContractorName` (from variables) |
| `contractDate` | `varContractDateFormatted` (from variables) |
| `startDate` | `varStartDateFormatted` (from variables) |
| `endDate` | `varEndDateDisplay` (from variables) |
| `dayRate` | `varDayRateDisplay` (from variables) |
| `hourlyRate` | `varHourlyRateDisplay` (from variables) |

---

## Step 9b (If No - Sole Trader): Populate Sole Trader template

Inside the **If no** branch:

- **Add an action** > search **Populate a Microsoft Word template** (Word Online Business connector)
- **Location**: Your SharePoint site (select from dropdown)
- **Document Library**: `ContractTemplates`
- **File**: `ABN Contractor Agreement_Template_2024 - Sole Trader.docx`

Once selected, the action will show all Content Control tags from the Sole Trader template. Map each one:

| Content Control Tag | Value (use Dynamic content) |
|---|---|
| `firstName` | `firstName` (from trigger) |
| `surname` | `surname` (from trigger) |
| `agency` | `agency` (from trigger) |
| `freelancerEmail` | `freelancerEmail` (from trigger) |
| `abn` | `abn` (from trigger) |
| `companyType` | `companyType` (from trigger) |
| `workLocationState` | `workLocationState` (from trigger) |
| `rolePosition` | `rolePosition` (from trigger) |
| `duties` | `duties` (from trigger) |
| `additionalRates` | `additionalRates` (from trigger) |
| `contractorName` | `varContractorName` (from variables) |
| `contractDate` | `varContractDateFormatted` (from variables) |
| `startDate` | `varStartDateFormatted` (from variables) |
| `endDate` | `varEndDateDisplay` (from variables) |
| `dayRate` | `varDayRateDisplay` (from variables) |
| `hourlyRate` | `varHourlyRateDisplay` (from variables) |

> Not all tags need to appear in both templates. For example, `companyName` may only appear in the Company template. Map only the tags that exist in each template — Power Automate will show the available tags automatically once you select the file.

---

## Step 10: Compose - Unify template output

After the Step 9 Condition block (outside both branches):

- **+ New step** > search **Compose**
- **Rename** the action to `UnifiedDocumentOutput`
- **Inputs** (Expression):

```
if(equals(triggerBody()?['companyType'], 'Company'), body('Populate_a_Microsoft_Word_template'), body('Populate_a_Microsoft_Word_template_2'))
```

> Adjust the action names (`Populate_a_Microsoft_Word_template` and `Populate_a_Microsoft_Word_template_2`) to match the names Power Automate assigns to your two Populate actions. You can check these by clicking into each action and noting the name shown in the action header.

---

## Step 11: Condition - Check submissionType

- **+ New step** > **Condition**
- Value: `submissionType` (Dynamic content from trigger)
- Operator: **is equal to**
- Value: `New`

---

## Step 12a (If Yes - New): Create file in SharePoint

In the **If yes** branch:

- **Add an action** > search **Create file** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **Folder Path**: `/ContractDrafts`
- **File Name**: `varFileName` (Dynamic content from variables)
- **File Content**: `outputs('UnifiedDocumentOutput')` (Expression — the binary document from Step 10)

---

## Step 13a (If Yes - New): Create item in tracking list

Still in the **If yes** branch:

- **Add an action** > search **Create item** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **List Name**: `FreelancerContracts`

Map the fields:

| List Column | Value |
|---|---|
| Title | Expression: `concat('CTR-', formatDateTime(utcNow(), 'yyyyMMdd-HHmmss'))` |
| ContractorName | `varContractorName` |
| Agency | `agency` (trigger) |
| FreelancerEmail | `freelancerEmail` (trigger) |
| SubmitterEmail | `yourEmail` (trigger) |
| Status | `Draft` (type this text) |
| ContractDate | `contractDate` (trigger) |
| StartDate | `startDate` (trigger) |
| EndDate | `endDate` (trigger) |
| DayRate | `dayRate` (trigger) |
| HourlyRate | `hourlyRate` (trigger) |
| DraftFileUrl | Expression: `concat(body('Create_file')?['{Link}'], '?web=1')` |

> The `?web=1` at the end forces the link to open in Word Online.

---

## Step 14a (If Yes - New): Compose - Build Word Online URL

Still in **If yes** branch:

- **Add an action** > search **Compose**
- **Rename** the action to `Build_Draft_URL`
- **Inputs** (Expression):

```
concat(body('Create_file')?['{Link}'], '?web=1')
```

---

## Step 12b (If No - Revision): Get items from tracking list

In the **If no** branch:

- **Add an action** > search **Get items** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **List Name**: `FreelancerContracts`
- **Filter Query**:

```
FreelancerEmail eq '@{triggerBody()?['freelancerEmail']}' and Agency eq '@{triggerBody()?['agency']}' and Status ne 'Signed'
```

- **Order By**: `Created desc`
- **Top Count**: `1`

---

## Step 13b (If No - Revision): Update file in SharePoint

Still in the **If no** branch:

- **Add an action** > search **Update file** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **File Identifier**: Expression (gets the file path from the tracking list item):

```
first(body('Get_items')?['value'])?['DraftFileUrl']
```

> NOTE: If Update file doesn't work with URLs, use **Create file** instead (it overwrites if the filename matches). In that case use:
> - **Folder Path**: `/ContractDrafts`
> - **File Name**: Extract from the tracking list item or use `varFileName`

- **File Content**: `outputs('UnifiedDocumentOutput')` (Expression — the binary document from Step 10)

---

## Step 14b (If No - Revision): Update item in tracking list

Still in the **If no** branch:

- **Add an action** > search **Update item** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **List Name**: `FreelancerContracts`
- **Id** (Expression):

```
first(body('Get_items')?['value'])?['ID']
```

- **Status**: `Draft (Revised)`

---

## Step 14c (If No - Revision): Compose - Build Draft URL

Still in **If no** branch:

- **Add an action** > search **Compose**
- **Rename** to `Build_Revision_Draft_URL`
- **Inputs** (Expression):

```
first(body('Get_items')?['value'])?['DraftFileUrl']
```

---

## Step 15: Send email notification to Finance (AFTER the condition - both branches)

After the Step 11 Condition block (outside both branches):

- **+ New step** > search **Send an email (V2)** (Office 365 Outlook)
- **To**: `damien.crowley@webershandwick.com.au` (type this directly)
- **Subject** (Expression):

```
concat('Contract Draft for Review: ', variables('varContractorName'), ' - ', triggerBody()?['agency'])
```

- **Body** (switch to HTML/code view and paste):

```html
<p>Hi Damien,</p>
<p>A new freelancer contract draft has been generated and requires your review.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 6px 12px; font-weight: bold; background: #f5f5f5; border: 1px solid #ddd;">Contractor</td>
    <td style="padding: 6px 12px; border: 1px solid #ddd;">@{variables('varContractorName')}</td>
  </tr>
  <tr>
    <td style="padding: 6px 12px; font-weight: bold; background: #f5f5f5; border: 1px solid #ddd;">Agency</td>
    <td style="padding: 6px 12px; border: 1px solid #ddd;">@{triggerBody()?['agency']}</td>
  </tr>
  <tr>
    <td style="padding: 6px 12px; font-weight: bold; background: #f5f5f5; border: 1px solid #ddd;">Role</td>
    <td style="padding: 6px 12px; border: 1px solid #ddd;">@{triggerBody()?['rolePosition']}</td>
  </tr>
  <tr>
    <td style="padding: 6px 12px; font-weight: bold; background: #f5f5f5; border: 1px solid #ddd;">Start Date</td>
    <td style="padding: 6px 12px; border: 1px solid #ddd;">@{variables('varStartDateFormatted')}</td>
  </tr>
  <tr>
    <td style="padding: 6px 12px; font-weight: bold; background: #f5f5f5; border: 1px solid #ddd;">Submitted by</td>
    <td style="padding: 6px 12px; border: 1px solid #ddd;">@{triggerBody()?['yourEmail']}</td>
  </tr>
</table>
<p><strong>Next steps:</strong></p>
<ol>
  <li>Contact the submitter (<strong>@{triggerBody()?['yourEmail']}</strong>) for any clause modification instructions</li>
  <li>Click the link below to open the draft in Word Online and make required edits</li>
  <li>When finalised, update the Status to "Ready for Signing" in the <a href="https://lanskyenterprises.sharepoint.com/sites/JackMorton/Lists/FreelancerContracts">FreelancerContracts list</a></li>
</ol>
<p><a href="@{if(equals(triggerBody()?['submissionType'], 'New'), outputs('Build_Draft_URL'), outputs('Build_Revision_Draft_URL'))}" style="display: inline-block; padding: 10px 20px; background: #0078d4; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Open Contract Draft in Word Online</a></p>
<p style="color: #666; font-size: 12px;">This is an automated message from the Freelancer Contract system.</p>
```

---

## Step 16: Response (HTTP response back to the form)

- **+ New step** > search **Response**
- **Status Code**: `200`
- **Headers**:
  - `Content-Type`: `application/json`
- **Body** (Expression):

```
json(concat('{"status":"success","message":"Contract draft created successfully","draftUrl":"', if(equals(triggerBody()?['submissionType'], 'New'), outputs('Build_Draft_URL'), outputs('Build_Revision_Draft_URL')), '"}'))
```

---

## Step 17: Save and Test

1. Click **Save** in the top-right
2. Copy the **HTTP POST URL** from the trigger (it appears after saving)
3. Add this URL as a GitHub repository secret:
   - Go to your GitHub repo > **Settings** > **Secrets and variables** > **Actions**
   - Click **New repository secret**
   - Name: `POWER_AUTOMATE_URL`
   - Value: paste the HTTP POST URL
4. Also add it as an environment variable in your Azure Static Web App:
   - Azure Portal > your Static Web App > **Configuration** > **Application settings**
   - Add: `POWER_AUTOMATE_URL` = the HTTP POST URL

---

## Prerequisites

Before this flow will work, you need to create in SharePoint:

1. **Document Library: `ContractTemplates`** — upload both Word templates with Content Controls:
   - `ABN Contractor Agreement_Template_2024 - Company.docx`
   - `ABN Contractor Agreement_Template_2024 - Sole Trader.docx`
2. **Document Library: `ContractDrafts`** — empty, for generated drafts
3. **List: `FreelancerContracts`** — with columns:
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
