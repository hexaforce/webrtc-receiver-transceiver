"use strict";

/* global RTCRtpScriptTransform */
/* global VideoPipe */

const video1 = document.querySelector("video#video1");
const video2 = document.querySelector("video#video2");
const videoMonitor = document.querySelector("#video-monitor");

const startButton = document.getElementById("startButton");
const callButton = document.getElementById("callButton");
const hangupButton = document.getElementById("hangupButton");

let startToMiddle;
let startToEnd;

let localStream;
let remoteStream;

const SupportsSetCodecPreferences =
  window.RTCRtpTransceiver &&
  "setCodecPreferences" in window.RTCRtpTransceiver.prototype;

let hasEnoughAPIs = !!window.RTCRtpScriptTransform;

if (!hasEnoughAPIs) {
  const SupportsInsertableStreams =
    !!RTCRtpSender.prototype.createEncodedStreams;
  let supportsTransferableStreams = false;
  try {
    const stream = new ReadableStream();
    window.postMessage(stream, "*", [stream]);
    supportsTransferableStreams = true;
  } catch (e) {
    console.error("Transferable streams are not supported.");
  }
  hasEnoughAPIs = SupportsInsertableStreams && supportsTransferableStreams;
}

if (!hasEnoughAPIs) {
  startButton.disabled = true;
  cryptoKey.disabled = true;
  cryptoOffsetBox.disabled = true;
}

startButton.onclick = function start() {
  console.log("Requesting local stream");
  startButton.disabled = true;
  const options = { audio: true, video: true };
  navigator.mediaDevices
    .getUserMedia(options)
    .then(function gotStream(stream) {
      console.log("Received local stream");
      video1.srcObject = stream;
      localStream = stream;
      callButton.disabled = false;
    })
    .catch(function (e) {
      alert("getUserMedia() failed");
      console.log("getUserMedia() error: ", e);
    });
};

const worker = new Worker("./js/worker.js", { name: "E2EE worker" });

function setupSenderTransform(sender) {
  if (window.RTCRtpScriptTransform) {
    sender.transform = new RTCRtpScriptTransform(worker, {
      operation: "encode",
    });
    return;
  }
  const { readable, writable } = sender.createEncodedStreams();
  worker.postMessage({ operation: "encode", readable, writable }, [
    readable,
    writable,
  ]);
}

function setupReceiverTransform(receiver) {
  if (window.RTCRtpScriptTransform) {
    receiver.transform = new RTCRtpScriptTransform(worker, {
      operation: "decode",
    });
    return;
  }
  const { readable, writable } = receiver.createEncodedStreams();
  worker.postMessage({ operation: "decode", readable, writable }, [
    readable,
    writable,
  ]);
}

function maybeSetCodecPreferences({ track, transceiver }) {
  if (!SupportsSetCodecPreferences) return;
  if (track.kind === "audio") {
    const { codecs } = RTCRtpReceiver.getCapabilities("audio");
    const selectedCodecIndex = codecs.findIndex(
      (c) => c.mimeType === "audio/opus"
    );
    const selectedCodec = codecs[selectedCodecIndex];
    codecs.splice(selectedCodecIndex, 1);
    codecs.unshift(selectedCodec);
    transceiver.setCodecPreferences(codecs);
  } else if (track.kind === "video") {
    const { codecs } = RTCRtpReceiver.getCapabilities("video");
    const selectedCodecIndex = codecs.findIndex(
      (c) => c.mimeType === "video/H264"
    );
    const selectedCodec = codecs[selectedCodecIndex];
    codecs.splice(selectedCodecIndex, 1);
    codecs.unshift(selectedCodec);
    transceiver.setCodecPreferences(codecs);
  }
}

function VideoPipe(stream, forceSend, forceReceive, handler) {
  this.pc1 = new RTCPeerConnection({ encodedInsertableStreams: forceSend });
  this.pc2 = new RTCPeerConnection({ encodedInsertableStreams: forceReceive });
  this.pc2.ontrack = handler;
  stream.getTracks().forEach((track) => this.pc1.addTrack(track, stream));
}

VideoPipe.prototype.negotiate = async function () {
  this.pc1.onicecandidate = (e) => this.pc2.addIceCandidate(e.candidate);
  this.pc2.onicecandidate = (e) => this.pc1.addIceCandidate(e.candidate);

  const offer = await this.pc1.createOffer();
  await this.pc2.setRemoteDescription(offer);
  await this.pc1.setLocalDescription(offer);

  const answer = await this.pc2.createAnswer();
  await this.pc1.setRemoteDescription(answer);
  await this.pc2.setLocalDescription(answer);
};

VideoPipe.prototype.close = function () {
  this.pc1.close();
  this.pc2.close();
};

callButton.onclick = function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log("Starting call");
  // 実際の使用例は、中央のボックスがパケットを中継してリッスンすることですが、生のパケットにアクセスできないため、同じビデオを両方の場所に送信するだけです。
  // The real use case is where the middle box relays the packets and listens in, but since we don't have access to raw packets, we just send the same video to both places.
  startToMiddle = new VideoPipe(localStream, true, false, (e) => {
    // Do not setup the receiver transform.
    maybeSetCodecPreferences(e);
    const { streams } = e;
    videoMonitor.srcObject = streams[0];
  });

  startToMiddle.pc1.getSenders().forEach(setupSenderTransform);
  startToMiddle.negotiate();

  startToEnd = new VideoPipe(localStream, true, true, (e) => {
    const { receiver, streams } = e;
    setupReceiverTransform(receiver);
    maybeSetCodecPreferences(e);

    remoteStream = streams[0];
    video2.srcObject = streams[0];
  });

  startToEnd.pc1.getSenders().forEach(setupSenderTransform);
  startToEnd.negotiate();

  console.log("Video pipes created");
};

hangupButton.onclick = function hangup() {
  console.log("Ending call");
  startToMiddle.close();
  startToEnd.close();
  hangupButton.disabled = true;
  callButton.disabled = false;
};
