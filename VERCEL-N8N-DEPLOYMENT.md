# Deploying GoHighLevel MCP Server to Vercel for n8n Integration

## Prerequisites
- Vercel account
- n8n instance (cloud or self-hosted)
- GoHighLevel API credentials

## Step 1: Deploy to Vercel

### Option A: Deploy with Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Build the project:
```bash
npm run build
```

3. Deploy to Vercel:
```bash
vercel --prod
```

4. Set environment variables in Vercel:
```bash
vercel env add GHL_API_KEY production
vercel env add GHL_BASE_URL production
vercel env add GHL_LOCATION_ID production
```

Enter your values when prompted:
- `GHL_API_KEY`: Your GoHighLevel API key
- `GHL_BASE_URL`: https://services.leadconnectorhq.com
- `GHL_LOCATION_ID`: Your GoHighLevel location ID

### Option B: Deploy with GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Configure environment variables in the Vercel dashboard:
   - `GHL_API_KEY`
   - `GHL_BASE_URL`
   - `GHL_LOCATION_ID`
6. Click "Deploy"

## Step 2: Get Your Deployment URL

After deployment, you'll get a URL like:
- `https://your-project-name.vercel.app`

Your SSE endpoint will be available at:
- `https://your-project-name.vercel.app/api/sse`

## Step 3: Configure n8n Integration

### Using the HTTP Request Node

1. In n8n, add an **HTTP Request** node
2. Configure it as follows:

```json
{
  "method": "POST",
  "url": "https://your-project-name.vercel.app/api/sse",
  "headers": {
    "Content-Type": "application/json",
    "Accept": "text/event-stream"
  },
  "body": {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_contacts",
      "arguments": {
        "limit": 10
      }
    },
    "id": 1
  }
}
```

### Using the SSE/EventSource Node (if available)

1. Add an **SSE** or **EventSource** node
2. Configure:
   - URL: `https://your-project-name.vercel.app/api/sse`
   - Method: GET for connection, POST for commands

### Creating a Custom n8n Node

Create a custom n8n node for GoHighLevel MCP:

```javascript
// GHLMCPNode.node.js
import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class GHLMCP implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GoHighLevel MCP',
    name: 'ghlMcp',
    group: ['transform'],
    version: 1,
    description: 'Connect to GoHighLevel via MCP Server',
    defaults: {
      name: 'GoHighLevel MCP',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Server URL',
        name: 'serverUrl',
        type: 'string',
        default: 'https://your-project-name.vercel.app',
        required: true,
        description: 'Your Vercel deployment URL',
      },
      {
        displayName: 'Tool',
        name: 'tool',
        type: 'options',
        options: [
          { name: 'Search Contacts', value: 'search_contacts' },
          { name: 'Create Contact', value: 'create_contact' },
          { name: 'Update Contact', value: 'update_contact' },
          { name: 'Get Contact', value: 'get_contact' },
        ],
        default: 'search_contacts',
      },
      {
        displayName: 'Arguments',
        name: 'arguments',
        type: 'json',
        default: '{"limit": 10}',
        description: 'Tool arguments as JSON',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const serverUrl = this.getNodeParameter('serverUrl', 0) as string;
    const tool = this.getNodeParameter('tool', 0) as string;
    const args = this.getNodeParameter('arguments', 0) as string;

    const response = await this.helpers.request({
      method: 'POST',
      url: `${serverUrl}/api/sse`,
      body: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: tool,
          arguments: JSON.parse(args),
        },
        id: Date.now(),
      },
      json: true,
    });

    return this.prepareOutputData([{ json: response }]);
  }
}
```

## Step 4: Example n8n Workflows

### Workflow 1: Search and Update Contacts
```json
{
  "nodes": [
    {
      "name": "Search Contacts",
      "type": "n8n-nodes-base.httpRequest",
      "position": [250, 300],
      "parameters": {
        "method": "POST",
        "url": "https://your-project.vercel.app/api/sse",
        "jsonBody": {
          "jsonrpc": "2.0",
          "method": "tools/call",
          "params": {
            "name": "search_contacts",
            "arguments": {
              "query": "john",
              "limit": 5
            }
          },
          "id": 1
        }
      }
    }
  ]
}
```

### Workflow 2: Create Contact from Form Submission
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "path": "contact-form",
        "method": "POST"
      }
    },
    {
      "name": "Create Contact",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "method": "POST",
        "url": "https://your-project.vercel.app/api/sse",
        "jsonBody": {
          "jsonrpc": "2.0",
          "method": "tools/call",
          "params": {
            "name": "create_contact",
            "arguments": {
              "firstName": "={{$json.firstName}}",
              "lastName": "={{$json.lastName}}",
              "email": "={{$json.email}}",
              "phone": "={{$json.phone}}"
            }
          },
          "id": 2
        }
      }
    }
  ]
}
```

## Step 5: Available Endpoints

Your Vercel deployment provides these endpoints:

- `GET /api/health` - Health check
- `GET /api/tools` - List all available tools
- `GET /api/sse` - SSE connection endpoint
- `POST /api/sse` - Execute MCP commands

## Step 6: Testing Your Deployment

Test with curl:
```bash
# Health check
curl https://your-project.vercel.app/api/health

# List tools
curl https://your-project.vercel.app/api/tools

# Execute a tool
curl -X POST https://your-project.vercel.app/api/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_contacts",
      "arguments": {"limit": 5}
    },
    "id": 1
  }'
```

## Troubleshooting

### Issue: SSE Connection Times Out
- Vercel has a 60-second function timeout limit
- For long-running operations, consider implementing webhooks or polling

### Issue: CORS Errors
- The server is configured to allow all origins by default
- For production, update the CORS settings in `api/index.js`

### Issue: Authentication Errors
- Verify your environment variables are set correctly in Vercel
- Check that your API key is valid and has the necessary permissions

## Security Considerations

1. **API Key Security**: Never expose your API keys in client-side code
2. **CORS**: Restrict CORS to specific domains in production
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Always validate input parameters

## Support

For issues or questions:
- Check the [GitHub repository](https://github.com/your-repo/ghl-mcp-server)
- Review Vercel logs: `vercel logs`
- Test locally first: `npm run start:http`