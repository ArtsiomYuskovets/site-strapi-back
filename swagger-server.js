const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 8080
const API_URL = process.env.API_URL || 'http://localhost:1337'
const swaggerFile = path.join(__dirname, 'swagger.yaml')

const swaggerUIHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>News Site API - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/swagger.yaml",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
`

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  
  if (req.url.startsWith('/api/')) {
    const apiUrl = new URL(API_URL)
    const targetPath = req.url
    
    const proxyHeaders = {}
    for (const key in req.headers) {
      const lowerKey = key.toLowerCase()
      if (lowerKey !== 'host' && lowerKey !== 'connection' && lowerKey !== 'content-length') {
        proxyHeaders[key] = req.headers[key]
      }
    }
    
    let targetPort
    if (apiUrl.port && apiUrl.port !== '') {
      targetPort = parseInt(apiUrl.port, 10)
    } else {
      targetPort = apiUrl.protocol === 'https:' ? 443 : 80
    }
    const options = {
      hostname: apiUrl.hostname,
      port: targetPort,
      path: targetPath,
      method: req.method,
      headers: proxyHeaders
    }

    console.log(`[Proxy] Forwarding ${req.method} ${targetPath} to ${apiUrl.hostname}:${targetPort}`)

    const proxyReq = http.request(options, (proxyRes) => {
      console.log(`[Proxy] Response: ${proxyRes.statusCode} for ${req.method} ${targetPath}`)
      
      const headers = {}
      for (const key in proxyRes.headers) {
        headers[key] = proxyRes.headers[key]
      }
      headers['access-control-allow-origin'] = '*'
      headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
      headers['access-control-allow-headers'] = 'Content-Type, Authorization'
      
      res.writeHead(proxyRes.statusCode, headers)
      proxyRes.pipe(res)
    })

    proxyReq.on('error', (error) => {
      console.error(`[Proxy Error] ${req.method} ${targetPath}:`, error.message)
      res.writeHead(502, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message,
        details: `Failed to connect to ${API_URL}${targetPath}`
      }))
    })

    req.pipe(proxyReq)
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    })
    res.end()
    return
  }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(swaggerUIHTML)
  } else if (req.url === '/swagger.yaml') {
    try {
      const content = fs.readFileSync(swaggerFile, 'utf8')
      res.writeHead(200, { 
        'Content-Type': 'text/yaml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(content)
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Swagger file not found')
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`\n🚀 Swagger UI запущен на http://localhost:${PORT}`)
  console.log(`📄 Откройте браузер и перейдите по адресу выше`)
  console.log(`🔗 API прокси настроен на: ${API_URL}`)
  console.log(`📝 Все запросы к /api/* будут проксироваться на ${API_URL}\n`)
})
