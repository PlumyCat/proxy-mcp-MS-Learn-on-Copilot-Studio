require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MCP_ENDPOINT = 'https://learn.microsoft.com/api/mcp';

// ======= MIDDLEWARE =======
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ======= UTILITIES FOR SSE =======
function parseSSE(sseData) {
  const lines = sseData.split('\n');
  const events = [];
  let currentEvent = {};

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent.event = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      const data = line.substring(5).trim();
      if (data) {
        try {
          currentEvent.data = JSON.parse(data);
        } catch (e) {
          currentEvent.data = data;
        }
      }
    } else if (line === '') {
      if (currentEvent.event || currentEvent.data) {
        events.push(currentEvent);
        currentEvent = {};
      }
    }
  }

  return events;
}

async function processMCPResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream')) {
    const sseData = await response.text();
    console.log('📡 Raw SSE response:', sseData);

    const events = parseSSE(sseData);
    console.log('📊 Parsed SSE events:', JSON.stringify(events, null, 2));

    const messageEvent = events.find(e => e.event === 'message' || e.data);

    if (messageEvent && messageEvent.data) {
      return messageEvent.data;
    }

    return { events };
  } else {
    return await response.json();
  }
}

// ======= MAIN ROUTES =======

// Health route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'MCP Proxy for Microsoft Learn',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Simple main interface
app.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Proxy - Microsoft Learn</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #0078d4; }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        }
        button {
            background: #0078d4;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover { background: #106ebe; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .result {
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #0078d4;
        }
        .error { border-left-color: #d73a49; background: #ffeaea; }
        .loading { text-align: center; padding: 20px; }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0078d4;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .doc-item {
            margin: 15px 0;
            padding: 15px;
            background: white;
            border-radius: 5px;
            border: 1px solid #eee;
        }
        .doc-title {
            font-weight: bold;
            color: #0078d4;
            margin-bottom: 10px;
        }
        .doc-url a {
            color: #0078d4;
            text-decoration: none;
            font-size: 12px;
        }
        .json-output {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .status.success { background: #d4edda; color: #155724; }
        .status.error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Microsoft Learn MCP Proxy</h1>
        
        <div>
            <button onclick="testHealth()">Test Health</button>
            <button onclick="testTools()">Test Tools</button>
            <button onclick="testDemo()">Test Demo</button>
        </div>
        
        <div>
            <label for="question">Your question about Microsoft/Azure:</label>
            <input type="text" id="question" placeholder="Ex: How to create Azure Functions" value="How to create Azure Functions">
        </div>
        
        <button onclick="searchDocs()" id="searchBtn">Search</button>
        
        <div id="result"></div>
    </div>

    <script>
        async function testHealth() {
            showLoading('Testing Health Check...');
            try {
                const response = await fetch('/health');
                const data = await response.json();
                showResult('✅ Health Check OK', data, false);
            } catch (error) {
                showError('Health Check Failed', error);
            }
        }

        async function testTools() {
            showLoading('Fetching available tools...');
            try {
                const response = await fetch('/tools');
                const data = await response.json();
                showResult('🔧 MCP Tools', data, false);
            } catch (error) {
                showError('Tools Error', error);
            }
        }

        async function testDemo() {
            showLoading('Opening demo...');
            window.open('/demo', '_blank');
            document.getElementById('result').innerHTML = '<div class="result"><div class="status success">✅ Demo opened in a new tab</div></div>';
        }

        async function searchDocs() {
            const question = document.getElementById('question').value;
            const searchBtn = document.getElementById('searchBtn');
            
            if (!question.trim()) {
                alert('Please enter a question');
                return;
            }
            
            searchBtn.disabled = true;
            showLoading('Searching Microsoft Learn documentation...');
            
            try {
                const response = await fetch('/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question })
                });
                
                const data = await response.json();
                
                if (data.result && data.result.content) {
                    displaySearchResults(data.result.content, data.result.isError);
                } else {
                    showError('No results found', data);
                }
                
            } catch (error) {
                showError('Network error', error);
            } finally {
                searchBtn.disabled = false;
            }
        }
        
        function displaySearchResults(content, isError) {
            if (isError) {
                showError('MCP Error', content[0]?.text || 'Unknown error');
                return;
            }
            
            let docs = [];
            try {
                docs = JSON.parse(content[0].text);
            } catch (e) {
                showError('Parsing error', content);
                return;
            }
            
            let html = '<div class="result"><div class="status success">SUCCESS</div>';
            html += '<p><strong>' + docs.length + '</strong> result(s) found:</p>';
            
            docs.forEach(doc => {
                const cleanContent = doc.content.substring(0, 400);
                html += '<div class="doc-item">';
                html += '<div class="doc-title">' + doc.title + '</div>';
                html += '<div>' + cleanContent + '...</div>';
                html += '<div class="doc-url"><a href="' + doc.contentUrl + '" target="_blank">📖 View documentation</a></div>';
                html += '</div>';
            });
            
            html += '</div>';
            document.getElementById('result').innerHTML = html;
        }
        
        function showResult(title, data, isError = false) {
            const resultDiv = document.getElementById('result');
            const statusClass = isError ? 'error' : 'success';
            resultDiv.innerHTML = 
                '<div class="result ' + (isError ? 'error' : '') + '">' +
                '<div class="status ' + statusClass + '">' + title + '</div>' +
                '<div class="json-output">' + JSON.stringify(data, null, 2) + '</div>' +
                '</div>';
        }
        
        function showError(title, details) {
            showResult('❌ ' + title, details, true);
        }
        
        function showLoading(message) {
            document.getElementById('result').innerHTML = 
                '<div class="loading">' +
                '<div class="spinner"></div>' +
                '<p>' + message + '</p>' +
                '</div>';
        }
        
        document.getElementById('question').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchDocs();
            }
        });
    </script>
