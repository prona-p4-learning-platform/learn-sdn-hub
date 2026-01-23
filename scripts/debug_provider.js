// Minimal debug to see what credentials are being used
const fs = require('fs');
const path = require('path');

const providerPath = path.join(__dirname, '../backend/src/providers/ContainerlabProvider.ts');
const code = fs.readFileSync(providerPath, 'utf8');

// Find the CLAB_USERNAME and CLAB_PASSWORD usage
console.log("=== Checking Provider Code ===");

// Look for where credentials are read
const usernameLine = code.match(/this\.clab_username\s*=/);
const passwordLine = code.match(/this\.clab_password\s*=/);

console.log("Username assignment found:", usernameLine ? "YES" : "NO");
console.log("Password assignment found:", passwordLine ? "YES" : "NO");

// Look for environment variable usage
const envUsername = code.match(/CLAB_USERNAME/);
const envPassword = code.match(/CLAB_PASSWORD/);

console.log("CLAB_USERNAME referenced:", envUsername ? "YES" : "NO");
console.log("CLAB_PASSWORD referenced:", envPassword ? "YES" : "NO");

// Check constructor
const constructorStart = code.indexOf('constructor()');
if (constructorStart !== -1) {
  const constructorEnd = code.indexOf('}', constructorStart);
  const constructorCode = code.substring(constructorStart, constructorEnd);
  console.log("\nConstructor code (first 500 chars):");
  console.log(constructorCode.substring(0, 500));
}
