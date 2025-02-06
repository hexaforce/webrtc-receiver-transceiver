const $ = (id) => document.getElementById(id)
const d = document.documentElement

const dataChannel = {}

const iceCandidateHandler = (pc, ws) => {
  pc.onicecandidate = ({ candidate }) => {
    // console.log('ice answer:', candidate)
    candidate && ws.send(JSON.stringify(candidate))
  }
}

const dataChannelHandler = (pc, PROTOCOL) => {
  pc.ondatachannel = ({ channel }) => {
    channel.onopen = ({ target }) => (dataChannel[target.label] = target)
    channel.onmessage = ({ data }) => {
      const msg = JSON.parse(data)
      if (msg.longitude && msg.latitude) {
        // [msg.longitude, msg.latitude]
      }
      
      console.log("1:",data)
      // {"accuracy":13.396,"altitude":null,"altitudeAccuracy":null,"heading":null,"latitude":35.6935188,"longitude":139.5820828,"speed":null,"timestamp":1738844377615}
    }
  }
  const channel = pc.createDataChannel(PROTOCOL)
  channel.onopen = ({ target }) => (dataChannel[target.label] = target)
  channel.onmessage = ({ data }) => {
    console.log("2:",data)
  }
}

const sendData = (data) => {
  console.log('sendData:', data)
  dataChannel[PROTOCOL].send(JSON.stringify(data))
}

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
    // console.log('addTrack:', stream)
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

const sendPosition = async (timeout) => {
  window.navigator.geolocation.getCurrentPosition(
    ({ coords, timestamp }) => {
      const { accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed } = coords
      sendData({ accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed, timestamp })
    },
    (err) => console.error(err),
    timeout ? { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 } : null,
  )
}

function sendOrientation({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type }) {
  sendData({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type })
}
