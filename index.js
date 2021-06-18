require('dotenv').config()

const path = require('path')
const fs = require('fs')
const express = require('express') // https://expressjs.com/en/4x/api.html
const aedes = require('aedes')() // https://github.com/moscajs/aedes/blob/main/docs/Aedes.md
const Database = require('better-sqlite3') // https://github.com/JoshuaWise/better-sqlite3/blob/HEAD/docs/api.md
const { verify: hcaptchaVerify } = require('hcaptcha') // https://github.com/vastus/node-hcaptcha
const colorsys = require('colorsys')

// Constants
const USES_PER_CAPTCHA = 5
const CAPTCHA_TIMEOUT = 5 * 60 * 1000
const DB_FILE = 'db.sqlite'
const PK_FILE = 'pk.pem'
const CERT_FILE = 'cert.pem'

// SQLite
const dbPath = path.join(__dirname, DB_FILE)
const db = new Database(dbPath /* { verbose: console.log } */)

// MQTT Server
const options = {
  key: fs.readFileSync(PK_FILE),
  cert: fs.readFileSync(CERT_FILE)
}
const server = require('tls').createServer(options, aedes.handle)
server.listen(process.env.MQTT_PORT, function () {
  console.log('MQTT Server listening at ', process.env.MQTT_PORT)
})
aedes.authenticate = function (client, username, password, callback) {
  callback(null, username === process.env.MQTT_USERNAME && password.toString() === process.env.MQTT_PASSWORD)
}

// Express Server
const expressApp = express()
const expressServer = require('http').createServer(expressApp)

expressApp.use('/', express.static('public'))

expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

expressApp.use((req, res) => {
  res.redirect('/')
})

// Socket Server
const io = require('socket.io')(expressServer)

io.on('connection', (client) => {
  const clientIp = client.handshake.headers['x-real-ip']

  const actions = fetchActions()
  for (const action of actions) {
    action.color = colorsys.rgbToHex({ r: action.red, g: action.green, b: action.blue })
    client.emit('action', action)
  }

  client.on('submit', async (msg) => {
    // TODO: Validate Fields

    const validCaptcha = await validateCaptcha(msg.hcaptcha, clientIp)

    if (validCaptcha) {
      if (maxedCaptcha(msg.hcaptcha)) client.emit('resetCaptcha')

      msg = insertAction(msg)

      if (msg.activated) {
        aedes.publish({ topic: 'on' })
      } else {
        aedes.publish({ topic: 'off' })
      }

      const color = colorsys.hexToRgb(msg.color)
      aedes.publish({ topic: 'red' })
      aedes.publish({ topic: 'red', payload: String(color.r) })
      aedes.publish({ topic: 'green', payload: String(color.g) })
      aedes.publish({ topic: 'blue', payload: String(color.b) })

      io.emit('action', {
        timestamp: msg.timestamp,
        nombre: msg.nombre,
        dedicatoria: msg.dedicatoria,
        activated: msg.activated,
        color: msg.color
      })
    } else {
      client.emit('resetCaptcha')
    }
  })
})

// Start HTTP + WS server
expressServer.listen(process.env.HTTP_PORT, () => {
  console.log('Express server listening at ', process.env.HTTP_PORT)
})

function selectCaptcha (hcaptchaToken) {
  return db.prepare('SELECT * FROM captchas WHERE token = $token').get({ token: hcaptchaToken })
}
function insertCaptcha (captcha) {
  captcha.valid = Number(captcha.valid)
  db.prepare('INSERT INTO captchas (token, valid, uses, generatedBy, timestamp) VALUES ($token, $valid, $uses, $generatedBy, $timestamp)').run(captcha)
}
function increaseCaptchaUses (hcaptchaToken) {
  const captcha = selectCaptcha(hcaptchaToken)
  captcha.uses++
  db.prepare('UPDATE captchas SET uses=$uses WHERE token = $token').run(captcha)
}
function maxedCaptcha (hcaptchaToken) {
  return selectCaptcha(hcaptchaToken).uses >= USES_PER_CAPTCHA
}

function insertAction (msg) {
  const color = colorsys.hexToRgb(msg.color)
  msg.red = color.r
  msg.green = color.g
  msg.blue = color.b
  msg.activated = Number(msg.activated)
  msg.timestamp = Date.now()
  msg.captcha = msg.hcaptcha
  db.prepare('INSERT INTO actions (nombre, dedicatoria, activated, red, green, blue, timestamp, captcha) VALUES ($nombre, $dedicatoria, $activated, $red, $green, $blue, $timestamp, $captcha)').run(msg)

  return msg
}

function fetchActions () {
  return db.prepare('SELECT nombre, dedicatoria, activated, red, green, blue, timestamp FROM actions ORDER BY timestamp ASC LIMIT 10').all()
}

async function validateCaptcha (hcaptchaToken, clientIp) {
  let captcha = selectCaptcha(hcaptchaToken)

  if (!captcha) {
    const captchaResult = await hcaptchaVerify(process.env.HCAPTCHA_SECRET, hcaptchaToken)
    captcha = {
      token: hcaptchaToken,
      valid: captchaResult.success,
      uses: 0,
      generatedBy: clientIp,
      timestamp: new Date(captchaResult.challenge_ts).getTime()
    }
    insertCaptcha(captcha)
  }

  if (!captcha.valid) return false
  if (Date.now() > captcha.timestamp + CAPTCHA_TIMEOUT) return false
  if (captcha.uses >= USES_PER_CAPTCHA) return false

  increaseCaptchaUses(hcaptchaToken)

  return true
}
