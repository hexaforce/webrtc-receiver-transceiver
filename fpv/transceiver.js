const PROTOCOL = 'transceiver'

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

const sendPosition = async (timeout) => {
  window.navigator.geolocation.getCurrentPosition(
    ({ coords, timestamp }) => {
      const { accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed } = coords
      sendData(JSON.stringify({ accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed, timestamp }))
    },
    (err) => console.error(err),
    timeout ? { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 } : null,
  )
}

function sendOrientation({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type }) {
  sendData({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type })
}
