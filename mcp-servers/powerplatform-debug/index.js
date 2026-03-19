#!/usr/bin/env node

/**
 * Power Platform Debug MCP Server
 *
 * Provides tools for:
 * 1. Running pac CLI commands (canvas app operations, Power Fx REPL)
 * 2. Analyzing app source code for formula issues
 * 3. Verifying SharePoint data for debugging match logic
 * 4. Parsing Power Apps Monitor session exports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

// Configuration from environment
const DOTNET_ROOT = process.env.DOTNET_ROOT || '/opt/homebrew/Cellar/dotnet/10.0.105/libexec';
const PAC_PATH = process.env.PAC_PATH || `${process.env.HOME}/.dotnet/tools/pac`;
const APP_DEBUG_DIR = process.env.APP_DEBUG_DIR || '/Volumes/bingobango/code/scanToCutsheets/app-debug';
const SHAREPOINT_SITE = process.env.SHAREPOINT_SITE || 'https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport';

// Tool definitions
const tools = [
  {
    name: 'pac_command',
    description: 'Execute a Power Platform CLI (pac) command. Use for canvas app operations, environment info, Power Fx evaluation, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The pac subcommand and arguments (e.g., "canvas list", "env who", "power-fx repl")'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000
        }
      },
      required: ['command']
    }
  },
  {
    name: 'analyze_app_formulas',
    description: 'Analyze Power Apps formulas from the extracted app source. Finds OnScan, OnSelect, and other behavior formulas to identify potential issues.',
    inputSchema: {
      type: 'object',
      properties: {
        controlName: {
          type: 'string',
          description: 'Optional: specific control name to analyze (e.g., "brcScanner")'
        },
        formulaType: {
          type: 'string',
          description: 'Optional: type of formula to find (e.g., "OnScan", "OnSelect", "Visible")'
        }
      }
    }
  },
  {
    name: 'search_app_source',
    description: 'Search the extracted app source code for specific patterns, variable names, or formula fragments.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Text or regex pattern to search for in app source'
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Whether search is case-sensitive (default: false)',
          default: false
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'get_datasource_info',
    description: 'Get information about SharePoint data sources configured in the app, including list names and column mappings.',
    inputSchema: {
      type: 'object',
      properties: {
        datasourceName: {
          type: 'string',
          description: 'Optional: specific data source name (e.g., "FY26 Cut Sheets")'
        }
      }
    }
  },
  {
    name: 'list_app_variables',
    description: 'Extract all variable references (Set, UpdateContext, Collect) from the app to understand app state.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'validate_lookup_formula',
    description: 'Validate and explain a LookUp formula, checking for potential issues like column name mismatches or type coercion problems.',
    inputSchema: {
      type: 'object',
      properties: {
        formula: {
          type: 'string',
          description: 'The LookUp formula to analyze'
        }
      },
      required: ['formula']
    }
  },
  {
    name: 'simulate_scan_logic',
    description: 'Trace through the OnScan logic with a hypothetical barcode value to understand what should happen.',
    inputSchema: {
      type: 'object',
      properties: {
        barcodeValue: {
          type: 'string',
          description: 'The barcode value to simulate scanning'
        }
      },
      required: ['barcodeValue']
    }
  },
  {
    name: 'parse_monitor_export',
    description: 'Parse a Power Apps Monitor session export (JSON or CSV) to analyze runtime events, errors, and data operations.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the Monitor export file'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'get_app_check_results',
    description: 'Get the App Checker (SARIF) results showing any static analysis warnings or errors in the app.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'explain_visibility_logic',
    description: 'Analyze the visibility conditions for success/failure UI elements to understand when each should show.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Helper: Execute pac command
async function executePac(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, DOTNET_ROOT };
    const proc = spawn(PAC_PATH, args.split(' '), { env, timeout });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        resolve(`Exit code: ${code}\nStdout: ${stdout}\nStderr: ${stderr}`);
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to execute pac: ${err.message}`));
    });
  });
}

// Helper: Read app source files
function readAppSource() {
  const sources = {};
  const files = readdirSync(APP_DEBUG_DIR);

  for (const file of files) {
    const filePath = join(APP_DEBUG_DIR, file);
    try {
      if (file.endsWith('.yaml') || file.endsWith('.json') || file.endsWith('.sarif')) {
        sources[file] = readFileSync(filePath, 'utf8');
      }
    } catch (e) {
      // Handle files with backslashes in names (from Windows extraction)
      if (file.includes('\\')) {
        try {
          sources[file] = readFileSync(filePath, 'utf8');
        } catch (e2) {
          // Skip unreadable files
        }
      }
    }
  }

  return sources;
}

// Helper: Find all files recursively, handling weird filenames
function getAllSourceContent() {
  let content = '';
  const files = readdirSync(APP_DEBUG_DIR);

  for (const file of files) {
    const filePath = join(APP_DEBUG_DIR, file);
    try {
      const data = readFileSync(filePath, 'utf8');
      content += `\n=== ${file} ===\n${data}\n`;
    } catch (e) {
      // Skip directories and unreadable files
    }
  }

  return content;
}

// Tool implementations
async function handlePacCommand(args) {
  const { command, timeout = 30000 } = args;
  try {
    const result = await executePac(command, timeout);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
}

function handleAnalyzeFormulas(args) {
  const { controlName, formulaType } = args;
  const content = getAllSourceContent();

  // Extract formulas from YAML source
  const yamlMatch = content.match(/Src\\Screen1\.pa\.yaml[\s\S]*?(?===|$)/);
  if (!yamlMatch) {
    return { content: [{ type: 'text', text: 'Could not find Screen1 source file' }] };
  }

  const screenSource = yamlMatch[0];
  let analysis = '# Formula Analysis\n\n';

  // Find OnScan formula
  const onScanMatch = screenSource.match(/OnScan:\s*["']?=?([\s\S]*?)["']?\s*\n\s+\w+:/);
  if (onScanMatch) {
    analysis += '## OnScan Formula\n```\n' + onScanMatch[1].replace(/\\n/g, '\n').trim() + '\n```\n\n';
  }

  // Parse the formula logic
  analysis += '## Logic Breakdown\n\n';
  analysis += '1. **Set(varScannedValue, ...)** - Captures the scanned barcode\n';
  analysis += '2. **Set(varIsSearching, true)** - Shows loading state\n';
  analysis += '3. **Set(varShowResult, false)** - Hides previous result\n';
  analysis += '4. **Set(varMatchRecord, Coalesce(LookUp(...), LookUp(...)))** - Searches both SharePoint lists\n';
  analysis += '5. **Set(varMatchFound, !IsBlank(varMatchRecord))** - Determines if match exists\n';
  analysis += '6. **Set(varIsSearching, false); Set(varShowResult, true)** - Shows result\n\n';

  // Find visibility formulas
  const successVisible = screenSource.match(/circleSuccess[\s\S]*?Visible:\s*=([^\n]+)/);
  const failureVisible = screenSource.match(/circleFailure[\s\S]*?Visible:\s*=([^\n]+)/);

  analysis += '## Visibility Logic\n\n';
  if (successVisible) {
    analysis += `- **Green Circle (Success)**: \`${successVisible[1].trim()}\`\n`;
  }
  if (failureVisible) {
    analysis += `- **Red Circle (Failure)**: \`${failureVisible[1].trim()}\`\n`;
  }

  analysis += '\n## Potential Issues\n\n';
  analysis += '1. **Visibility Logic Inverted?** - Check if "Success" (green checkmark) shows when `!varMatchFound` (no match found)\n';
  analysis += '2. **Column Name Mismatch** - Verify "Legacy Asset Tag" column exists in both SharePoint lists\n';
  analysis += '3. **Data Type Mismatch** - Barcode scanner returns string; SharePoint column must also be text\n';
  analysis += '4. **Delegation Warning** - LookUp with string comparison may have delegation limits\n';

  return { content: [{ type: 'text', text: analysis }] };
}

function handleSearchSource(args) {
  const { pattern, caseSensitive = false } = args;
  const content = getAllSourceContent();

  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(`.{0,50}${pattern}.{0,50}`, flags);
  const matches = content.match(regex) || [];

  let result = `# Search Results for "${pattern}"\n\n`;
  result += `Found ${matches.length} matches:\n\n`;

  matches.slice(0, 20).forEach((match, i) => {
    result += `${i + 1}. ...${match.replace(/\n/g, ' ').trim()}...\n`;
  });

  if (matches.length > 20) {
    result += `\n... and ${matches.length - 20} more matches`;
  }

  return { content: [{ type: 'text', text: result }] };
}

function handleGetDatasourceInfo(args) {
  const { datasourceName } = args;
  const content = getAllSourceContent();

  // Find DataSources.json content
  const dsMatch = content.match(/DataSources\.json[\s\S]*?(?===|$)/);
  if (!dsMatch) {
    return { content: [{ type: 'text', text: 'Could not find DataSources.json' }] };
  }

  let result = '# Data Source Information\n\n';

  // Extract key info about each data source
  const sources = ['FY26 Cut Sheets', 'FY26 Cut Sheets Part 2'];

  for (const source of sources) {
    if (datasourceName && source !== datasourceName) continue;

    result += `## ${source}\n\n`;
    result += `- **SharePoint Site**: ${SHAREPOINT_SITE}\n`;
    result += `- **Type**: SharePoint List (ConnectedDataSourceInfo)\n`;
    result += `- **Writable**: Yes\n\n`;

    // Find column mappings
    const mappingMatch = dsMatch[0].match(new RegExp(`${source.replace(/\s/g, '\\s')}[\\s\\S]*?ConnectedDataSourceInfoNameMapping[\\s\\S]*?\\{([\\s\\S]*?)\\}`, 'i'));
    if (mappingMatch) {
      result += '### Column Mappings (Internal -> Display)\n\n';
      const mappings = mappingMatch[1].match(/"([^"]+)":\s*"([^"]+)"/g) || [];
      mappings.slice(0, 15).forEach(m => {
        const [internal, display] = m.split(':').map(s => s.replace(/"/g, '').trim());
        result += `- \`${internal}\` -> "${display}"\n`;
      });
      result += '\n';
    }
  }

  result += '### Key Column for Lookup\n\n';
  result += '- **Display Name**: "Legacy Asset Tag"\n';
  result += '- **Internal Name**: Likely `Legacy_x0020_Asset_x0020_Tag` or similar\n';
  result += '- **Used In**: `LookUp(..., \'Legacy Asset Tag\' = First(brcScanner.Barcodes).Value)`\n';

  return { content: [{ type: 'text', text: result }] };
}

function handleListVariables(args) {
  const content = getAllSourceContent();

  let result = '# App Variables\n\n';

  // Find Set() calls
  const setMatches = content.match(/Set\s*\(\s*(\w+)/g) || [];
  const variables = [...new Set(setMatches.map(m => m.match(/Set\s*\(\s*(\w+)/)[1]))];

  result += '## Global Variables (Set)\n\n';
  variables.forEach(v => {
    result += `- **${v}**\n`;
  });

  result += '\n## Variable Usage in OnScan\n\n';
  result += '| Variable | Type | Purpose |\n';
  result += '|----------|------|----------|\n';
  result += '| varScannedValue | Text | The scanned barcode value |\n';
  result += '| varIsSearching | Boolean | Loading state indicator |\n';
  result += '| varShowResult | Boolean | Whether to show result UI |\n';
  result += '| varMatchRecord | Record | The matched SharePoint record (or blank) |\n';
  result += '| varMatchFound | Boolean | True if match was found in either list |\n';

  result += '\n## Critical Logic\n\n';
  result += '```\n';
  result += 'varMatchFound = !IsBlank(varMatchRecord)\n';
  result += '\n';
  result += 'When varMatchFound = true:\n';
  result += '  - RED X should show (asset already has cut sheet)\n';
  result += '  - circleFailure.Visible = varShowResult && varMatchFound\n';
  result += '\n';
  result += 'When varMatchFound = false:\n';
  result += '  - GREEN checkmark should show (needs cut sheet)\n';
  result += '  - circleSuccess.Visible = varShowResult && !varMatchFound\n';
  result += '```\n';

  return { content: [{ type: 'text', text: result }] };
}

function handleValidateLookup(args) {
  const { formula } = args;

  let result = '# LookUp Formula Analysis\n\n';
  result += '## Formula\n```\n' + formula + '\n```\n\n';

  result += '## Potential Issues\n\n';

  // Check for common issues
  if (formula.includes("'") && formula.includes(' ')) {
    result += '1. **Column Name with Spaces**: Using single quotes for column name with spaces is correct\n';
  }

  if (formula.includes('=')) {
    result += '2. **Equality Check**: Using `=` for comparison (case-insensitive in Power Fx)\n';
    result += '   - This is usually fine, but verify data types match\n';
  }

  if (formula.includes('First(') && formula.includes('.Value')) {
    result += '3. **Barcode Value Extraction**: Using `First(...).Value` to get barcode\n';
    result += '   - Verify the barcode scanner returns data in expected format\n';
  }

  result += '\n## Delegation Considerations\n\n';
  result += '- LookUp with text equality is delegable to SharePoint\n';
  result += '- However, ensure the list has fewer than 2000 items (default limit)\n';
  result += '- Or enable delegation to 2000+ items in app settings\n';

  result += '\n## Data Type Check\n\n';
  result += '- **Barcode Scanner Output**: String (text)\n';
  result += '- **SharePoint Column**: Must be Single line of text\n';
  result += '- If column is Number type, comparison will fail silently\n';

  return { content: [{ type: 'text', text: result }] };
}

function handleSimulateScan(args) {
  const { barcodeValue } = args;

  let result = `# Scan Simulation: "${barcodeValue}"\n\n`;

  result += '## Step-by-Step Execution\n\n';
  result += '```\n';
  result += `1. Barcode scanned: "${barcodeValue}"\n`;
  result += `2. Set(varScannedValue, "${barcodeValue}")\n`;
  result += '3. Set(varIsSearching, true)  // Show "Searching..." label\n';
  result += '4. Set(varShowResult, false)  // Hide previous result\n';
  result += '\n';
  result += '5. SharePoint Lookup:\n';
  result += `   - Query "FY26 Cut Sheets" WHERE [Legacy Asset Tag] = "${barcodeValue}"\n`;
  result += `   - If not found, query "FY26 Cut Sheets Part 2" WHERE [Legacy Asset Tag] = "${barcodeValue}"\n`;
  result += '\n';
  result += '6. Set(varMatchRecord, <result from Coalesce>)\n';
  result += '\n';
  result += '7. Set(varMatchFound, !IsBlank(varMatchRecord))\n';
  result += '   - If record found: varMatchFound = true\n';
  result += '   - If no record: varMatchFound = false\n';
  result += '\n';
  result += '8. Set(varIsSearching, false)\n';
  result += '9. Set(varShowResult, true)\n';
  result += '```\n\n';

  result += '## Expected UI State\n\n';
  result += '| Condition | varMatchFound | UI Should Show |\n';
  result += '|-----------|---------------|----------------|\n';
  result += '| Barcode found in SharePoint | `true` | RED X (Already has cut sheet) |\n';
  result += '| Barcode NOT in SharePoint | `false` | GREEN Check (Needs cut sheet) |\n';

  result += '\n## Debugging Steps\n\n';
  result += '1. **Check debugLbl**: The app has a debug label showing:\n';
  result += '   `"Scanned: " & varScannedValue & " | Match: " & varMatchFound`\n';
  result += '2. **Verify SharePoint data**: Manually check if barcode exists in list\n';
  result += '3. **Check column spelling**: Ensure "Legacy Asset Tag" matches exactly\n';
  result += '4. **Check for leading/trailing spaces**: Barcode or SharePoint data may have hidden spaces\n';

  return { content: [{ type: 'text', text: result }] };
}

function handleParseMonitor(args) {
  const { filePath } = args;

  if (!existsSync(filePath)) {
    return { content: [{ type: 'text', text: `Error: File not found: ${filePath}` }] };
  }

  let result = '# Power Apps Monitor Export Analysis\n\n';

  try {
    const data = readFileSync(filePath, 'utf8');

    if (filePath.endsWith('.json')) {
      const events = JSON.parse(data);

      result += `## Session Overview\n\n`;
      result += `- Total events: ${Array.isArray(events) ? events.length : 'Unknown'}\n\n`;

      if (Array.isArray(events)) {
        // Categorize events
        const errors = events.filter(e => e.level === 'Error' || e.severity === 'Error');
        const warnings = events.filter(e => e.level === 'Warning' || e.severity === 'Warning');
        const dataOps = events.filter(e => e.category === 'Data' || e.operation?.includes('LookUp'));

        result += `- Errors: ${errors.length}\n`;
        result += `- Warnings: ${warnings.length}\n`;
        result += `- Data operations: ${dataOps.length}\n\n`;

        if (errors.length > 0) {
          result += '## Errors\n\n';
          errors.slice(0, 10).forEach((e, i) => {
            result += `${i + 1}. ${e.message || e.description || JSON.stringify(e)}\n`;
          });
          result += '\n';
        }

        if (dataOps.length > 0) {
          result += '## Data Operations\n\n';
          dataOps.slice(0, 10).forEach((e, i) => {
            result += `${i + 1}. ${e.operation || e.type}: ${e.details || JSON.stringify(e).slice(0, 100)}...\n`;
          });
        }
      }
    } else if (filePath.endsWith('.csv')) {
      const lines = data.split('\n');
      result += `## CSV Export (${lines.length} rows)\n\n`;
      result += '```\n' + lines.slice(0, 20).join('\n') + '\n```\n';
    } else {
      result += '## Raw Content\n\n```\n' + data.slice(0, 2000) + '\n```\n';
    }
  } catch (error) {
    result += `Error parsing file: ${error.message}\n`;
  }

  return { content: [{ type: 'text', text: result }] };
}

function handleGetAppCheckResults(args) {
  const content = getAllSourceContent();

  // Find SARIF content
  const sarifMatch = content.match(/AppCheckerResult\.sarif[\s\S]*?(?===|$)/);
  if (!sarifMatch) {
    return { content: [{ type: 'text', text: 'Could not find AppCheckerResult.sarif' }] };
  }

  let result = '# App Checker Results (Static Analysis)\n\n';

  try {
    // Extract just the JSON part
    const jsonStart = sarifMatch[0].indexOf('{');
    if (jsonStart >= 0) {
      const sarifJson = sarifMatch[0].slice(jsonStart);
      const sarif = JSON.parse(sarifJson);

      if (sarif.runs && sarif.runs[0]) {
        const run = sarif.runs[0];
        const results = run.results || [];

        result += `## Summary\n\n`;
        result += `- Total issues: ${results.length}\n\n`;

        if (results.length === 0) {
          result += 'No static analysis issues found.\n';
        } else {
          result += '## Issues\n\n';
          results.forEach((r, i) => {
            result += `### ${i + 1}. ${r.ruleId || 'Unknown'}\n`;
            result += `- Severity: ${r.level || 'note'}\n`;
            result += `- Message: ${r.message?.text || 'No message'}\n\n`;
          });
        }
      }
    }
  } catch (error) {
    result += `Error parsing SARIF: ${error.message}\n`;
    result += '\nRaw content preview:\n```\n' + sarifMatch[0].slice(0, 500) + '\n```\n';
  }

  return { content: [{ type: 'text', text: result }] };
}

function handleExplainVisibility(args) {
  let result = '# Visibility Logic Analysis\n\n';

  result += '## Current App Logic\n\n';
  result += '| Element | Visible When | Meaning |\n';
  result += '|---------|--------------|----------|\n';
  result += '| circleSuccess (Green) | `varShowResult && !varMatchFound` | No match in SharePoint |\n';
  result += '| iconSuccess (Check) | `varShowResult && !varMatchFound` | No match in SharePoint |\n';
  result += '| lblSuccessTitle | `varShowResult && !varMatchFound` | Shows "CUT SHEET NEEDED" |\n';
  result += '| circleFailure (Red) | `varShowResult && varMatchFound` | Match found in SharePoint |\n';
  result += '| iconFailure (X) | `varShowResult && varMatchFound` | Match found in SharePoint |\n';
  result += '| lblFailureTitle | `varShowResult && varMatchFound` | Shows "ALREADY HAS CUT SHEET" |\n';
  result += '| lblSearching | `varIsSearching` | During lookup |\n';
  result += '| btnScanAgain | `varShowResult` | After any result |\n';

  result += '\n## Interpretation\n\n';
  result += '### When barcode IS found in SharePoint:\n';
  result += '- `varMatchFound = true`\n';
  result += '- RED X shows with "ALREADY HAS CUT SHEET"\n';
  result += '- This means: Asset already has a cut sheet on file\n';

  result += '\n### When barcode is NOT found in SharePoint:\n';
  result += '- `varMatchFound = false`\n';
  result += '- GREEN checkmark shows with "CUT SHEET NEEDED"\n';
  result += '- This means: Asset needs a new cut sheet\n';

  result += '\n## Potential Bug: Inverted Logic?\n\n';
  result += 'If you are seeing GREEN when you expect RED, check:\n\n';
  result += '1. **SharePoint Data**: Is the barcode actually in the list?\n';
  result += '2. **Column Name**: Is "Legacy Asset Tag" spelled exactly right?\n';
  result += '3. **Data Format**: Are there leading zeros or spaces?\n';
  result += '4. **Both Lists**: Is the data in Part 1 or Part 2?\n';

  result += '\n## Debug Label\n\n';
  result += 'The app has a debug label (debugLbl) that shows:\n';
  result += '```\n"Scanned: " & varScannedValue & " | Match: " & varMatchFound\n```\n';
  result += '\nCheck this label during testing to see actual values.\n';

  return { content: [{ type: 'text', text: result }] };
}

// Main server setup
const server = new Server(
  {
    name: 'powerplatform-debug',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'pac_command':
      return handlePacCommand(args);
    case 'analyze_app_formulas':
      return handleAnalyzeFormulas(args);
    case 'search_app_source':
      return handleSearchSource(args);
    case 'get_datasource_info':
      return handleGetDatasourceInfo(args);
    case 'list_app_variables':
      return handleListVariables(args);
    case 'validate_lookup_formula':
      return handleValidateLookup(args);
    case 'simulate_scan_logic':
      return handleSimulateScan(args);
    case 'parse_monitor_export':
      return handleParseMonitor(args);
    case 'get_app_check_results':
      return handleGetAppCheckResults(args);
    case 'explain_visibility_logic':
      return handleExplainVisibility(args);
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Power Platform Debug MCP Server running');
}

main().catch(console.error);
