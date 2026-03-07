#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";

// System process patterns that should trigger warnings
const SYSTEM_PROCESS_PATTERNS = [
  /^kernel_task$/,
  /^launchd$/,
  /^WindowServer$/,
  /^loginwindow$/,
  /^systemd/,
  /^init$/,
  /^coreaudiod$/,
  /^cfprefsd$/,
  /^diskarbitrationd$/,
  /^securityd$/,
  /^trustd$/,
  /^airportd$/,
  /^bluetoothd$/,
  /^UserEventAgent$/,
];

/**
 * Check if a process name matches system process patterns
 */
function isSystemProcess(processName) {
  return SYSTEM_PROCESS_PATTERNS.some((pattern) => pattern.test(processName));
}

/**
 * Execute a shell command and return output
 */
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: "utf-8",
      timeout: options.timeout || 30000,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large process lists
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
 * Parse ps output into structured process objects
 */
function parseProcessList(psOutput) {
  const lines = psOutput.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Skip header line
  const processes = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // ps output format: PID %CPU %MEM USER COMMAND
    // Using fixed-width parsing since command can contain spaces
    const match = line.match(
      /^\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(.+)$/
    );
    if (match) {
      processes.push({
        pid: parseInt(match[1], 10),
        cpu_percent: parseFloat(match[2]),
        memory_percent: parseFloat(match[3]),
        user: match[4],
        command: match[5].trim(),
        name: match[5].trim().split(/\s+/)[0].split("/").pop(),
      });
    }
  }
  return processes;
}

/**
 * Get memory in MB from ps output (which gives pages)
 */
function getProcessMemoryMB(pid) {
  const result = execCommand(`ps -o rss= -p ${pid}`);
  if (result.success && result.output) {
    // rss is in KB
    const kb = parseInt(result.output.trim(), 10);
    return isNaN(kb) ? 0 : Math.round(kb / 1024);
  }
  return 0;
}

/**
 * List running processes with optional filtering and sorting
 */
function listProcesses(filter, sortBy, limit) {
  // Get process list with CPU and memory percentages
  const result = execCommand("ps -axo pid,%cpu,%mem,user,command");
  if (!result.success) {
    return { success: false, error: result.error };
  }

  let processes = parseProcessList(result.output);

  // Apply filter if provided
  if (filter) {
    const filterLower = filter.toLowerCase();
    processes = processes.filter(
      (p) =>
        p.name.toLowerCase().includes(filterLower) ||
        p.command.toLowerCase().includes(filterLower)
    );
  }

  // Sort processes
  switch (sortBy) {
    case "cpu":
      processes.sort((a, b) => b.cpu_percent - a.cpu_percent);
      break;
    case "memory":
      processes.sort((a, b) => b.memory_percent - a.memory_percent);
      break;
    case "pid":
      processes.sort((a, b) => a.pid - b.pid);
      break;
    default:
      processes.sort((a, b) => b.cpu_percent - a.cpu_percent);
  }

  // Apply limit
  if (limit && limit > 0) {
    processes = processes.slice(0, limit);
  }

  // Enrich with memory in MB
  processes = processes.map((p) => ({
    ...p,
    memory_mb: getProcessMemoryMB(p.pid),
  }));

  return { success: true, processes };
}

/**
 * Get detailed info about a specific process
 */
function getProcessInfo(pid) {
  // Check if process exists
  const existsResult = execCommand(`ps -p ${pid} -o pid=`);
  if (!existsResult.success || !existsResult.output.trim()) {
    return { success: false, error: `Process ${pid} not found` };
  }

  // Get detailed process info
  const infoResult = execCommand(
    `ps -p ${pid} -o pid,ppid,%cpu,%mem,user,lstart,command`
  );
  if (!infoResult.success) {
    return { success: false, error: infoResult.error };
  }

  const lines = infoResult.output.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    return { success: false, error: "Could not parse process info" };
  }

  // Parse the complex output (lstart has spaces)
  const dataLine = lines[1];
  // Format: PID PPID %CPU %MEM USER LSTART (Day Mon DD HH:MM:SS YYYY) COMMAND
  const match = dataLine.match(
    /^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(\w+\s+\w+\s+\d+\s+[\d:]+\s+\d+)\s+(.+)$/
  );

  if (!match) {
    return { success: false, error: "Could not parse process info format" };
  }

  const info = {
    pid: parseInt(match[1], 10),
    ppid: parseInt(match[2], 10),
    cpu_percent: parseFloat(match[3]),
    memory_percent: parseFloat(match[4]),
    user: match[5],
    start_time: match[6],
    command: match[7].trim(),
    name: match[7].trim().split(/\s+/)[0].split("/").pop(),
    memory_mb: getProcessMemoryMB(pid),
  };

  // Get open files count (may require elevated permissions)
  const lsofResult = execCommand(`lsof -p ${pid} 2>/dev/null | wc -l`);
  if (lsofResult.success) {
    info.open_files_count = parseInt(lsofResult.output.trim(), 10) || 0;
  }

  // Check if it's a system process
  info.is_system_process = isSystemProcess(info.name);

  return { success: true, info };
}

