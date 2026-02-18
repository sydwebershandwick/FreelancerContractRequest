# Claude Code Migration Guide: Azure Static Web Apps → Power Automate → SharePoint

## Project Overview

This guide helps Claude Code assist you in migrating your existing React document management form to use the Azure Static Web Apps → Power Automate → SharePoint architecture.

## Current State Analysis

Claude Code should first analyze your existing codebase:

```bash
# Examine the current project structure
find . -type f -name "*.jsx" -o -name "*.js" | grep -E "(components|services)" | head -20

# Check for existing SharePoint integration
grep -r "sharepoint\|_api\|SP\." --include="*.js" --include="*.jsx" .

# Analyze the current form component
cat app/src/components/DocumentForm.jsx

# Check current App.jsx for state management
cat app/src/App.jsx
```

## Migration Tasks

### Task 1: Create Power Automate Service

Create a new service to handle Power Automate communication:

```bash
# Create services directory if it doesn't exist
mkdir -p app/src/services

# Create the Power Automate service file
touch app/src/services/PowerAutomateService.js
```

Add this service class to handle all Power Automate communications:

```javascript
// app/src/services/PowerAutomateService.js
class PowerAutomateService {
  constructor() {
    // TODO: Replace with your actual Power Automate HTTP endpoint URL
    this.flowUrl = process.env.REACT_APP_POWER_AUTOMATE_URL || 
      'PASTE_YOUR_POWER_AUTOMATE_URL_HERE';
  }

  async callFlow(operation, listName, data) {
    try {
      const response = await fetch(this.flowUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          listName,
          data
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Flow call failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Power Automate error:', error);
      throw error;
    }
  }

  async createDocument(documentData) {
    return this.callFlow('create', 'Documents', {
      title: documentData.title,
      description: documentData.description,
      status: documentData.status
    });
  }

  async uploadDocument(file, metadata) {
    const base64Content = await this.fileToBase64(file);
    
    return this.callFlow('upload', 'Documents', {
      fileName: file.name,
      fileContent: base64Content,
      ...metadata
    });
  }

  async getDocuments() {
    return this.callFlow('read', 'Documents', {});
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}

export default PowerAutomateService;
```

### Task 2: Update App.jsx

Modify the main App component to use Power Automate:

```javascript
// Key changes to make in App.jsx:

// 1. Import the new service
import PowerAutomateService from './services/PowerAutomateService';

// 2. Initialize the service
const powerAutomate = new PowerAutomateService();

// 3. Update handleDocumentSubmit to use Power Automate
const handleDocumentSubmit = async (formData) => {
  setLoading(true);
  setError(null);
  
  try {
    if (formData.file) {
      await powerAutomate.uploadDocument(formData.file, {
        title: formData.title,
        description: formData.description,
        status: formData.status
      });
    } else {
      await powerAutomate.createDocument({
        title: formData.title,
        description: formData.description,
        status: formData.status
      });
    }
    
    // Reload documents
    await loadDocuments();
    
    // Show success message
    setSuccess('Document saved successfully!');
    
  } catch (err) {
    setError(`Failed to save: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

### Task 3: Add Environment Configuration

Create environment configuration files:

```bash
# Create .env file for local development
cat > app/.env << 'EOF'
REACT_APP_POWER_AUTOMATE_URL=YOUR_POWER_AUTOMATE_URL_HERE
EOF

# Add .env to .gitignore
echo ".env" >> app/.gitignore

# Create .env.example for documentation
cat > app/.env.example << 'EOF'
# Power Automate HTTP endpoint URL
REACT_APP_POWER_AUTOMATE_URL=https://prod-xx.westus.logic.azure.com/workflows/xxxxx
EOF
```

### Task 4: Update Package.json Scripts

Add helpful scripts for development and deployment:

```bash
# Update package.json with new scripts
cat > update-scripts.js << 'EOF'
const fs = require('fs');
const packageJson = require('./app/package.json');

packageJson.scripts = {
  ...packageJson.scripts,
  "start": "webpack serve --mode development --open",
  "build": "webpack --mode production",
  "build:azure": "npm run build && cp staticwebapp.config.json dist/",
  "test": "jest",
  "lint": "eslint src/**/*.{js,jsx}"
};

fs.writeFileSync('./app/package.json', JSON.stringify(packageJson, null, 2));
EOF

node update-scripts.js && rm update-scripts.js
```

### Task 5: Create Azure Static Web Apps Configuration

Create the configuration file for Azure Static Web Apps:

```bash
cat > app/staticwebapp.config.json << 'EOF'
{
  "globalHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "X-Frame-Options": "ALLOWALL",
    "Content-Security-Policy": "frame-ancestors *;"
  },
  "mimeTypes": {
    ".json": "application/json",
    ".js": "application/javascript",
    ".css": "text/css"
  },
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
EOF
```

