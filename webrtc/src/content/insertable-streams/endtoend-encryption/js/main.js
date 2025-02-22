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

if (window.RTCRtpScriptTransform) {
  const stream = new ReadableStream();
  window.postMessage(stream, "*", [stream]);
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

function VideoPipe(stream, forceSend, forceReceive, handler) {
  this.pc1 = new RTCPeerConnection({ encodedInsertableStreams: forceSend });
  this.pc2 = new RTCPeerConnection({ encodedInsertableStreams: forceReceive });
  this.pc2.ontrack = handler;
  stream.getTracks().forEach((track) => this.pc1.addTrack(track, stream));
}

VideoPipe.prototype.negotiate = async function () {
  this.pc1.onicecandidate = ({ candidate }) =>
    this.pc2.addIceCandidate(candidate);
  this.pc2.onicecandidate = ({ candidate }) =>
    this.pc1.addIceCandidate(candidate);

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
  // The real use case is where the middle box relays the packets and listens in, but since we don't have access to raw packets, we just send the same video to both places.
  startToMiddle = new VideoPipe(localStream, true, false, (e) => {
    // Do not setup the receiver transform.
    const { streams } = e;
    videoMonitor.srcObject = streams[0];
  });

  startToMiddle.pc1.getSenders().forEach(setupSenderTransform);
  startToMiddle.negotiate();

  startToEnd = new VideoPipe(localStream, true, true, (e) => {
    const { receiver, streams } = e;
    setupReceiverTransform(receiver);

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