/**
 * Kill a process with the specified signal
 */
function killProcess(pid, signal = "SIGTERM") {
  // First, get process info for safety checks
  const processInfo = getProcessInfo(pid);
  if (!processInfo.success) {
    return processInfo;
  }

  const info = processInfo.info;

  // Warn about system processes
  if (info.is_system_process) {
    return {
      success: false,
      error: `WARNING: ${info.name} (PID ${pid}) appears to be a system process. Killing it may cause system instability. If you're sure, use kill_processes_by_name with confirm_system_kill=true.`,
      is_system_process: true,
    };
  }

  // Map signal names to numbers
  const signalMap = {
    SIGTERM: 15,
    SIGKILL: 9,
    SIGHUP: 1,
    SIGINT: 2,
    SIGQUIT: 3,
    SIGSTOP: 17,
    SIGCONT: 19,
  };

  const signalNum = signalMap[signal.toUpperCase()] || 15;

  const result = execCommand(`kill -${signalNum} ${pid}`);

  if (result.success) {
    return {
      success: true,
      message: `Sent ${signal} to process ${pid} (${info.name})`,
      process_name: info.name,
    };
  } else {
    // Check if it's a permission error
    if (result.stderr?.includes("Operation not permitted")) {
      return {
        success: false,
        error: `Permission denied: Cannot kill process ${pid} (${info.name}). Try running with sudo or check process ownership.`,
      };
    }
    return { success: false, error: result.error || result.stderr };
  }
}

/**
 * Kill all processes matching a name pattern
 */
function killProcessesByName(pattern, signal = "SIGTERM", confirmSystemKill = false) {
  // Find matching processes
  const listResult = listProcesses(pattern, "cpu", 0);
  if (!listResult.success) {
    return listResult;
  }

  const matchingProcesses = listResult.processes;
  if (matchingProcesses.length === 0) {
    return {
      success: true,
      message: `No processes found matching "${pattern}"`,
      killed: [],
      failed: [],
    };
  }

  // Check for system processes
  const systemProcesses = matchingProcesses.filter((p) => isSystemProcess(p.name));
  if (systemProcesses.length > 0 && !confirmSystemKill) {
    return {
      success: false,
      error: `Found ${systemProcesses.length} system process(es) matching "${pattern}": ${systemProcesses.map((p) => p.name).join(", ")}. Set confirm_system_kill=true to proceed.`,
      system_processes: systemProcesses.map((p) => ({ pid: p.pid, name: p.name })),
    };
  }

  const killed = [];
  const failed = [];

  // Map signal names to numbers
  const signalMap = {
    SIGTERM: 15,
    SIGKILL: 9,
    SIGHUP: 1,
    SIGINT: 2,
  };
  const signalNum = signalMap[signal.toUpperCase()] || 15;

  for (const proc of matchingProcesses) {
    const result = execCommand(`kill -${signalNum} ${proc.pid}`);
    if (result.success) {
      killed.push({ pid: proc.pid, name: proc.name });
    } else {
      failed.push({
        pid: proc.pid,
        name: proc.name,
        error: result.stderr || result.error,
      });
    }
  }

  return {
    success: true,
    message: `Sent ${signal} to ${killed.length} process(es), ${failed.length} failed`,
    killed,
    failed,
  };
}

/**
 * Get overall system resource usage
 */
