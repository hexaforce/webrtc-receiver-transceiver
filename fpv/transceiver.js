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

const getPosition = async (timeout) => {
  return new Promise((resolve, reject) => {
    window.navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => resolve([coords.longitude, coords.latitude]),
      (err) => reject(err),
      timeout ? { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 } : null,
    )
  })
}