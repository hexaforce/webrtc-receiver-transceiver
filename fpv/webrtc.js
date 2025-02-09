const $ = (id) => document.getElementById(id)
const d = document.documentElement

import { renderMap } from './map.js'

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
    channel.onopen = ({ target }) => {
      dataChannel[target.label] = target
      if (PROTOCOL === 'transceiver' && target.label === 'receiver') {
        sendPosition(10000)
      }
    }
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
var PROTOCOL = null

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

const setupTransceiver = (wsUrl) => {
  PROTOCOL = 'transceiver'
  var ws = new WebSocket(wsUrl, PROTOCOL)
  var pc
  ws.onopen = async () => console.log('opne ws')
  ws.onclose = async () => console.log('close ws')
  ws.onmessage = async ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.OfferOptions) {
      const { offerToReceiveVideo, offerToReceiveAudio } = msg.OfferOptions
      const stream = await navigator.mediaDevices.getUserMedia({ video: offerToReceiveVideo, audio: offerToReceiveAudio })
      pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' })
      setMediaTransceiver(stream, pc, ws)
      iceCandidateHandler(pc, ws)
      dataChannelHandler(pc, PROTOCOL)
      ws.send(JSON.stringify({ active: stream.active }))
    } else {
      if (msg.type) {
        // console.log('offer received:', msg.sdp)
        await pc.setRemoteDescription(msg)
        setReceiverAnswerCodec(pc)
        const answer = await pc.createAnswer()
        // console.log('answer:', answer.sdp)
        await pc.setLocalDescription(answer)
        ws.send(JSON.stringify(answer))
      } else {
        // console.log('ice:', msg)
        await pc.addIceCandidate(msg)
      }
    }
  }
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

const setupReceiver = (wsUrl) => {
  PROTOCOL = 'receiver'
  var ws = new WebSocket(wsUrl, PROTOCOL)
  var pc
  const OfferOptions = { offerToReceiveAudio: true, offerToReceiveVideo: true }
  ws.onopen = async () => {
    console.log('opne ws')
    ws.send(JSON.stringify({ OfferOptions }))
  }
  ws.onclose = async () => console.log('close ws')
  ws.onmessage = async ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.active) {
      pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' })
      iceCandidateHandler(pc, ws)
      dataChannelHandler(pc, PROTOCOL)
      setMediaReceiver($('stream'), pc, ws)
      const offer = await pc.createOffer(OfferOptions)
      // console.log('offer:', offer.sdp)
      await pc.setLocalDescription(offer)
      ws.send(JSON.stringify(offer))
    } else {
      if (msg.type) {
        // console.log('answer:', msg.sdp)
        await pc.setRemoteDescription(msg)
      } else {
        // console.log('ice:', msg)
        await pc.addIceCandidate(msg)
      }
    }
  }
}

// --- GPS Send Position --------------------------

const sendPosition = async (timeout) => {
  window.navigator.geolocation.getCurrentPosition(
    ({ coords, timestamp }) => {
      const { accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed } = coords
      sendData({ accuracy, altitude, altitudeAccuracy, heading, latitude, longitude, speed, timestamp })
    },
    (err) => {
      console.log('Error:', err)
      sendPosition(timeout)
    },
    timeout ? { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 } : null,
  )
}

// const sendOrientation = ({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type }) => {
//   sendData({ isTrusted, absolute, alpha, beta, bubbles, cancelBubble, cancelable, composed, defaultPrevented, eventPhase, gamma, returnValue, timeStamp, type })
// }

export { setupReceiver, setupTransceiver }