function getSystemStats() {
  const stats = {};

  // Get CPU usage using top (snapshot mode)
  const topResult = execCommand("top -l 1 -n 0 -s 0");
  if (topResult.success) {
    // Parse CPU line: CPU usage: X% user, Y% sys, Z% idle
    const cpuMatch = topResult.output.match(
      /CPU usage:\s*([\d.]+)%\s*user,\s*([\d.]+)%\s*sys,\s*([\d.]+)%\s*idle/
    );
    if (cpuMatch) {
      stats.cpu = {
        user: parseFloat(cpuMatch[1]),
        system: parseFloat(cpuMatch[2]),
        idle: parseFloat(cpuMatch[3]),
        total_used: parseFloat(cpuMatch[1]) + parseFloat(cpuMatch[2]),
      };
    }

    // Parse memory line: PhysMem: XG used (Y wired, Z compressor), WG unused
    const memMatch = topResult.output.match(
      /PhysMem:\s*([\d.]+)([GM])\s*used.*?([\d.]+)([GM])\s*unused/
    );
    if (memMatch) {
      const usedVal = parseFloat(memMatch[1]);
      const usedUnit = memMatch[2];
      const unusedVal = parseFloat(memMatch[3]);
      const unusedUnit = memMatch[4];

      const usedGB = usedUnit === "G" ? usedVal : usedVal / 1024;
      const unusedGB = unusedUnit === "G" ? unusedVal : unusedVal / 1024;
      const totalGB = usedGB + unusedGB;

      stats.memory = {
        used_gb: Math.round(usedGB * 100) / 100,
        free_gb: Math.round(unusedGB * 100) / 100,
        total_gb: Math.round(totalGB * 100) / 100,
        percent_used: Math.round((usedGB / totalGB) * 100),
      };
    }
  }

  // Get top processes by CPU
  const cpuProcesses = listProcesses(null, "cpu", 5);
  if (cpuProcesses.success) {
    stats.top_by_cpu = cpuProcesses.processes.map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu_percent: p.cpu_percent,
    }));
  }

  // Get top processes by memory
  const memProcesses = listProcesses(null, "memory", 5);
  if (memProcesses.success) {
    stats.top_by_memory = memProcesses.processes.map((p) => ({
      pid: p.pid,
      name: p.name,
      memory_mb: p.memory_mb,
      memory_percent: p.memory_percent,
    }));
  }

  // Get load averages
  const loadResult = execCommand("sysctl -n vm.loadavg");
  if (loadResult.success) {
    const loadMatch = loadResult.output.match(
      /\{\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/
    );
    if (loadMatch) {
      stats.load_average = {
        "1min": parseFloat(loadMatch[1]),
        "5min": parseFloat(loadMatch[2]),
        "15min": parseFloat(loadMatch[3]),
      };
    }
  }

  // Get process count
  const countResult = execCommand("ps -ax | wc -l");
  if (countResult.success) {
    stats.process_count = parseInt(countResult.output.trim(), 10) - 1; // Subtract header line
  }

  return { success: true, stats };
}

