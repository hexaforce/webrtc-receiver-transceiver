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
