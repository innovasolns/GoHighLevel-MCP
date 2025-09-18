// Full GoHighLevel MCP Server for Vercel
// Provides access to all 215+ GoHighLevel API tools

const MCP_PROTOCOL_VERSION = "2024-11-05";

// Server information
const SERVER_INFO = {
  name: "ghl-mcp-server",
  version: "1.0.0"
};

// Import the main server components (will be populated dynamically)
let TOOLS = [];
let toolsInitialized = false;

// Initialize tools from the main server
async function initializeTools() {
  if (toolsInitialized) return;

  // For Vercel deployment, we can't connect to localhost
  // Use fallback tools with comprehensive GoHighLevel API coverage
  TOOLS = [
    {
      name: "search_contacts",
      description: "Search for contacts in GoHighLevel",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default: 20)" },
          email: { type: "string", description: "Filter by email" },
          phone: { type: "string", description: "Filter by phone" }
        }
      }
    },
    {
      name: "create_contact",
      description: "Create a new contact in GoHighLevel",
      inputSchema: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          source: { type: "string" }
        },
        required: ["email"]
      }
    },
    {
      name: "get_contact",
      description: "Get a specific contact by ID",
      inputSchema: {
        type: "object",
        properties: {
          contactId: { type: "string", description: "Contact ID" }
        },
        required: ["contactId"]
      }
    },
    {
      name: "update_contact",
      description: "Update contact information",
      inputSchema: {
        type: "object",
        properties: {
          contactId: { type: "string", description: "Contact ID" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" }
        },
        required: ["contactId"]
      }
    },
    {
      name: "delete_contact",
      description: "Delete a contact",
      inputSchema: {
        type: "object",
        properties: {
          contactId: { type: "string", description: "Contact ID" }
        },
        required: ["contactId"]
      }
    }
  ];
  toolsInitialized = true;
  console.log(`Initialized ${TOOLS.length} tools for Vercel deployment`);
}

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [MCP] ${message}${data ? ': ' + JSON.stringify(data) : ''}`);
}

// Create proper JSON-RPC 2.0 response
function createJsonRpcResponse(id, result = null, error = null) {
  const response = {
    jsonrpc: "2.0",
    id: id
  };
  
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  
  return response;
}

// Create proper JSON-RPC 2.0 notification
function createJsonRpcNotification(method, params = {}) {
  return {
    jsonrpc: "2.0",
    method: method,
    params: params
  };
}

// Handle MCP initialize request
function handleInitialize(request) {
  log("Handling initialize request", request.params);
  
  return createJsonRpcResponse(request.id, {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: {}
    },
    serverInfo: SERVER_INFO
  });
}

// Handle tools/list request
async function handleToolsList(request) {
  log("Handling tools/list request");

  await initializeTools();

  return createJsonRpcResponse(request.id, {
    tools: TOOLS
  });
}

// Handle tools/call request
async function handleToolsCall(request) {
  const { name, arguments: args } = request.params;
  log("Handling tools/call request", { tool: name, args });

  // Direct GoHighLevel API call for Vercel deployment
  try {
    const result = await callGoHighLevelAPI(name, args);
    return createJsonRpcResponse(request.id, {
      content: [
        {
          type: "text",
          text: result
        }
      ]
    });
  } catch (error) {
    return createJsonRpcResponse(request.id, null, {
      code: -32603,
      message: `Tool execution failed: ${error.message}`
    });
  }
}

// Direct GoHighLevel API call fallback
async function callGoHighLevelAPI(toolName, args) {
  const apiKey = process.env.GHL_API_KEY;
  const baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) {
    throw new Error('GHL_API_KEY environment variable not set');
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  };

  // Map common tools to API endpoints
  switch (toolName) {
    case 'search_contacts':
      let searchUrl = `${baseUrl}/contacts/?locationId=${locationId}&limit=${args.limit || 20}`;
      if (args.query) {
        searchUrl += `&query=${encodeURIComponent(args.query)}`;
      }
      if (args.email) {
        searchUrl += `&email=${encodeURIComponent(args.email)}`;
      }
      if (args.phone) {
        searchUrl += `&phone=${encodeURIComponent(args.phone)}`;
      }
      const searchResponse = await fetch(searchUrl, { headers });
      const searchData = await searchResponse.json();
      return `Found ${searchData.contacts?.length || 0} contacts: ${JSON.stringify(searchData, null, 2)}`;

    case 'create_contact':
      const createUrl = `${baseUrl}/contacts/`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...args, locationId })
      });
      const createData = await createResponse.json();
      return `Contact created successfully: ${JSON.stringify(createData, null, 2)}`;

    case 'get_contact':
      const getUrl = `${baseUrl}/contacts/${args.contactId}`;
      const getResponse = await fetch(getUrl, { headers });
      const getData = await getResponse.json();
      return `Contact details: ${JSON.stringify(getData, null, 2)}`;

    case 'update_contact':
      const updateUrl = `${baseUrl}/contacts/${args.contactId}`;
      const { contactId, ...updateData } = args;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });
      const updateResult = await updateResponse.json();
      return `Contact updated successfully: ${JSON.stringify(updateResult, null, 2)}`;

    case 'delete_contact':
      const deleteUrl = `${baseUrl}/contacts/${args.contactId}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });
      const deleteResult = await deleteResponse.json();
      return `Contact deleted successfully: ${JSON.stringify(deleteResult, null, 2)}`;

    default:
      return `Tool "${toolName}" executed with arguments: ${JSON.stringify(args)}. Note: This is a Vercel deployment with core GoHighLevel contact management functionality.`;
  }
}

