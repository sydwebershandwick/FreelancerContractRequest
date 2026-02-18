# SharePoint 2013 Job-Invoice One-to-Many Relationship Guide

## Overview
This guide provides SharePoint 2013-compatible solutions for displaying the one-to-many relationship between Jobs and Invoices.

## Current Setup
- **Job Sold List**: Contains job records (one per job)
- **Invoice Schedule List**: Contains invoice items (multiple per job)
- **Link**: JobNumberLookup field connects invoices to jobs

## Solution 1: Filtered Views with Direct Links (Recommended)

### Step 1: Create Filtered View for Invoices
1. Go to **Invoice Schedule List** → **List Settings**
2. Under **Views**, click **Create View**
3. Configure:
   - **View Name**: `InvoicesByJob`
   - **Columns**: Select JobNumber, Description, InvoiceDate, Amount
   - **Filter**: Show items only when JobNumberLookup is not equal to [blank]
   - **Group By**: First group by JobNumberLookup
   - **Sort**: Then sort by InvoiceDate (ascending)

### Step 2: Add "View Invoices" Link to Job List
1. Go to **Job Sold List** → **List Settings**
2. Click **Create column**
3. Configure:
   - **Column name**: `ViewInvoices`
   - **Type**: Calculated (calculation based on other columns)
   - **Formula**: 
   ```
   ="<a href='/sites/[YourSite]/Lists/InvoiceSchedule/InvoicesByJob.aspx?FilterField1=JobNumberLookup&FilterValue1="&[ID]&"' target='_blank'>View All Invoices</a>"
   ```
   - **Return type**: Number
   - Replace `[YourSite]` with your actual site name

### Step 3: Modify Job List View
1. Edit the default view of Job Sold List
2. Add the ViewInvoices column
3. Users can now click "View All Invoices" to see filtered results

## Solution 2: Custom Page with Connected Web Parts

### Step 1: Create a New Page
1. Site Contents → Add a page
2. Name it "Job Details with Invoices"

### Step 2: Add Connected Web Parts
1. Add **Job Sold List** web part (filtered to single item)
2. Add **Invoice Schedule List** web part below
3. Edit web part properties → Connections → Get Filter Values From → Job Sold List
4. Connect JobNumberLookup to ID field

## Solution 3: JavaScript Enhancement (Advanced)

### For Job Detail Form (DispForm.aspx)
Add this script via Script Editor:

```html
<div id="relatedInvoices">
    <h3>Related Invoices</h3>
    <div id="invoiceList">Loading...</div>
</div>

<script type="text/javascript">
function loadRelatedInvoices() {
    var jobId = GetUrlKeyValue('ID');
    var listUrl = _spPageContextInfo.webAbsoluteUrl + 
                  "/_api/web/lists/getbytitle('Invoice%20Schedule%20List')/items?" +
                  "$select=JobNumber,Description,InvoiceDate,Amount&" +
                  "$filter=JobNumberLookup eq " + jobId;
    
    $.ajax({
        url: listUrl,
        method: "GET",
        headers: { "Accept": "application/json; odata=verbose" },
        success: function(data) {
            var html = '<table class="ms-listviewtable">';
            html += '<tr><th>Invoice</th><th>Description</th><th>Date</th><th>Amount</th></tr>';
            
            $.each(data.d.results, function(i, item) {
                html += '<tr>';
                html += '<td>' + item.JobNumber + '</td>';
                html += '<td>' + item.Description + '</td>';
                html += '<td>' + new Date(item.InvoiceDate).toLocaleDateString() + '</td>';
                html += '<td>$' + item.Amount + '</td>';
                html += '</tr>';
            });
            
            html += '</table>';
            if(data.d.results.length === 0) {
                html = '<p>No invoices found for this job.</p>';
            }
            
            $('#invoiceList').html(html);
        },
        error: function() {
            $('#invoiceList').html('<p>Error loading invoices.</p>');
        }
    });
}

// Load when page is ready
_spBodyOnLoadFunctionNames.push("loadRelatedInvoices");
</script>
```

## Solution 4: Search-Driven Solution

1. Configure Search to crawl both lists
2. Create Result Source filtered to Invoice Schedule List
3. Use Search Results web part with query: `JobNumberLookup:{Page.ID}`
4. Display on job detail pages

## Testing the Relationship

1. Create a job in Job Sold List
2. Note the job ID
3. Create multiple invoices linked to that job
4. Verify:
   - From Job: Can see all related invoices
   - From Invoice: Can navigate to parent job
   - Filtered views show correct grouping

## Benefits of Each Approach

- **Solution 1**: Simple, no coding, works everywhere
- **Solution 2**: Visual connection, good for dashboards
- **Solution 3**: Most flexible, custom formatting
- **Solution 4**: Scales well, works across site collections

## Important Notes for SharePoint 2013

1. Avoid modern web parts (not available)
2. Use classic experience features only
3. Test in Internet Explorer for best compatibility
4. Consider performance with large lists (>5000 items)

## Troubleshooting

**Issue**: Calculated column shows HTML as text
- **Fix**: Change return type to Number
- **Alternative**: Use JavaScript to render links

**Issue**: Filtered view URL is too long
- **Fix**: Use POST requests in custom JavaScript
- **Alternative**: Create multiple views for common filters

**Issue**: Related items don't show
- **Fix**: Check permissions on both lists
- **Fix**: Verify JobNumberLookup has correct values

This approach maintains the one-to-many relationship while working within SharePoint 2013's limitations.