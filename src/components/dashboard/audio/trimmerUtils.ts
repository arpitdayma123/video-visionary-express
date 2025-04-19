
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
  setUint32(abuffer.sampleRate); // Sample rate
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length
  
  // Ensure correct interleaving of audio channels
  if (numOfChan === 1) {
    // For mono, directly write samples
    const channel = abuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      if (i < channel.length) {
        const sample = Math.max(-1, Math.min(1, channel[i]));
        let value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        value = Math.floor(value);
        view.setInt16(pos, value, true);
        pos += 2;
      }
    }
  } else {
    // For stereo or more channels, interleave properly
    for (let i = 0; i < len; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        const channel = abuffer.getChannelData(ch);
        if (i < channel.length) {
          const sample = Math.max(-1, Math.min(1, channel[i]));
          let value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          value = Math.floor(value);
          view.setInt16(pos, value, true);
          pos += 2;
        }
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
