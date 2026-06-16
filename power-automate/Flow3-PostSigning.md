# Flow 3: Post-Signing (Adobe Sign Trigger)

This flow triggers when a freelancer completes signing via Adobe Sign. It saves the signed PDF and updates the tracking list.

## Create the Flow

1. Go to **Power Automate** > **My flows** > **New flow** > **Automated cloud flow**
2. Name: `Freelancer Contract Post-Signing`
3. Trigger: **When an agreement is completed** (Adobe Acrobat Sign connector)
4. Click **Create**

---

## Step 1: Configure the Adobe Sign Trigger

- Connect to your Adobe Sign account
- The trigger fires automatically when any agreement reaches "Completed" status

---

## Step 2: Get the signed document

- **+ New step** > search **Get document** or **Get agreement** (Adobe Acrobat Sign connector)
- **Agreement ID**: `agreementId` (Dynamic content from trigger)

> This retrieves the signed PDF document content.

---

## Step 3: Get items from tracking list (find matching contract)

- **+ New step** > search **Get items** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **List Name**: `FreelancerContracts`
- **Filter Query**:

```
AdobeSignAgreementId eq '@{triggerBody()?['agreementId']}'
```

- **Top Count**: `1`

---

## Step 4: Condition - Check if matching contract found

- **+ New step** > **Condition**
- Value (Expression): `length(body('Get_items')?['value'])`
- Operator: **is greater than**
- Value: `0`

> All remaining steps go inside the **If yes** branch.

---

## Step 5: Save signed PDF to SharePoint (overwrite in ContractsFinal)

Inside **If yes**:

- **Add an action** > search **Create file** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **Folder Path**: `/ContractsFinal`
- **File Name** (Expression):

```
concat(first(body('Get_items')?['value'])?['ContractorName'], '_Contract_SIGNED_', formatDateTime(utcNow(), 'yyyyMMdd'), '.pdf')
```

- **File Content**: Document content from "Get document" step

---

## Step 6: Update tracking list item

- **Add an action** > search **Update item** (SharePoint connector)
- **Site Address**: `https://lanskyenterprises.sharepoint.com/sites/JackMorton`
- **List Name**: `FreelancerContracts`
- **Id** (Expression):

```
first(body('Get_items')?['value'])?['ID']
```

Map the fields:

| Field | Value |
|---|---|
| Title | Expression: `first(body('Get_items')?['value'])?['Title']` |
| Status | `Signed` |
| FinalFileUrl | Expression: `body('Create_file')?['{Link}']` |

---

## Step 7: Send notification to submitter

- **Add an action** > search **Send an email (V2)** (Office 365 Outlook)
- **To** (Expression):

```
first(body('Get_items')?['value'])?['SubmitterEmail']
```

- **Subject** (Expression):

```
concat('Contract Signed: ', first(body('Get_items')?['value'])?['ContractorName'])
```

- **Body** (HTML):

```html
<p>Hi,</p>
<p>Great news! The freelancer contract for <strong>@{first(body('Get_items')?['value'])?['ContractorName']}</strong> has been signed.</p>
<p><a href="@{body('Create_file')?['{Link}']}" style="display: inline-block; padding: 10px 20px; background: #107c10; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Signed Contract</a></p>
<p>The signed copy has been saved to the ContractsFinal library in SharePoint.</p>
<p style="color: #666; font-size: 12px;">This is an automated message from the Freelancer Contract system.</p>
```

---

## Step 8: Send notification to freelancer

- **Add an action** > search **Send an email (V2)** (Office 365 Outlook)
- **To** (Expression):

```
first(body('Get_items')?['value'])?['FreelancerEmail']
```

- **Subject** (Expression):

```
concat('Your Signed Contract - ', first(body('Get_items')?['value'])?['Agency'])
```

- **Body** (HTML):

```html
<p>Hi @{first(body('Get_items')?['value'])?['ContractorName']},</p>
<p>Thank you for signing your freelancer contract with <strong>@{first(body('Get_items')?['value'])?['Agency']}</strong>.</p>
<p>A copy of the signed contract has been sent to you by Adobe Sign. If you have any questions, please contact @{first(body('Get_items')?['value'])?['SubmitterEmail']}.</p>
<p style="color: #666; font-size: 12px;">This is an automated message from the Freelancer Contract system.</p>
```

---

## Step 9: Send notification to Finance

- **Add an action** > search **Send an email (V2)** (Office 365 Outlook)
- **To**: `damien.crowley@webershandwick.com.au` (type this directly)
- **Subject** (Expression):

```
concat('Contract Signed: ', first(body('Get_items')?['value'])?['ContractorName'])
```

- **Body** (HTML):

```html
<p>Hi Damien,</p>
<p>The freelancer contract for <strong>@{first(body('Get_items')?['value'])?['ContractorName']}</strong> (<strong>@{first(body('Get_items')?['value'])?['Agency']}</strong>) has been signed.</p>
<p><a href="@{body('Create_file')?['{Link}']}" style="display: inline-block; padding: 10px 20px; background: #107c10; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Signed Contract</a></p>
<p>The signed copy has been saved to the ContractsFinal library in SharePoint.</p>
<p style="color: #666; font-size: 12px;">This is an automated message from the Freelancer Contract system.</p>
```

---

## Step 10: Save

Click **Save**. This flow runs automatically whenever a contract is signed in Adobe Sign.

---

## Important Notes

1. **Adobe Sign already sends a copy**: Adobe Sign automatically emails the signed PDF to all parties. This flow provides an additional notification with your custom branding and saves the signed copy to SharePoint for record-keeping.

2. **Agreement matching**: This flow matches contracts by `AdobeSignAgreementId`, which was stored in the tracking list by Flow 2. If the ID doesn't match, the flow silently does nothing (the "If no" branch is empty).
