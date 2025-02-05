const $ = (id) => document.getElementById(id)

const dataChannel = {}

const iceCandidateHandler = (conn, ws) => {
  conn.onicecandidate = ({ candidate }) => candidate && ws.send(JSON.stringify(candidate))
}

const dataChannelHandler = (conn, PROTOCOL) => {
  conn.ondatachannel = ({ channel }) => {
    channel.onopen = ({ target }) => (dataChannel[target.label] = target)
    channel.onmessage = ({ data }) => {
      console.log(data)
    }
  }
  const channel = conn.createDataChannel(PROTOCOL)
  channel.onopen = ({ target }) => (dataChannel[target.label] = target)
  channel.onmessage = ({ data }) => {
    console.log(data)
  }
}

// const sendData = (data) => {
//   dataChannel[PROTOCOL].send(data)
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
  
const mediaCaptureConfig = async (conn, ws) => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  stream.getTracks().forEach((track) => {
    conn.addTrack(track, stream)
  })
  ws.onclose = () => stream.getTracks().forEach((track) => track.stop())
  conn.getTransceivers().forEach((transceiver) => {
    transceiver.direction = 'sendonly'
  })
}

const mediaPlayConfig = async (id, conn, ws) => {
  conn.ontrack = ({ streams }) => ($(id).srcObject = streams[0])
  ws.onclose = () => $(id).srcObject.getTracks().forEach((track) => track.stop())
  conn.getTransceivers().forEach((transceiver) => {
    transceiver.direction = 'recvonly'
  })
}
