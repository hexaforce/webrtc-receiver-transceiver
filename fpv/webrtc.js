const $ = (id) => document.getElementById(id)
const d = document.documentElement

// --- ICE Handler --------------------------
const iceCandidateHandler = (pc, ws) => {
  pc.onicecandidate = ({ candidate }) => {
    // console.log('ice answer:', candidate)
    candidate && ws.send(JSON.stringify(candidate))
  }
}

// --- Data Channel --------------------------

const dataChannel = {}

const dataChannelHandler = (pc, PROTOCOL) => {
  pc.ondatachannel = ({ channel }) => {
    channel.onopen = ({ target }) => (dataChannel[target.label] = target)
    channel.onmessage = ({ data }) => {
      const msg = JSON.parse(data)
      console.log('incoming:', msg)
      if (msg.longitude && msg.latitude) {
        renderMap([msg.longitude, msg.latitude])
      }
    }
  }
  const channel = pc.createDataChannel(PROTOCOL)
  channel.onopen = ({ target }) => (dataChannel[target.label] = target)
  channel.onmessage = ({ data }) => {
    console.log('2:', data)
  }
}

const sendData = (data) => {
  console.log('sendData:', data)
  dataChannel[PROTOCOL].send(JSON.stringify(data))
}

// --- Media --------------------------

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

// --- Media Transceiver --------------------------

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


// --- Media Receiver --------------------------

const setMediaReceiver = async (video, pc, ws) => {
  pc.ontrack = ({ streams }) => {
    video.srcObject = streams[0]
  }
  ws.onclose = () => video.srcObject.getTracks().forEach((track) => track.stop())
  pc.getTransceivers().forEach((transceiver) => {
    transceiver.direction = 'recvonly'
  })
}


// --- GPS Send Position --------------------------

const sendPosition = async (timeout) => {
  console.log('sendPosition1:', timeout)
  window.navigator.geolocation.getCurrentPosition(
    ({ coords, timestamp }) => {
      const { accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed } = coords
      console.log('sendPosition2:', coords)
      sendData({ accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed, timestamp })
    },
    (err) => {
      console.log(err)
      sendPosition(timeout)
    },
    timeout ? { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 } : null,
  )
}

// const sendOrientation = ({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type }) => {
//   sendData({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type })
// }

const renderMap = (position) => {
//   mapboxgl.accessToken = 'pk.eyJ1IjoicmVsaWNzOSIsImEiOiJjbHMzNHlwbDIwNDczMmtvM2xhNWR0ZzVtIn0.whCzeh6XW7ju4Ja6DR0imw'
//   const map = new mapboxgl.Map({
//     container: 'map',
//     style: 'mapbox://styles/relics9/cm6ppb5z7000501ra6nwl5wl2',
//     zoom: 18,
//     center: position,
//     pitch: 60,
//     bearing: 38,
//     antialias: true, // create the gl context with MSAA antialiasing, so custom layers are antialiased
//   })
}
