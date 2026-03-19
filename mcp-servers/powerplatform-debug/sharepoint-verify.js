#!/usr/bin/env node

/**
 * SharePoint Data Verification Script
 *
 * This script helps verify that barcode values exist in SharePoint lists.
 * It uses the Microsoft Graph API for querying SharePoint.
 *
 * Prerequisites:
 * 1. Azure AD App Registration with SharePoint permissions
 * 2. Client ID, Client Secret, and Tenant ID
 *
 * Usage:
 *   node sharepoint-verify.js <barcode-value>
 *
 * Environment Variables:
 *   AZURE_CLIENT_ID     - Azure AD App Client ID
 *   AZURE_CLIENT_SECRET - Azure AD App Client Secret
 *   AZURE_TENANT_ID     - Azure AD Tenant ID
 *   SHAREPOINT_SITE_ID  - SharePoint Site ID (from Graph API)
 */

const https = require('https');

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID;

// SharePoint list IDs from the app DataSources.json
const LIST_IDS = {
  'FY26 Cut Sheets': '20427f36-04a8-4682-9569-9d9a734e30ce',
  'FY26 Cut Sheets Part 2': '46c4cde0-9277-483e-b7df-de694345447d'
};

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    }).toString();

    const options = {
      hostname: 'login.microsoftonline.com',
      path: `/${TENANT_ID}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error(`Token error: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function querySharePointList(accessToken, listId, barcodeValue) {
  return new Promise((resolve, reject) => {
    // URL encode the barcode value
    const encodedValue = encodeURIComponent(barcodeValue);

    // Filter on the Legacy Asset Tag column (URL-encoded internal name)
    const filter = `fields/Legacy_x0020_Asset_x0020_Tag eq '${encodedValue}'`;

    const options = {
      hostname: 'graph.microsoft.com',
      path: `/v1.0/sites/${SHAREPOINT_SITE_ID}/lists/${listId}/items?$filter=${encodeURIComponent(filter)}&$expand=fields`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verifyBarcode(barcodeValue) {
  console.log(`\n=== SharePoint Verification for: "${barcodeValue}" ===\n`);

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SHAREPOINT_SITE_ID) {
    console.log('Missing required environment variables.');
    console.log('Required: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SHAREPOINT_SITE_ID');
    console.log('\nTo set up:');
    console.log('1. Create an Azure AD App Registration');
    console.log('2. Grant Sites.Read.All or Sites.ReadWrite.All permissions');
    console.log('3. Create a client secret');
    console.log('4. Get the SharePoint Site ID via Graph API:');
    console.log('   GET https://graph.microsoft.com/v1.0/sites/encoretch.sharepoint.com:/sites/CCHMCRefreshSupport');
    return;
  }

  try {
    console.log('Getting access token...');
    const token = await getAccessToken();
    console.log('Token acquired.\n');

    for (const [listName, listId] of Object.entries(LIST_IDS)) {
      console.log(`Searching "${listName}"...`);
      const result = await querySharePointList(token, listId, barcodeValue);

      if (result.error) {
        console.log(`  Error: ${result.error.message}`);
      } else if (result.value && result.value.length > 0) {
        console.log(`  FOUND ${result.value.length} record(s)!`);
        result.value.forEach((item, i) => {
          console.log(`  Record ${i + 1}:`, JSON.stringify(item.fields, null, 2));
        });
      } else {
        console.log('  No records found.');
      }
      console.log();
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Main
const barcodeValue = process.argv[2];
if (!barcodeValue) {
  console.log('Usage: node sharepoint-verify.js <barcode-value>');
  console.log('\nThis script queries SharePoint to verify if a barcode exists in the FY26 Cut Sheets lists.');
  process.exit(1);
}

verifyBarcode(barcodeValue);
