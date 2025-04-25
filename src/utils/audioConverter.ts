
export async function convertToWav(audioFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Display file information for debugging
    console.log(`Converting file: ${audioFile.name}, type: ${audioFile.type}, size: ${audioFile.size} bytes`);
    
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        // Make sure we have data to process
        if (!event.target?.result) {
          throw new Error("Failed to read audio file data");
        }
        
        console.log("File loaded successfully, creating audio context");
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        console.log("Decoding audio data...");
        // Decode the audio file
        const audioBuffer = await audioContext.decodeAudioData(event.target.result as ArrayBuffer);
        console.log(`Audio decoded successfully: ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz, ${audioBuffer.length} samples`);
        
        // Create offline context for rendering
        const offlineContext = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        
        // Create buffer source
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        
        console.log("Starting offline rendering...");
        // Render audio
        const renderedBuffer = await offlineContext.startRendering();
        console.log("Rendering completed, converting to WAV format");
        
        // Convert to WAV
        const wavBlob = audioBufferToWav(renderedBuffer);
        const fileName = audioFile.name.replace(/\.[^/.]+$/, "") + ".wav";
        const wavFile = new File([wavBlob], fileName, { type: "audio/wav" });
        console.log(`WAV conversion complete: ${fileName}, size: ${wavFile.size} bytes`);
        
        resolve(wavFile);
      } catch (error) {
        console.error("Audio conversion failed:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error("Error reading audio file:", error);
      reject(error);
    };
    
    // Read the file as an array buffer
    reader.readAsArrayBuffer(audioFile);
  });
}

// Helper function to convert AudioBuffer to WAV format
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  let sample = 0;
  let offset = 0;
  let pos = 0;

  // Write WAV header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"
  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit
  setUint32(0x61746164);                         // "data" chunk
  setUint32(length - pos - 4);                   // chunk length

  // Write interleaved data
  const channels = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      if (sample >= buffer.length) break;
      let val = Math.max(-1, Math.min(1, channels[i][sample]));
      val = val < 0 ? val * 0x8000 : val * 0x7FFF;
      view.setInt16(pos, val, true);
      pos += 2;
    }
    sample++;
    
    // Break the loop if we've processed all samples to avoid infinite loops
    if (sample >= buffer.length) break;
  }

  function setUint16(data: number) {
    view.setUint16(offset, data, true);
    offset += 2;
  }

  function setUint32(data: number) {
    view.setUint32(offset, data, true);
    offset += 4;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