</body>
</html>`;

  res.send(html);
});

// Simple test route
app.get('/test-direct', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Simple Test</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        button { padding: 20px 40px; font-size: 20px; background: green; color: white; border: none; cursor: pointer; }
        #result { margin-top: 20px; padding: 20px; background: #f0f0f0; font-size: 18px; }
    </style>
</head>
<body>
    <h1>Ultra Simple Test</h1>
    <button onclick="test()">CLICK HERE</button>
    <div id="result">Click the button...</div>
    <script>
        function test() {
            document.getElementById('result').innerHTML = '✅ IT WORKS! ' + new Date().toLocaleTimeString();
        }
    </script>
</body>
</html>`);
});

// Route with preloaded results
app.get('/demo', async (req, res) => {
  try {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "microsoft_docs_search",
          arguments: {
            question: "How to create Azure Functions"
          }
        }
      })
    });

    const data = await processMCPResponse(response);
    const docs = JSON.parse(data.result.content[0].text);

    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Demo Results</title>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #0078d4; }
        .doc { margin: 20px 0; padding: 15px; border: 1px solid #ddd; background: #f9f9f9; }
        .title { font-size: 18px; font-weight: bold; color: #0078d4; margin-bottom: 10px; }
        .content { line-height: 1.5; margin-bottom: 10px; }
        .url { font-size: 12px; }
        .url a { color: #0078d4; text-decoration: none; }
    </style>
</head>
<body>
    <h1>🎉 YOUR MCP PROXY IS WORKING PERFECTLY!</h1>
    <p><strong>Results found:</strong> ${docs.length} documents</p>
    <p><em>Here are the results for the search "How to create Azure Functions":</em></p>`;

    docs.forEach(doc => {
      html += `<div class="doc">
        <div class="title">${doc.title}</div>
        <div class="content">${doc.content.substring(0, 400)}...</div>
        <div class="url">
          <a href="${doc.contentUrl}" target="_blank">📖 Read full documentation</a>
        </div>
      </div>`;
    });

    html += `<hr>
    <p><strong>✅ Conclusion:</strong> Your Microsoft Learn MCP proxy is 100% operational!</p>
    <p>The API successfully retrieves official Microsoft documentation.</p>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    res.send(`<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
    <h1>Error</h1>
    <p>Error while fetching data: ${error.message}</p>
</body>
</html>`);
  }
});

// Main proxy to Microsoft Learn MCP
app.post('/api/mcp', async (req, res) => {
  try {
    console.log('📥 MCP request received:', JSON.stringify(req.body, null, 2));

    if (!req.body.jsonrpc || !req.body.method) {
      return res.status(400).json({
        error: {
          code: -32600,
          message: 'Invalid request - jsonrpc and method required'
        }
      });
    }

    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Proxy/1.0.0 (PowerApps-Compatible)'
      },
      body: JSON.stringify(req.body),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`Microsoft Learn MCP responded with status: ${response.status}`);
    }

    const data = await processMCPResponse(response);
    console.log('📤 Microsoft Learn response:', JSON.stringify(data, null, 2));

    res.status(200).json(data);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({
      error: {
        code: -32603,
        message: 'Proxy internal error',
        details: error.message
      }
    });
  }
});

// List available tools
app.get('/tools', async (req, res) => {
  try {
    console.log('📋 Fetching MCP tools...');

    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Proxy/1.0.0'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      }),
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await processMCPResponse(response);
    res.json(data);
  } catch (error) {
    console.error('❌ Tools fetch error:', error.message);
    res.status(500).json({
      error: 'Unable to fetch tools',
      details: error.message,
      endpoint: MCP_ENDPOINT
    });
  }
});

// Initialize an MCP session
app.post('/initialize', async (req, res) => {
  try {
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: { listChanged: true }
        },
        clientInfo: {
          name: "PowerApps-Proxy",
          version: "1.0.0"
        }
      }
    };

    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(initRequest)
    });

    const data = await processMCPResponse(response);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Initialization failed',
      details: error.message
    });
  }
});

// Simple search in documentation
app.post('/search', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        error: 'The "question" parameter is required'
      });
    }

    const searchRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "microsoft_docs_search",
        arguments: {
          question: question
        }
      }
    };

    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchRequest)
    });

    const data = await processMCPResponse(response);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Search failed',
      details: error.message
    });
  }
});

// 404 error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /tools',
      'GET /demo',
      'GET /test-direct',
      'POST /api/mcp',
      'POST /initialize',
      'POST /search'
    ]
  });
});

// Server startup logs
app.listen(PORT, () => {
  console.log('\n🚀====== MCP PROXY SERVER STARTED ======🚀');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Tools: http://localhost:${PORT}/tools`);
  console.log(`📚 Demo: http://localhost:${PORT}/demo`);
  console.log(`🧪 Simple test: http://localhost:${PORT}/test-direct`);
  console.log(`📚 Search: POST http://localhost:${PORT}/search`);
  console.log(`🔌 MCP Proxy: POST http://localhost:${PORT}/api/mcp`);
  console.log('=====================================\n');
});

module.exports = app;