### Task 6: Add Error Handling and Loading States

Create a reusable notification component:

```bash
cat > app/src/components/Notification.jsx << 'EOF'
import React from 'react';

const Notification = ({ type, message, onClose }) => {
  if (!message) return null;

  const styles = {
    success: {
      background: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    error: {
      background: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    },
    info: {
      background: '#d1ecf1',
      color: '#0c5460',
      border: '1px solid #bee5eb'
    }
  };

  return (
    <div style={{
      ...styles[type],
      padding: '12px 20px',
      borderRadius: '4px',
      marginBottom: '20px',
      position: 'relative'
    }}>
      {message}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Notification;
EOF
```

### Task 7: Test the Integration

Create a test script to verify Power Automate connection:

```bash
cat > app/test-power-automate.js << 'EOF'
// Test script to verify Power Automate connection
const POWER_AUTOMATE_URL = 'YOUR_POWER_AUTOMATE_URL_HERE';

async function testConnection() {
  console.log('Testing Power Automate connection...');
  
  try {
    const response = await fetch(POWER_AUTOMATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'read',
        listName: 'Documents',
        data: {}
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection successful!', data);
    } else {
      console.error('❌ Connection failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run with: node test-power-automate.js
testConnection();
EOF
```

## Power Automate Flow Setup

Claude Code should help you create this Power Automate flow structure:

```json
{
  "trigger": "When a HTTP request is received",
  "requestSchema": {
    "type": "object",
    "properties": {
      "operation": {
        "type": "string",
        "enum": ["create", "read", "upload", "update", "delete"]
      },
      "listName": { "type": "string" },
      "data": { "type": "object" }
    }
  },
  "actions": [
    {
      "type": "Switch",
      "expression": "@triggerBody()?['operation']",
      "cases": {
        "create": [
          {
            "type": "SharePoint - Create item",
            "inputs": {
              "site": "Your SharePoint Site",
              "list": "@triggerBody()?['listName']",
              "item": "@triggerBody()?['data']"
            }
          }
        ],
        "upload": [
          {
            "type": "SharePoint - Create file",
            "inputs": {
              "site": "Your SharePoint Site",
              "folderPath": "/Shared Documents",
              "fileName": "@triggerBody()?['data']?['fileName']",
              "fileContent": "@base64toBinary(triggerBody()?['data']?['fileContent'])"
            }
          }
        ]
      }
    },
    {
      "type": "Response",
      "inputs": {
        "statusCode": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "success": true,
          "data": "@outputs('Create_item')"
        }
      }
    }
  ]
}
```

## Deployment Checklist

Claude Code should verify these steps are completed:

```bash
# 1. Check all files are created
echo "Checking required files..."
[ -f app/src/services/PowerAutomateService.js ] && echo "✓ PowerAutomateService.js" || echo "✗ PowerAutomateService.js missing"
[ -f app/.env ] && echo "✓ .env file" || echo "✗ .env file missing"
[ -f app/staticwebapp.config.json ] && echo "✓ staticwebapp.config.json" || echo "✗ staticwebapp.config.json missing"

# 2. Check environment variable is set
grep -q "REACT_APP_POWER_AUTOMATE_URL=https://" app/.env && echo "✓ Power Automate URL configured" || echo "✗ Power Automate URL not configured"

# 3. Build the application
cd app && npm run build

# 4. Test locally
npm start
```

## GitHub Actions Workflow

Update the GitHub Actions workflow to include the environment variable:

```yaml
# .github/workflows/azure-static-web-apps.yml
- name: Build And Deploy
  id: builddeploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: "upload"
    app_location: "/app"
    output_location: "dist"
  env:
    REACT_APP_POWER_AUTOMATE_URL: ${{ secrets.POWER_AUTOMATE_URL }}
```

## Testing Commands

Claude Code can use these commands to help test the integration:

```bash
# Test the Power Automate connection
node app/test-power-automate.js

# Run the app locally
cd app && npm start

# Build for production
npm run build:azure

# Check for any SharePoint-specific code that needs updating
grep -r "SP\.\|_spPageContextInfo\|sharepoint" app/src/
```

## Common Issues and Solutions

1. **CORS errors**: Should not occur with Power Automate
2. **401 Unauthorized**: Check Power Automate permissions
3. **File size limits**: Power Automate has a 100MB limit
4. **Rate limiting**: Power Automate allows 6000 runs per month

## Success Criteria

The migration is complete when:
- [ ] React app successfully calls Power Automate
- [ ] Documents are created in SharePoint list
- [ ] File uploads work correctly
- [ ] App works in SharePoint iframe
- [ ] No CORS or authentication errors

## Notes for Claude Code

When helping with this migration:
1. Always check existing code structure first
2. Preserve existing functionality while adding new integration
3. Test each step before proceeding
4. Keep error messages user-friendly
5. Ensure all environment variables are properly configured