// Define available tools
const TOOLS = [
  {
    name: "list_processes",
    description:
      "List running processes with filtering options. Returns process info including PID, name, CPU%, memory, and user.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description:
            "Optional string to filter processes by name or command (case-insensitive)",
        },
        sort_by: {
          type: "string",
          enum: ["cpu", "memory", "pid"],
          description:
            "Sort results by CPU usage, memory usage, or PID. Default: cpu",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of results to return. Default: 50, use 0 for no limit",
        },
      },
    },
  },
  {
    name: "get_process_info",
    description:
      "Get detailed information about a specific process including parent PID, start time, full command, and open files count.",
    inputSchema: {
      type: "object",
      properties: {
        pid: {
          type: "number",
          description: "The process ID to get information about",
        },
      },
      required: ["pid"],
    },
  },
  {
    name: "kill_process",
    description:
      "Send a signal to terminate a specific process. Use SIGTERM (default) for graceful termination or SIGKILL to force quit.",
    inputSchema: {
      type: "object",
      properties: {
        pid: {
          type: "number",
          description: "The process ID to kill",
        },
        signal: {
          type: "string",
          enum: ["SIGTERM", "SIGKILL", "SIGHUP", "SIGINT", "SIGQUIT"],
          description:
            "Signal to send. SIGTERM (15) for graceful shutdown, SIGKILL (9) to force quit. Default: SIGTERM",
        },
      },
      required: ["pid"],
    },
  },
  {
    name: "kill_processes_by_name",
    description:
      "Kill all processes matching a name pattern. Useful for killing multiple instances of a stuck process.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description:
            "String pattern to match against process names (case-insensitive)",
        },
        signal: {
          type: "string",
          enum: ["SIGTERM", "SIGKILL", "SIGHUP", "SIGINT"],
          description: "Signal to send to matching processes. Default: SIGTERM",
        },
        confirm_system_kill: {
          type: "boolean",
          description:
            "Set to true to confirm killing system processes. Default: false",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "get_system_stats",
    description:
      "Get overall system resource usage including CPU, memory, load averages, and top processes.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "activity-monitor",
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
      case "list_processes": {
        const filter = args?.filter || null;
        const sortBy = args?.sort_by || "cpu";
        const limit = args?.limit ?? 50;

        const result = listProcesses(filter, sortBy, limit);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        // Format output as a table
        let output = `Found ${result.processes.length} process(es)`;
        if (filter) output += ` matching "${filter}"`;
        output += `\n\n`;
        output += "PID      CPU%   MEM(MB)  USER           NAME\n";
        output += "-".repeat(70) + "\n";

        for (const p of result.processes) {
          output += `${String(p.pid).padEnd(8)} ${String(p.cpu_percent.toFixed(1)).padStart(5)}  ${String(p.memory_mb).padStart(7)}  ${p.user.padEnd(14)} ${p.name}\n`;
        }

        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "get_process_info": {
        const pid = args.pid;
        const result = getProcessInfo(pid);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const info = result.info;
        let output = `Process Details for PID ${pid}\n`;
        output += "=".repeat(40) + "\n";
        output += `Name:           ${info.name}\n`;
        output += `PID:            ${info.pid}\n`;
        output += `Parent PID:     ${info.ppid}\n`;
        output += `User:           ${info.user}\n`;
        output += `CPU Usage:      ${info.cpu_percent}%\n`;
        output += `Memory Usage:   ${info.memory_mb} MB (${info.memory_percent}%)\n`;
        output += `Start Time:     ${info.start_time}\n`;
        output += `Open Files:     ${info.open_files_count || "N/A"}\n`;
        output += `System Process: ${info.is_system_process ? "Yes (caution!)" : "No"}\n`;
        output += `\nFull Command:\n${info.command}\n`;

        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "kill_process": {
        const pid = args.pid;
        const signal = args?.signal || "SIGTERM";

        const result = killProcess(pid, signal);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: !result.is_system_process, // Not an error if just a warning
          };
        }

        return {
          content: [{ type: "text", text: result.message }],
        };
      }

      case "kill_processes_by_name": {
        const pattern = args.pattern;
        const signal = args?.signal || "SIGTERM";
        const confirmSystemKill = args?.confirm_system_kill || false;

        const result = killProcessesByName(pattern, signal, confirmSystemKill);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        let output = result.message + "\n";

        if (result.killed && result.killed.length > 0) {
          output += "\nKilled:\n";
          for (const p of result.killed) {
            output += `  - PID ${p.pid}: ${p.name}\n`;
          }
        }

        if (result.failed && result.failed.length > 0) {
          output += "\nFailed:\n";
          for (const p of result.failed) {
            output += `  - PID ${p.pid}: ${p.name} - ${p.error}\n`;
          }
        }

        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "get_system_stats": {
        const result = getSystemStats();

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const stats = result.stats;
        let output = "System Resource Usage\n";
        output += "=".repeat(50) + "\n\n";

        if (stats.cpu) {
          output += `CPU Usage:\n`;
          output += `  User:   ${stats.cpu.user}%\n`;
          output += `  System: ${stats.cpu.system}%\n`;
          output += `  Idle:   ${stats.cpu.idle}%\n`;
          output += `  Total:  ${stats.cpu.total_used.toFixed(1)}%\n\n`;
        }

        if (stats.memory) {
          output += `Memory Usage:\n`;
          output += `  Used:  ${stats.memory.used_gb} GB (${stats.memory.percent_used}%)\n`;
          output += `  Free:  ${stats.memory.free_gb} GB\n`;
          output += `  Total: ${stats.memory.total_gb} GB\n\n`;
        }

        if (stats.load_average) {
          output += `Load Average:\n`;
          output += `  1 min:  ${stats.load_average["1min"]}\n`;
          output += `  5 min:  ${stats.load_average["5min"]}\n`;
          output += `  15 min: ${stats.load_average["15min"]}\n\n`;
        }

        if (stats.process_count) {
          output += `Total Processes: ${stats.process_count}\n\n`;
        }

        if (stats.top_by_cpu) {
          output += `Top Processes by CPU:\n`;
          for (const p of stats.top_by_cpu) {
            output += `  ${p.cpu_percent.toFixed(1)}% - ${p.name} (PID ${p.pid})\n`;
          }
          output += "\n";
        }

        if (stats.top_by_memory) {
          output += `Top Processes by Memory:\n`;
          for (const p of stats.top_by_memory) {
            output += `  ${p.memory_mb} MB (${p.memory_percent.toFixed(1)}%) - ${p.name} (PID ${p.pid})\n`;
          }
        }

        return {
          content: [{ type: "text", text: output }],
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
  console.error("Activity Monitor MCP server running on stdio");
}

main().catch(console.error);
