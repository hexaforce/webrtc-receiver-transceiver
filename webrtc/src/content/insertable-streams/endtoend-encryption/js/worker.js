"use strict";

function handleTransform(operation, readable, writable) {
  if (operation === "encode") {
    const encodeTransformStream = new TransformStream({
      transform: (encodedFrame, controller) => {
        controller.enqueue(encodedFrame);
      },
    });
    readable.pipeThrough(encodeTransformStream).pipeTo(writable);
  } else if (operation === "decode") {
    const decodeTransformStream = new TransformStream({
      transform: (encodedFrame, controller) => {
        controller.enqueue(encodedFrame);
      },
    });
    readable.pipeThrough(decodeTransformStream).pipeTo(writable);
  }
}

// Handler for messages, including transferable streams.
onmessage = ({ data }) => {
  const { operation, readable, writable } = data;
  if (operation === "encode" || operation === "decode") {
    return handleTransform(operation, readable, writable);
  }
};

// Handler for RTCRtpScriptTransforms.
if (self.RTCTransformEvent) {
  self.onrtctransform = (event) => {
    const { options, readable, writable } = event.transformer;
    handleTransform(options.operation, readable, writable);
  };
}
