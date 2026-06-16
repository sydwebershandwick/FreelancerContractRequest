// Main entry point that loads all Azure Functions
// This file is referenced by package.json main field

// Import all function files to register them
require('./submit.js');
require('./config.js');
require('./extract-document.js');
require('./health.js');
require('./abn-lookup.js');

// All functions are registered via their app.http() calls when imported