const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const fs = require('fs')
const path = require('path')

const PORT = 8000
const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server, path: '/ws' })

let receiver = null
let transceiver = null

wss.on('connection', (ws, req) => {
  const protocol = req.headers['sec-websocket-protocol']

  if (protocol === 'receiver') {
    receiver = ws
    console.log('Receiver connected')
  } else if (protocol === 'transceiver') {
    transceiver = ws
    console.log('Transceiver connected')
  }

  ws.on('message', (message) => {
    const text = message.toString('utf-8')
    if (protocol === 'receiver' && transceiver) {
      transceiver.send(text)
    } else if (protocol === 'transceiver' && receiver) {
      receiver.send(text)
    }
  })

  ws.on('close', () => {
    if (ws === receiver) {
      receiver = null
      // if (transceiver) transceiver.close()
      console.log('Receiver disconnected')
    } else if (ws === transceiver) {
      transceiver = null
      // if (receiver) receiver.close()
      console.log('Transceiver disconnected')
    }
  })
})

app.use((req, res) => {
  let filePath = path.join(__dirname, req.path === '/' ? '/index.html' : req.path)
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(404).send('Not Found')
    } else {
      let contentType = 'text/html; charset=utf-8'
      if (filePath.endsWith('.css')) contentType = 'text/css; charset=utf-8'
      if (filePath.endsWith('.js')) contentType = 'application/javascript; charset=utf-8'
      if (filePath.endsWith('.ico')) contentType = 'image/x-icon'
      res.setHeader('Content-Type', contentType)
      res.send(data)
    }
  })
})

server.listen(PORT, () => {
  console.log(`WebRTC receiver page link: http://127.0.0.1:${PORT}/receiver.html`)
  console.log(`WebRTC transceiver page link: http://127.0.0.1:${PORT}/transceiver.html`)
})
