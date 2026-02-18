import requests
import json
from datetime import datetime

url = "https://prod-62.australiasoutheast.logic.azure.com:443/workflows/0b470fb6b12c4059884ab7d34dd4f52c/triggers/manual/paths/invoke?api-version=2016-06-01"

headers = {
    "Content-Type": "application/json"
}

test_data = {
    "CustomerName": "Test Customer - " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "ProjectTitle": "Test Project from API",
    "ProjectType": "Development",
    "Status": "Active",
    "Priority": "High",
    "StartDate": datetime.now().strftime("%Y-%m-%d"),
    "EndDate": "2025-08-15",
    "Budget": 50000,
    "Description": "This is a test project created via Power Automate API"
}

print("Sending test request to Power Automate...")
print(f"URL: {url}")
print(f"Data: {json.dumps(test_data, indent=2)}")

try:
    response = requests.post(url, headers=headers, json=test_data)
    
    print(f"\nResponse Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS: Flow executed successfully!")
        try:
            response_data = response.json()
            print(f"Response Body: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response Body (text): {response.text}")
    else:
        print(f"\n❌ ERROR: Flow returned status code {response.status_code}")
        print(f"Response Body: {response.text}")
        
except Exception as e:
    print(f"\n❌ ERROR: Failed to send request - {str(e)}")