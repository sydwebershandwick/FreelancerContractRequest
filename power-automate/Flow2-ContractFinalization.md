# Flow 2: Contract Finalization (SharePoint Trigger)

This flow triggers when someone changes a contract's status to "Ready for Signing" in the FreelancerContracts tracking list. It converts the draft to PDF and sends it to Adobe Sign.

## Create the Flow

1. Go to **Power Automate** > **My flows** > **New flow** > **Automated cloud flow**
2. Name: `Freelancer Contract Finalization`
3. Trigger: **When an item is created or modified** (SharePoint connector)
4. Click **Create**

---

## Step 1: Configure the SharePoint Trigger

- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **List Name**: `FreelancerContracts`

---

## Step 2: Condition - Check if Status is "Ready for Signing"

- **+ New step** > **Condition**
- Value: `Status Value` (Dynamic content from trigger)
- Operator: **is equal to**
- Value: `Ready for Signing`

> All remaining steps go inside the **If yes** branch. Leave **If no** empty.

---

## Step 3: Get file content from ContractDrafts

Inside the **If yes** branch:

- **Add an action** > search **Get file content** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **File Identifier**: `DraftFileUrl` (Dynamic content from trigger)

> NOTE: If `DraftFileUrl` is a full URL and "Get file content" needs a server-relative path, use **Send an HTTP request to SharePoint** instead, or extract the path portion. Alternatively, store the file's server-relative path (e.g., `/sites/JackMorton/ContractDrafts/Contract_John_Smith_20260223.docx`) in the DraftFileUrl column.

---

## Step 4: Create file in OneDrive (for PDF conversion)

The PDF conversion connector works with OneDrive. We temporarily create the file there:

- **Add an action** > search **Create file** (OneDrive for Business connector)
- **Folder Path**: `/TempContracts` (create this folder in your OneDrive first)
- **File Name** (Expression):

```
concat(triggerBody()?['ContractorName'], '_Contract.docx')
```

- **File Content**: `File Content` (Dynamic content from "Get file content" step)

---

## Step 5: Convert file to PDF

- **Add an action** > search **Convert file** (OneDrive for Business connector)
- **File**: `Id` (Dynamic content from "Create file" — the OneDrive file ID)
- **Target type**: `PDF`

---

## Step 6: Create PDF file in SharePoint (ContractsFinal)

- **Add an action** > search **Create file** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **Folder Path**: `/ContractsFinal`
- **File Name** (Expression):

```
concat(triggerBody()?['ContractorName'], '_Contract_', formatDateTime(utcNow(), 'yyyyMMdd'), '.pdf')
```

- **File Content**: `File Content` (Dynamic content from "Convert file" step)

---

## Step 7: Delete temp file from OneDrive

- **Add an action** > search **Delete file** (OneDrive for Business connector)
- **File**: `Id` (Dynamic content from the "Create file" OneDrive step)

---

## Step 8: Send to Adobe Sign

- **Add an action** > search **Create an agreement and send for signing** (Adobe Acrobat Sign connector)

> NOTE: You'll need to connect to your Adobe Sign account the first time.

- **Agreement Name** (Expression):

```
concat('Freelancer Contract - ', triggerBody()?['ContractorName'], ' - ', triggerBody()?['Agency'])
```

- **Document**: `File Content` (Dynamic content from the SharePoint "Create file" step — the PDF)
- **Participant - Signer email**: `FreelancerEmail` (Dynamic content from trigger)
- **Participant - Role**: `SIGNER`
- **Message** (Expression):

```
concat('Please review and sign the attached freelancer contract for ', triggerBody()?['Agency'], '. If you have any questions, please contact ', triggerBody()?['SubmitterEmail'], '.')
```

---

## Step 9: Update tracking list item

- **Add an action** > search **Update item** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **List Name**: `FreelancerContracts`
- **Id**: `ID` (Dynamic content from trigger)

Map the fields:

| Field | Value |
|---|---|
| Status | `Sent for Signing` |
| FinalFileUrl | Expression: `body('Create_file_to_SharePoint')?['{Link}']` (adjust action name to match your "Create file" SharePoint step) |
| AdobeSignAgreementId | `agreementId` (Dynamic content from Adobe Sign step) |

> NOTE: You'll need to include all required fields from the trigger in the Update item action (Power Automate requires Title at minimum). Set Title to the existing `Title` value from the trigger.

---

## Step 10: Send notification email

- **Add an action** > search **Send an email (V2)** (Office 365 Outlook)
- **To**: `SubmitterEmail` (Dynamic content from trigger)
- **Subject** (Expression):

```
concat('Contract Sent for Signing: ', triggerBody()?['ContractorName'])
```

- **Body** (HTML):

```html
<p>Hi,</p>
<p>The freelancer contract for <strong>@{triggerBody()?['ContractorName']}</strong> has been sent to <strong>@{triggerBody()?['FreelancerEmail']}</strong> for e-signature via Adobe Sign.</p>
<p><strong>Details:</strong></p>
<ul>
  <li>Agency: @{triggerBody()?['Agency']}</li>
  <li>Contractor: @{triggerBody()?['ContractorName']}</li>
  <li>Sent to: @{triggerBody()?['FreelancerEmail']}</li>
</ul>
<p>You will be notified when the contract has been signed.</p>
<p style="color: #666; font-size: 12px;">This is an automated message from the Freelancer Contract system.</p>
```

---

## Step 11: Save

Click **Save**. This flow runs automatically whenever the Status column is changed to "Ready for Signing" in the FreelancerContracts list.

---

## Important Notes

1. **Trigger condition (optional optimization)**: To avoid the flow running on every list edit, add a trigger condition:
   - Click the trigger > **Settings** (three dots menu) > **Trigger Conditions**
   - Add: `@equals(triggerBody()?['Status']?['Value'], 'Ready for Signing')`
   - This prevents the flow from running (and using your flow run quota) on unrelated list edits.

2. **Adobe Sign connector**: This is a Premium connector. Ensure your Power Automate license supports it.

3. **OneDrive temp folder**: Create a `/TempContracts` folder in your OneDrive for Business before running this flow. The flow uses it temporarily for PDF conversion, then deletes the file.
