
export function bufferToWave(abuffer: AudioBuffer, len: number): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let offset = 0;
  let pos = 0;
  
  // Write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length
  
  // Write interleaved data
  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    const channel = abuffer.getChannelData(i);
    if (i === 0) {
      // Only write audio data once (mono output regardless of input channels)
      for (let j = 0; j < len; j++) {
        const sample = Math.max(-1, Math.min(1, channel[j]));
        let value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        value = Math.floor(value);
        view.setInt16(pos, value, true);
        pos += 2;
      }
    }
  }
  
  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

// Format time as MM:SS
export function formatTime(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
