const PROTOCOL = 'receiver'

const dataChannel = {}
const dataChannelHandler = (channel) => {
  channel.onopen = ({ target }) => (dataChannel[target.label] = target)
  channel.onmessage = receiveData
}

const sendData = (data) => {
  dataChannel[PROTOCOL].send(data)
}

const receiveData = ({ data }) => {
  console.log(data)
}




const $ = (id) => document.getElementById(id)
const d = document.documentElement

// const dataChannel = {}

// setInterval(async () => {
//   dataChannel[PROTOCOL].send(PROTOCOL)
// }, 1000)

// function dataChannelHandler(channel) {
//   channel.onopen = ({ target }) => (dataChannel[target.label] = target)
//   channel.onmessage = ({ data }) => console.log(channel.label + '.OnMessage', data)
// }

function preferredVideoCodecs() {
  const supportedCodecs = RTCRtpReceiver.getCapabilities('video').codecs
  const preferredOrder = ['video/AV1', 'video/VP9', 'video/H265', 'video/H264', 'video/VP8']
  return supportedCodecs.sort((a, b) => {
    const indexA = preferredOrder.indexOf(a.mimeType)
    const indexB = preferredOrder.indexOf(b.mimeType)
    const orderA = indexA >= 0 ? indexA : Number.MAX_VALUE
    const orderB = indexB >= 0 ? indexB : Number.MAX_VALUE
    return orderA - orderB
  })
}

function ongeolocation({ coords, timestamp }) {
  const { accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed } = coords
  const position = { accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed, timestamp }
  console.log(position)
}

function onorientation({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type }) {
  const orientation = { isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type }
  console.log(orientation)
}

// if (window.navigator) window.navigator.geolocation.getCurrentPosition(ongeolocation, (err) => console.error(err), { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
//   window.ondeviceorientation = onorientation
//   window.ondeviceorientationabsolute = onorientation
