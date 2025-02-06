const $ = (id) => document.getElementById(id)

const dataChannel = {}

const iceCandidateHandler = (pc, ws) => {
  pc.onicecandidate = ({ candidate }) => {
    console.log('ice answer:', candidate)
    candidate && ws.send(JSON.stringify(candidate))
  }
}

const dataChannelHandler = (pc, PROTOCOL) => {
  pc.ondatachannel = ({ channel }) => {
    channel.onopen = ({ target }) => (dataChannel[target.label] = target)
    channel.onmessage = ({ data }) => {
      console.log(data)
    }
  }
  const channel = pc.createDataChannel(PROTOCOL)
  channel.onopen = ({ target }) => (dataChannel[target.label] = target)
  channel.onmessage = ({ data }) => {
    console.log(data)
  }
}

// const sendData = (data) => {
//   dataChannel[PROTOCOL].send(data)
// }

const setReceiverAnswerCodec = async (pc) => {
  const supportedCodecs = RTCRtpReceiver.getCapabilities('video').codecs
  const preferredOrder = ['video/AV1', 'video/VP9', 'video/H265', 'video/H264', 'video/VP8']
  const [audioTransceiver, videoTransceiver] = pc.getTransceivers()
  if (videoTransceiver) {
    videoTransceiver.setCodecPreferences(
      supportedCodecs.sort((a, b) => {
        const indexA = preferredOrder.indexOf(a.mimeType)
        const indexB = preferredOrder.indexOf(b.mimeType)
        const orderA = indexA >= 0 ? indexA : Number.MAX_VALUE
        const orderB = indexB >= 0 ? indexB : Number.MAX_VALUE
        return orderA - orderB
      }),
    )
  }
}

const setMediaTransceiver = async (stream, pc, ws) => {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream)
    console.log('addTrack:', stream)
  })
  ws.onclose = () => stream.getTracks().forEach((track) => track.stop())
  pc.getTransceivers().forEach((transceiver) => {
    transceiver.direction = 'sendonly'
  })
}

const setMediaReceiver = async (video, pc, ws) => {
  pc.ontrack = ({ streams }) => {
    video.srcObject = streams[0]
  }
  ws.onclose = () => video.srcObject.getTracks().forEach((track) => track.stop())
  pc.getTransceivers().forEach((transceiver) => {
    transceiver.direction = 'recvonly'
  })
}
