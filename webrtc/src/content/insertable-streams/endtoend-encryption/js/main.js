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
// eslint-disable-next-line no-unused-vars
let remoteStream;

// Preferring a certain codec is an expert option without GUI.
// Use opus by default.
// eslint-disable-next-line prefer-const
let preferredAudioCodecMimeType = "audio/opus";
// Use VP8 by default to limit depacketization issues.
// eslint-disable-next-line prefer-const
let preferredVideoCodecMimeType = "video/VP8";

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

function maybeSetCodecPreferences(trackEvent) {
  if (!SupportsSetCodecPreferences) return;
  if (trackEvent.track.kind === "audio" && preferredAudioCodecMimeType) {
    const { codecs } = RTCRtpReceiver.getCapabilities("audio");
    const selectedCodecIndex = codecs.findIndex(
      (c) => c.mimeType === preferredAudioCodecMimeType
    );
    const selectedCodec = codecs[selectedCodecIndex];
    codecs.splice(selectedCodecIndex, 1);
    codecs.unshift(selectedCodec);
    trackEvent.transceiver.setCodecPreferences(codecs);
  } else if (trackEvent.track.kind === "video" && preferredVideoCodecMimeType) {
    const { codecs } = RTCRtpReceiver.getCapabilities("video");
    const selectedCodecIndex = codecs.findIndex(
      (c) => c.mimeType === preferredVideoCodecMimeType
    );
    const selectedCodec = codecs[selectedCodecIndex];
    codecs.splice(selectedCodecIndex, 1);
    codecs.unshift(selectedCodec);
    trackEvent.transceiver.setCodecPreferences(codecs);
  }
}

callButton.onclick = function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log("Starting call");
  // The real use case is where the middle box relays the
  // packets and listens in, but since we don't have
  // access to raw packets, we just send the same video
  // to both places.
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
