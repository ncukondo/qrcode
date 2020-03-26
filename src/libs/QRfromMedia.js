import { derived, writable, get } from "svelte/store";
export { startCamera, startCapture, stop, toggleCamera, toggleCapture, setVideoElement, reset };
export let width = 500;
export let height = 500;

const value = writable('');
const reading = writable(false);

/**
 * RxStream of qrdata
 * @type {Readable<string>}
 */
export const qrdata$ = derived(value, $value => $value);
/**
 * RxStream whether reading or nor
 * @type {Readable<boolean>}
 */
export const isReading$ = derived(reading, $reading => $reading);

let video = null;
let _videoElement = null;
let mediaStream = null;

/**
 * setVideo to view camera or capture
 * @param {string | HTMLElement} elm
 * @return {void} 
 */
function setVideoElement(elm) {
  _videoElement = elm;
}

function getVideoElement() {
  if (typeof _videoElement === "string") {
    return document.querySelector(_videoElement);
  } else {
    return _videoElement;
  }

}

function reset() {
  value.set("");
}


async function startAnalyzing() {
  if (!get(reading)) return;
  const [height, width] = [video.videoHeight, video.videoWidth];
  const canv = document.createElement("canvas");
  canv.height = height;
  canv.width = width;

  const context = canv.getContext("2d");
  let jsQRModule;

  const interval = setInterval(async () => {
    if (!get(reading) || !video || video.paused || video.ended) {
      clearInterval(interval);
      stop();
      return;
    }
    console.log("search .....");
    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    jsQRModule = jsQRModule || await import("jsqr")
    const code = jsQRModule.default(imageData.data, width, height);
    if (code && code.data !== get(value)) {
      console.log("Found QR code", code, code.data);
      value.set(code.data);
    }
  }, 500);
}


async function startReading(mediaFunc) {
  if (get(reading)) stop();
  reading.set(true);
  mediaStream = await mediaFunc();
  if (getVideoElement()) {
    video = getVideoElement();
  } else {
    video = document.createElement("video");
    video.height = height;
    video.width = width;
  }
  video.srcObject = mediaStream;
  video.onloadedmetadata = () => {
    if (get(reading)) {
      console.log("video activated");
      video.play();
      startAnalyzing();
    } else {
      stop();
    }
  };
}

function startCamera() {
  console.log("startCamera");
  startReading(navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices, {
    audio: false,
    video: {
      width,
      height,
      frameRate: { ideal: 5, max: 15 },
      facingMode: { exact: "environment" }
    }
  }));
}

function startCapture() {
  console.log("startCapture");
  startReading(navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices,
    {
      audio: false,
      video: {
        width,
        height,
        frameRate: { ideal: 5, max: 15 },
      }
    }));
}

function stop() {
  if (video) {
    video.pause();
  }
  if (mediaStream)
    mediaStream.getVideoTracks().forEach(track => track.stop());
  mediaStream = null;
  video = null;
  reading.set(false);
  console.log("stopped");
}

function toggleCamera() {
  if (get(reading)) {
    stop();
  } else {
    startCamera();
  }
}

function toggleCapture() {
  if (get(reading)) {
    stop();
  } else {
    startCapture();
  }
}
