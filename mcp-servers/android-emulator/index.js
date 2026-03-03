#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, execSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";

// Configuration from environment variables
const ANDROID_SDK = process.env.ANDROID_SDK_ROOT || "/Volumes/bingobango/android-sdk";
const ADB_PATH = process.env.ADB_PATH || path.join(ANDROID_SDK, "platform-tools", "adb");
const EMULATOR_PATH = process.env.EMULATOR_PATH || path.join(ANDROID_SDK, "emulator", "emulator");
const DEFAULT_AVD = process.env.DEFAULT_AVD || "Pixel_7_API_34";
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || "/tmp/android-screenshots";

// Track running emulator process
let emulatorProcess = null;

/**
 * Execute ADB command and return output
 */
function execAdb(args, options = {}) {
  const command = `"${ADB_PATH}" ${args}`;
  try {
    const result = execSync(command, {
      encoding: "utf-8",
      timeout: options.timeout || 30000,
      ...options,
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || "",
    };
  }
}

/**
 * Get emulator status
 */
function getEmulatorStatus() {
  const result = execAdb("devices");
  if (!result.success) {
    return { status: "error", message: result.error };
  }

  const lines = result.output.split("\n").filter((l) => l.trim());
  const devices = lines.slice(1); // Skip header

  for (const device of devices) {
    if (device.includes("emulator")) {
      if (device.includes("offline")) {
        return { status: "offline", device: device.split("\t")[0] };
      } else if (device.includes("device")) {
        return { status: "running", device: device.split("\t")[0] };
      } else if (device.includes("unauthorized")) {
        return { status: "unauthorized", device: device.split("\t")[0] };
      }
    }
  }

  // Check if emulator process is running but not yet connected
  if (emulatorProcess && !emulatorProcess.killed) {
    return { status: "booting", message: "Emulator process started, waiting for device" };
  }

  return { status: "stopped", message: "No emulator running" };
}

/**
 * Wait for emulator to be ready
 */
async function waitForEmulator(timeoutMs = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = getEmulatorStatus();
    if (status.status === "running") {
      // Additional check: wait for boot completion
      const bootResult = execAdb("shell getprop sys.boot_completed");
      if (bootResult.success && bootResult.output.trim() === "1") {
        return { success: true, status };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { success: false, message: "Timeout waiting for emulator" };
}

// Define available tools
const TOOLS = [
  {
    name: "android_emulator_start",
    description: "Start the Android emulator with the specified AVD. Returns when emulator is fully booted and ready.",
    inputSchema: {
      type: "object",
      properties: {
        avd: {
          type: "string",
          description: `Name of the AVD to start. Default: ${DEFAULT_AVD}`,
        },
        coldBoot: {
          type: "boolean",
          description: "Perform a cold boot instead of using snapshot. Default: false",
        },
        noWindow: {
          type: "boolean",
          description: "Run emulator without window (headless). Default: false",
        },
      },
    },
  },
  {
    name: "android_emulator_stop",
    description: "Stop the running Android emulator gracefully.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "android_emulator_status",
    description: "Check the current status of the Android emulator (running, booting, offline, stopped).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "android_open_url",
    description: "Open a URL in the emulator's Chrome browser. Use http://10.0.2.2:PORT to access localhost from the emulator.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to open. For localhost, use http://10.0.2.2:PORT",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "android_screenshot",
    description: "Take a screenshot of the emulator screen and save it to a file.",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Output filename (without path). Default: screenshot-{timestamp}.png",
        },
        outputDir: {
          type: "string",
          description: `Directory to save screenshot. Default: ${SCREENSHOT_DIR}`,
        },
      },
    },
  },
  {
    name: "android_logcat",
    description: "Get logcat logs from the emulator. Can filter by tag, level, or get recent logs.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Logcat filter expression (e.g., 'chromium:V *:S' for Chrome logs only)",
        },
        lines: {
          type: "number",
          description: "Number of recent log lines to retrieve. Default: 100",
        },
        clear: {
          type: "boolean",
          description: "Clear the logcat buffer before capturing. Default: false",
        },
        level: {
          type: "string",
          enum: ["V", "D", "I", "W", "E", "F"],
          description: "Minimum log level: V(erbose), D(ebug), I(nfo), W(arn), E(rror), F(atal)",
        },
      },
    },
  },
  {
    name: "android_tap",
    description: "Simulate a tap at specific screen coordinates.",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate of the tap",
        },
        y: {
          type: "number",
          description: "Y coordinate of the tap",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "android_swipe",
    description: "Simulate a swipe gesture from one point to another.",
    inputSchema: {
      type: "object",
      properties: {
        startX: { type: "number", description: "Starting X coordinate" },
        startY: { type: "number", description: "Starting Y coordinate" },
        endX: { type: "number", description: "Ending X coordinate" },
        endY: { type: "number", description: "Ending Y coordinate" },
        durationMs: {
          type: "number",
          description: "Duration of swipe in milliseconds. Default: 300",
        },
      },
      required: ["startX", "startY", "endX", "endY"],
    },
  },
  {
    name: "android_input_text",
    description: "Input text into the currently focused field.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to input. Spaces will be converted to %s for ADB.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "android_key_event",
    description: "Send a key event to the emulator (e.g., BACK, HOME, ENTER).",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key code name (e.g., KEYCODE_BACK, KEYCODE_HOME, KEYCODE_ENTER) or number",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "android_shell",
    description: "Execute an arbitrary shell command on the emulator via ADB.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute on the emulator",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "android_list_packages",
    description: "List installed packages on the emulator, optionally filtered.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Filter packages containing this string",
        },
        thirdPartyOnly: {
          type: "boolean",
          description: "Only show third-party (non-system) packages. Default: false",
        },
      },
    },
  },
  {
    name: "android_screen_info",
    description: "Get screen information including resolution and density.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "android_get_ui_dump",
    description: "Dump the current UI hierarchy as XML for element inspection.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "android-emulator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "android_emulator_start": {
        const avd = args?.avd || DEFAULT_AVD;
        const coldBoot = args?.coldBoot || false;
        const noWindow = args?.noWindow || false;

        // Check if already running
        const status = getEmulatorStatus();
        if (status.status === "running") {
          return {
            content: [
              {
                type: "text",
                text: `Emulator already running on ${status.device}`,
              },
            ],
          };
        }

        // Build emulator command
        const emulatorArgs = ["-avd", avd];
        if (coldBoot) emulatorArgs.push("-no-snapshot-load");
        if (noWindow) emulatorArgs.push("-no-window");

        // Start emulator in background
        emulatorProcess = spawn(EMULATOR_PATH, emulatorArgs, {
          detached: true,
          stdio: "ignore",
        });
        emulatorProcess.unref();

        // Wait for emulator to be ready
        const waitResult = await waitForEmulator(120000);

        if (waitResult.success) {
          return {
            content: [
              {
                type: "text",
                text: `Emulator ${avd} started successfully and is ready.\nDevice: ${waitResult.status.device}\nTo access localhost from emulator, use: http://10.0.2.2:PORT`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Emulator started but may not be fully ready: ${waitResult.message}`,
              },
            ],
          };
        }
      }

      case "android_emulator_stop": {
        const status = getEmulatorStatus();
        if (status.status === "stopped") {
          return {
            content: [{ type: "text", text: "No emulator is running" }],
          };
        }

        const result = execAdb("emu kill");

        // Also try to kill the process if we have a reference
        if (emulatorProcess && !emulatorProcess.killed) {
          try {
            process.kill(-emulatorProcess.pid);
          } catch (e) {
            // Process may already be dead
          }
          emulatorProcess = null;
        }

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? "Emulator stopped successfully"
                : `Stop command sent. ${result.output || result.error}`,
            },
          ],
        };
      }

      case "android_emulator_status": {
        const status = getEmulatorStatus();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case "android_open_url": {
        const url = args.url;

        // Escape URL for shell
        const escapedUrl = url.replace(/'/g, "'\\''");

        const result = execAdb(
          `shell am start -a android.intent.action.VIEW -d '${escapedUrl}'`
        );

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `Opened URL: ${url}`
                : `Failed to open URL: ${result.error}`,
            },
          ],
        };
      }

      case "android_screenshot": {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = args?.filename || `screenshot-${timestamp}.png`;
        const outputDir = args?.outputDir || SCREENSHOT_DIR;

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        const devicePath = "/sdcard/screenshot.png";
        const localPath = path.join(outputDir, filename);

        // Take screenshot on device
        let result = execAdb(`shell screencap -p ${devicePath}`);
        if (!result.success) {
          return {
            content: [
              { type: "text", text: `Failed to capture screenshot: ${result.error}` },
            ],
          };
        }

        // Pull to local machine
        result = execAdb(`pull ${devicePath} "${localPath}"`);
        if (!result.success) {
          return {
            content: [
              { type: "text", text: `Failed to save screenshot: ${result.error}` },
            ],
          };
        }

        // Clean up device file
        execAdb(`shell rm ${devicePath}`);

        return {
          content: [
            {
              type: "text",
              text: `Screenshot saved to: ${localPath}`,
            },
          ],
        };
      }

      case "android_logcat": {
        const lines = args?.lines || 100;
        const filter = args?.filter || "";
        const clear = args?.clear || false;
        const level = args?.level || "";

        if (clear) {
          execAdb("logcat -c");
        }

        let logcatCmd = `logcat -d -t ${lines}`;
        if (level) {
          logcatCmd += ` *:${level}`;
        }
        if (filter) {
          logcatCmd += ` ${filter}`;
        }

        const result = execAdb(`shell ${logcatCmd}`, { timeout: 60000 });

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? result.output || "(no logs)"
                : `Failed to get logs: ${result.error}`,
            },
          ],
        };
      }

      case "android_tap": {
        const { x, y } = args;
        const result = execAdb(`shell input tap ${x} ${y}`);

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `Tapped at (${x}, ${y})`
                : `Failed to tap: ${result.error}`,
            },
          ],
        };
      }

      case "android_swipe": {
        const { startX, startY, endX, endY } = args;
        const duration = args?.durationMs || 300;

        const result = execAdb(
          `shell input swipe ${startX} ${startY} ${endX} ${endY} ${duration}`
        );

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `Swiped from (${startX}, ${startY}) to (${endX}, ${endY})`
                : `Failed to swipe: ${result.error}`,
            },
          ],
        };
      }

      case "android_input_text": {
        const text = args.text.replace(/ /g, "%s").replace(/'/g, "'\\''");
        const result = execAdb(`shell input text '${text}'`);

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `Input text: "${args.text}"`
                : `Failed to input text: ${result.error}`,
            },
          ],
        };
      }

      case "android_key_event": {
        const key = args.key;
        // Add KEYCODE_ prefix if not present and not a number
        const keyCode = /^\d+$/.test(key)
          ? key
          : key.startsWith("KEYCODE_")
          ? key
          : `KEYCODE_${key}`;

        const result = execAdb(`shell input keyevent ${keyCode}`);

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `Sent key event: ${keyCode}`
                : `Failed to send key: ${result.error}`,
            },
          ],
        };
      }

      case "android_shell": {
        const command = args.command.replace(/'/g, "'\\''");
        const result = execAdb(`shell '${command}'`, { timeout: 60000 });

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? result.output || "(command completed with no output)"
                : `Command failed: ${result.error}\n${result.stderr || ""}`,
            },
          ],
        };
      }

      case "android_list_packages": {
        let cmd = "shell pm list packages";
        if (args?.thirdPartyOnly) {
          cmd += " -3";
        }

        const result = execAdb(cmd);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Failed: ${result.error}` }],
          };
        }

        let packages = result.output
          .split("\n")
          .map((l) => l.replace("package:", "").trim())
          .filter((l) => l);

        if (args?.filter) {
          const filterLower = args.filter.toLowerCase();
          packages = packages.filter((p) => p.toLowerCase().includes(filterLower));
        }

        return {
          content: [
            {
              type: "text",
              text: packages.length > 0
                ? packages.join("\n")
                : "(no matching packages)",
            },
          ],
        };
      }

      case "android_screen_info": {
        const sizeResult = execAdb("shell wm size");
        const densityResult = execAdb("shell wm density");

        const info = {
          size: sizeResult.success ? sizeResult.output : "unknown",
          density: densityResult.success ? densityResult.output : "unknown",
        };

        return {
          content: [
            {
              type: "text",
              text: `Screen Size: ${info.size}\nDensity: ${info.density}`,
            },
          ],
        };
      }

      case "android_get_ui_dump": {
        const devicePath = "/sdcard/ui_dump.xml";

        // Dump UI hierarchy
        let result = execAdb(`shell uiautomator dump ${devicePath}`, {
          timeout: 30000,
        });

        if (!result.success) {
          return {
            content: [
              { type: "text", text: `Failed to dump UI: ${result.error}` },
            ],
          };
        }

        // Read the dump
        result = execAdb(`shell cat ${devicePath}`);

        // Clean up
        execAdb(`shell rm ${devicePath}`);

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? result.output
                : `Failed to read UI dump: ${result.error}`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Android Emulator MCP server running on stdio");
}

main().catch(console.error);
