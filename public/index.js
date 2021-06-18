/* global io location hcaptcha */

const inputForm = document.getElementById('inputForm')
const inputNombre = document.getElementById('inputNombre')
const inputDedicatoria = document.getElementById('inputDedicatoria')
const inputActivated = document.getElementById('checkStatus')
const inputColor = document.getElementById('inputColor')
const actionsTable = document.getElementById('actions-table')

const socket = io.connect(location.toString())

socket.on('connect', function (data) {
})

inputForm.addEventListener('submit', (ev) => {
  ev.preventDefault()

  // Nos aseguramos de que el captcha haya sido resuelto
  // Si no es así, lo forzamos
  const hcaptchaResponse = hcaptcha.getResponse()
  if (!hcaptchaResponse) return hcaptcha.execute()

  const msg = {
    nombre: inputNombre.value,
    dedicatoria: inputDedicatoria.value,
    activated: inputActivated.checked,
    color: inputColor.value,
    hcaptcha: hcaptchaResponse
  }

  socket.emit('submit', msg)
})

socket.on('resetCaptcha', () => {
  hcaptcha.reset()
})

socket.on('action', (msg) => {
  console.log(msg)
  const row = actionsTable.insertRow(1)
  const fecha = row.insertCell(0)
  const accion = row.insertCell(1)
  const nombre = row.insertCell(2)
  const dedicatoria = row.insertCell(3)
  const color = row.insertCell(4)
  fecha.innerText = (new Date(msg.timestamp)).toLocaleString('es-es')
  accion.innerHTML = `<span style="font-weight: bold; color: ${msg.activated ? 'Green' : 'Red'}">${msg.activated ? 'Encender' : 'Apagar'}<span>`
  nombre.innerText = msg.nombre
  dedicatoria.innerText = msg.dedicatoria
  color.style.backgroundColor = msg.color

  const originalBackgroundColor = row.style.backgroundColor
  row.style.backgroundColor = '#90EE90'

  setTimeout(() => {
    row.style.backgroundColor = originalBackgroundColor
  }, 5 * 1000)

  inputColor.value = msg.color
  inputActivated.checked = msg.activated
})

socket.on('error', function (err) {
  console.error('WS Error:', err)
})
