import sounddevice as sd
import webrtcvad
import queue
import sys
import json
import time
import numpy as np

class AudioStream:
    def __init__(self, rate=16000, chunk_duration_ms=30):
        self.rate = rate
        self.chunk_duration_ms = chunk_duration_ms
        self.chunk_size = int(rate * chunk_duration_ms / 1000)
        self.vad = webrtcvad.Vad(3) # Aggressiveness: 0-3
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.stream = None

    def start(self):
        self.is_recording = True
        
        def callback(indata, frames, time, status):
            if status:
                print(status, file=sys.stderr)
            if self.is_recording:
                # Convert float32 to int16 for VAD
                # indata is (frames, channels) float32 in range [-1.0, 1.0]
                audio_data = (indata * 32767).astype(np.int16)
                self.audio_queue.put(audio_data.tobytes())

        self.stream = sd.InputStream(
            channels=1,
            samplerate=self.rate,
            blocksize=self.chunk_size,
            dtype='float32', # sounddevice native
            callback=callback
        )
        self.stream.start()
        # sys.stderr.write("Audio stream started\n")

    def stop(self):
        self.is_recording = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        # sys.stderr.write("Audio stream stopped\n")

    def generator(self):
        """Yields audio chunks containing speech."""
        num_silent_chunks = 0
        speech_buffer = []
        is_speech_active = False
        
        while self.is_recording or not self.audio_queue.empty():
            try:
                # Get raw bytes from queue (already int16)
                chunk = self.audio_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            # Verify chunk size (VAD is picky)
            # 16000Hz * 30ms = 480 samples * 2 bytes = 960 bytes
            if len(chunk) != self.chunk_size * 2: 
                continue

            is_speech = self.vad.is_speech(chunk, self.rate)
            
            if is_speech:
                if not is_speech_active:
                    is_speech_active = True
                speech_buffer.append(chunk)
                num_silent_chunks = 0
            else:
                if is_speech_active:
                    speech_buffer.append(chunk)
                    num_silent_chunks += 1
                    # End of speech threshold (approx 600ms)
                    if num_silent_chunks > 20: 
                        is_speech_active = False
                        yield b''.join(speech_buffer)
                        speech_buffer = []
                        num_silent_chunks = 0
    
    def get_devices(self):
        devices = []
        try:
            sd_devices = sd.query_devices()
            for i, dev in enumerate(sd_devices):
                if dev['max_input_channels'] > 0:
                    devices.append({
                        "id": i, 
                        "name": dev['name'],
                        "default": i == sd.default.device[0]
                    })
        except Exception as e:
            sys.stderr.write(f"Error listing devices: {e}\n")
        return devices

if __name__ == "__main__":
    # Test
    stream = AudioStream()
    print(json.dumps(stream.get_devices(), indent=2))