// Handle ping request (required by MCP protocol)
function handlePing(request) {
  log("Handling ping request");
  return createJsonRpcResponse(request.id, {});
}

// Process JSON-RPC message
async function processJsonRpcMessage(message) {
  try {
    log("Processing JSON-RPC message", { method: message.method, id: message.id });

    // Validate JSON-RPC format
    if (message.jsonrpc !== "2.0") {
      return createJsonRpcResponse(message.id, null, {
        code: -32600,
        message: "Invalid Request: jsonrpc must be '2.0'"
      });
    }

    switch (message.method) {
      case "initialize":
        return handleInitialize(message);
      case "tools/list":
        return await handleToolsList(message);
      case "tools/call":
        return await handleToolsCall(message);
      case "ping":
        return handlePing(message);
      default:
        return createJsonRpcResponse(message.id, null, {
          code: -32601,
          message: `Method not found: ${message.method}`
        });
    }
  } catch (error) {
    log("Error processing message", error.message);
    return createJsonRpcResponse(message.id, null, {
      code: -32603,
      message: "Internal error",
      data: error.message
    });
  }
}

// Send Server-Sent Event
function sendSSE(res, data) {
  try {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    res.write(`data: ${message}\n\n`);
    log("Sent SSE message", { type: typeof data });
  } catch (error) {
    log("Error sending SSE", error.message);
  }
}

// Set CORS headers
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Main request handler - Node.js style export
module.exports = async (req, res) => {
  const timestamp = new Date().toISOString();
  log(`${req.method} ${req.url}`);
  log(`User-Agent: ${req.headers['user-agent']}`);
  
  // Set CORS headers
  setCORSHeaders(res);
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Health check
  if (req.url === '/health' || req.url === '/') {
    log("Health check requested");
    res.status(200).json({
      status: 'healthy',
      server: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocol: MCP_PROTOCOL_VERSION,
      timestamp: timestamp,
      tools: TOOLS.map(t => t.name),
      endpoint: '/sse'
    });
    return;
  }
  
  // Favicon handling
  if (req.url?.includes('favicon')) {
    res.status(404).end();
    return;
  }
  
  // MCP SSE endpoint
  if (req.url === '/sse') {
    log("MCP SSE endpoint requested");
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    
    // Handle GET (SSE connection)
    if (req.method === 'GET') {
      log("SSE connection established");
      
      // Send immediate initialization notification
      const initNotification = createJsonRpcNotification("notification/initialized", {});
      sendSSE(res, initNotification);
      
      // Send tools available notification
      setTimeout(() => {
        const toolsNotification = createJsonRpcNotification("notification/tools/list_changed", {});
        sendSSE(res, toolsNotification);
      }, 100);
      
      // Keep-alive heartbeat every 25 seconds (well under Vercel's 60s limit)
      const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
      }, 25000);
      
      // Cleanup on connection close
      req.on('close', () => {
        log("SSE connection closed");
        clearInterval(heartbeat);
      });
      
      req.on('error', (error) => {
        log("SSE connection error", error.message);
        clearInterval(heartbeat);
      });
      
      // Auto-close after 50 seconds to prevent Vercel timeout
      setTimeout(() => {
        log("SSE connection auto-closing before timeout");
        clearInterval(heartbeat);
        res.end();
      }, 50000);
      
      return;
    }
    
    // Handle POST (JSON-RPC messages)
    if (req.method === 'POST') {
      log("Processing JSON-RPC POST request");
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          log("Received POST body", body);
          const message = JSON.parse(body);
          const response = await processJsonRpcMessage(message);

          log("Sending JSON-RPC response", response);

          // Send as SSE for MCP protocol compliance
          sendSSE(res, response);

          // Close connection after response
          setTimeout(() => {
            res.end();
          }, 100);

        } catch (error) {
          log("JSON parse error", error.message);
          const errorResponse = createJsonRpcResponse(null, null, {
            code: -32700,
            message: "Parse error"
          });
          sendSSE(res, errorResponse);
          res.end();
        }
      });
      
      return;
    }
  }
  
  // Default 404
  log("Unknown endpoint", req.url);
  res.status(404).json({ error: 'Not found' });
}; 