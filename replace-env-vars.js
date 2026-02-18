#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace environment variables in built files
function replaceEnvVars() {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    
    if (!fs.existsSync(indexPath)) {
        console.log('dist/index.html not found - run build first');
        return;
    }
    
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Replace token placeholder with environment variable
    const token = process.env.FORM_AUTH_TOKEN || '';
    content = content.replace('{{FORM_AUTH_TOKEN}}', token);
    
    fs.writeFileSync(indexPath, content);
    console.log('Environment variables injected into dist/index.html');
    
    if (!token) {
        console.warn('WARNING: FORM_AUTH_TOKEN not set - form will not work');
    }
}

replaceEnvVars();