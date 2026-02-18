#!/bin/bash

URL="https://prod-62.australiasoutheast.logic.azure.com:443/workflows/0b470fb6b12c4059884ab7d34dd4f52c/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=eOA9cZO2NMiXdlxUhGAVKKEeVfQNCfZjwIBOEOZDZZU"

CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_DATETIME=$(date +"%Y-%m-%d %H:%M:%S")

JSON_DATA=$(cat <<EOF
{
    "jobNumber": "JOB-2025-TEST-002",
    "purchaseOrderNumber": "PO-TEST",
    "purchaseOrderAmount": 50000,
    "purchaseOrderFileName": "test_purchase_order2.pdf",
    "purchaseOrderFileSize": 1024000,
    "purchaseOrderFileType": "application/pdf",
    "purchaseOrderFileContent": "JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovT3V0bGluZXMgMiAwIFIKL1BhZ2VzIDMgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9PdXRsaW5lcwovQ291bnQgMAo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDkgMCBSIAo+PgovUHJvY1NldCA4IDAgUgo+PgovTWVkaWFCb3ggWzAgMCA2MTIuMDAwMCA3OTIuMDAwMF0KL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggMTc0ID4+CnN0cmVhbQoyIEoKQlQKMCAwIDAgcmcKL0YxIDAuMDI3IFRmCjcyLjAwMCA3MTIuMDAgVGQKKCBTaW1wbGUgUERGIEZpbGUgMiApIFRqCkVUCkJUCi9GMSAwLjAxMCBUZgo2OS4yNSA2ODguMCBUZAooIC4uLmNvbnRpbnVlZCBmcm9tIHBhZ2UgMS4gRW5kIG9mIGRvY3VtZW50LikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMyAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgOSAwIFIgCj4+Ci9Qcm9jU2V0IDggMCBSCj4+Ci9NZWRpYUJveCBbMCAwIDYxMi4wMDAwIDc5Mi4wMDAwXQovQ29udGVudHMgNyAwIFIKPj4KZW5kb2JqCjcgMCBvYmoKPDwgL0xlbmd0aCA2NzYgPj4Kc3RyZWFtCjIgSgpCVAowIDAgMCByZwovRjEgMC4wMjcgVGYKNzIuMDAgNzEyLjAgVGQKKCBBIFNpbXBsZSBQREYgRmlsZSApIFRqCkVUCkJUCi9GMSAwLjAxMCBUZgo2OS4yNSA2NjQuMCBUZAooIFRoaXMgaXMgYSBzYW1wbGUgUERGIGRvY3VtZW50LiApIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKOCAwIG9iagpbL1BERiAvVGV4dCBdCmVuZG9iago5IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovTmFtZSAvRjEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA3NCAwMDAwMCBuIAowMDAwMDAwMTIwIDAwMDAwIG4gCjAwMDAwMDAxNzkgMDAwMDAgbiAKMDAwMDAwMDM2NCAwMDAwMCBuIAowMDAwMDAwNTg4IDAwMDAwIG4gCjAwMDAwMDA3NzMgMDAwMDAgbiAKMDAwMDAwMTM5NyAwMDAwMCBuIAowMDAwMDAxNDI3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgMTAKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE1NDUKJSVFT0YK",
    "invoiceSchedule": [
        {
            "date": "2025-08-01",
            "description": "Initial payment - 50%",
            "amount": 25000
        },
        {
            "date": "2025-09-01",
            "description": "Final payment - 50%",
            "amount": 25000
        }
    ],
    "invoiceTotal": 50000,
    "submittedAt": "$CURRENT_DATETIME"
}
EOF
)

echo "Testing Power Automate Flow..."
echo "URL: $URL"
echo "Request Body:"
echo "$JSON_DATA"

echo -e "\nSending request..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$JSON_DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "\nResponse Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" -eq "200" ]; then
    echo -e "✅ SUCCESS: Flow executed successfully!\n"
    echo "Response Body:"
    echo "$BODY"
else
    echo -e "❌ ERROR: Flow returned status code $HTTP_CODE\n"
    echo "Response Body:"
    echo "$BODY"
fi