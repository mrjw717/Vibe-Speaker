import { useEffect, useState, useRef } from 'react'
import { Mic, X, ChevronDown, Settings2, Copy, Check, Zap, Moon, Sun, Laptop, LayoutDashboard, ListPlus, RefreshCw, CopyCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AudioDevice {
  deviceId: string
  label: string
}

interface HistoryItem {
  id: number
  transcription: string
  timestamp: string
  duration: number
}

type Theme = 'dark' | 'light' | 'system'
type ViewMode = 'live' | 'history'
type TranscribeMode = 'append' | 'replace'

function App() {
  const [status, setStatus] = useState<string>('Ready')
  const [view, setView] = useState<ViewMode>('live')
  const [mode, setMode] = useState<TranscribeMode>('append')
  const [autoCopy, setAutoCopy] = useState(false) // New Auto-Copy State
  const [isListening, setIsListening] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [showDeviceMenu, setShowDeviceMenu] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [opacity, setOpacity] = useState(80)
  
  // Theme State
  const [theme, setTheme] = useState<Theme>('system')
  const [isDark, setIsDark] = useState(true)

  // Audio State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const silenceTimeoutRef = useRef<number | null>(null)
  const isSpeakingRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const textEndRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Config
  const API_URL = "http://localhost:62000/transcribe"
  const HEALTH_URL = "http://localhost:62000/health"
  const HISTORY_URL = "http://localhost:62000/history"
  const SILENCE_THRESHOLD = 0.01
  const SILENCE_DURATION = 1200

  const [micShortcut, setMicShortcut] = useState('CommandOrControl+Shift+Alt+M')
  const [visibilityShortcut, setVisibilityShortcut] = useState('CommandOrControl+Shift+Alt+H')

  // --- Shortcut Registration ---
  useEffect(() => {
     const register = async () => {
         const ipc = (window as any).electron?.ipcRenderer
         if (!ipc) return
         await ipc.invoke('register-shortcut', 'toggle-mic', micShortcut)
         await ipc.invoke('register-shortcut', 'toggle-visibility', visibilityShortcut)
     }
     register()
  }, [micShortcut, visibilityShortcut])

  // --- Theme Logic ---
  useEffect(() => {
    const updateTheme = () => {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const shouldUseDark = theme === 'system' ? systemDark : theme === 'dark'
      setIsDark(shouldUseDark)
      if (shouldUseDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
    updateTheme()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateTheme)
    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [theme])

  const cycleTheme = () => {
    const modes: Theme[] = ['system', 'dark', 'light']
    const nextIndex = (modes.indexOf(theme) + 1) % modes.length
    setTheme(modes[nextIndex])
  }

  const ThemeIcon = () => {
    if (theme === 'system') return <Laptop size={14} />
    if (theme === 'dark') return <Moon size={14} />
    return <Sun size={14} />
  }

  const ShortcutRecorder = ({ label, shortcut, onChange }: { label: string, shortcut: string, onChange: (s: string) => void }) => {
      const [isRecording, setIsRecording] = useState(false)
      
      useEffect(() => {
          if (!isRecording) return
          const handleKeyDown = (e: KeyboardEvent) => {
              e.preventDefault()
              e.stopPropagation()
              
              const modifiers = []
              if (e.metaKey || e.ctrlKey) modifiers.push('CommandOrControl')
              if (e.shiftKey) modifiers.push('Shift')
              if (e.altKey) modifiers.push('Alt')
              
              let key = e.key.toUpperCase()
              if (key === 'CONTROL' || key === 'SHIFT' || key === 'ALT' || key === 'META') return

              const final = [...modifiers, key].join('+')
              onChange(final)
              setIsRecording(false)
          }
          
          window.addEventListener('keydown', handleKeyDown)
          return () => window.removeEventListener('keydown', handleKeyDown)
      }, [isRecording])

      return (
          <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">{label}</span>
              <button 
                  onClick={() => setIsRecording(true)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono border transition-all 
                  ${isRecording 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500 animate-pulse' 
                      : (isDark ? 'border-white/10 bg-black/30 text-gray-300 hover:border-white/20' : 'border-black/5 bg-white/50 text-gray-600 hover:border-black/10')
                  }`}
              >
                  {isRecording ? 'Press Keys...' : shortcut}
              </button>
          </div>
      )
  }

  // --- Initialization & Connections ---
  useEffect(() => {
    // Start Local Backend (if packaged)
    ;(window as any).electron?.ipcRenderer.invoke('start-backend').catch(console.error)

    // Check Backend
    const checkConnection = async () => {
      try {
        const c = new AbortController()
        setTimeout(() => c.abort(), 2000)
        await fetch(HEALTH_URL, { signal: c.signal })
        setIsConnected(true)
      } catch { setIsConnected(false) }
    }
    checkConnection()
    const interval = setInterval(checkConnection, 10000)

    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const devs = await navigator.mediaDevices.enumerateDevices()
        const inputs = devs.filter(d => d.kind === 'audioinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 5)}` }))
        setDevices(inputs)
        if (inputs.length > 0) setSelectedDeviceId(inputs[0].deviceId)
      } catch (e) { console.error(e) }
    }
    getDevices()

    const removeListener = (window as any).electron?.ipcRenderer.on('toggle-mic', () => {
       setIsListening(prev => !prev)
    })

    return () => {
        clearInterval(interval)
        removeListener && removeListener()
    }
  }, [])

  // --- Fetch History ---
  useEffect(() => {
    if (view === 'history') {
      fetch(HISTORY_URL + "?limit=20")
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(console.error)
    }
  }, [view])

  // --- Visualizer ---
  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const bars = 40
    const step = Math.floor(bufferLength / bars)
    const width = canvas.width / bars
    
    ctx.shadowBlur = 10
    ctx.shadowColor = isSpeakingRef.current ? (isDark ? '#34d399' : '#059669') : (isDark ? '#60a5fa' : '#3b82f6')

    for (let i = 0; i < bars; i++) {
      const value = dataArray[i * step]
      const percent = value / 255
      const height = Math.max(percent * canvas.height * 0.8, 4)
      const x = i * width
      const y = (canvas.height - height) / 2
      const colorBase = isSpeakingRef.current ? (isDark ? '52, 211, 153' : '16, 185, 129') : (isDark ? '96, 165, 250' : '59, 130, 246')
      ctx.fillStyle = `rgba(${colorBase}, ${0.4 + percent * 0.6})`
      ctx.beginPath()
      ctx.roundRect(x + 2, y, width - 4, height, 4)
      ctx.fill()
    }

    const volume = dataArray.reduce((a, b) => a + b) / bufferLength / 255
    if (isListening && volume > SILENCE_THRESHOLD) {
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true
        setStatus('Detecting Voice...')
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
      }
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = window.setTimeout(monitorSilence, SILENCE_DURATION)
    }
    animationFrameRef.current = requestAnimationFrame(drawVisualizer)
  }

  // --- Audio Logic ---
  useEffect(() => {
    if (!isListening) {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, 300, 100)
      return
    }
    const startAudio = async () => {
      // Clear text if in replace mode
      if (mode === 'replace') setCurrentText('')

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true })
        const audioCtx = new AudioContext()
        const analyser = audioCtx.createAnalyser()
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.5
        audioContextRef.current = audioCtx
        analyserRef.current = analyser
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          if (blob.size > 1000) await sendAudio(blob)
          audioChunksRef.current = []
          if (isListening) recorder.start()
        }
        recorder.start()
        setStatus('Listening...')
        drawVisualizer()
      } catch (err) { console.error(err); setStatus('Mic Error'); setIsListening(false) }
    }
    startAudio()
    return () => { mediaRecorderRef.current?.stop(); audioContextRef.current?.close() }
  }, [isListening, selectedDeviceId]) 

  const monitorSilence = () => {
    if (isSpeakingRef.current) {
      isSpeakingRef.current = false
      setStatus('Processing...')
      mediaRecorderRef.current?.stop()
    }
  }

  const sendAudio = async (blob: Blob) => {
    const formData = new FormData()
    formData.append('file', blob, 'audio.webm')
    try {
      const res = await fetch(API_URL, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.text?.trim()) {
        const newTextChunk = data.text.trim()
        
        setCurrentText(prev => {
            const updatedText = prev + (prev ? ' ' : '') + newTextChunk
            
            // Auto Copy Logic
            if (autoCopy) {
                navigator.clipboard.writeText(updatedText)
                // Optional: Flash 'Copied' indicator without full UI state change?
                // setCopied(true) would conflict with the manual copy button's timeout logic slightly, 
                // but we can trigger it for visual feedback.
                setCopied(true)
                setTimeout(() => setCopied(false), 1000)
            }
            
            return updatedText
        })
        
        setTimeout(() => textEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        setStatus('Ready')
      }
    } catch { setStatus('API Error') }
  }

  const closeApp = () => window.close()
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cardStyle = {
    backgroundColor: isDark 
      ? `rgba(0, 0, 0, ${opacity / 100})` 
      : `rgba(255, 255, 255, ${opacity / 100})`
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center font-sans p-12 box-border" style={{ background: 'transparent' }}>
      
      {/* Main Glass Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative flex w-full h-full flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-300
           ${isDark ? 'border-white/10' : 'border-black/5'}`}
        style={{ ...cardStyle, appRegion: 'drag' } as any}
      >
        
        {/* Glow Effects */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 
           ${isListening ? 'opacity-100' : 'opacity-0'}
           ${isDark ? 'bg-blue-500/20' : 'bg-blue-500/10'}`} 
        />
        
        {/* Header */}
        <div className={`flex flex-col border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
               <div className={`flex h-2 w-2 items-center justify-center rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-red-500'}`}>
                  {isConnected && <div className="absolute h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75" />}
               </div>
               <span className={`text-xs font-bold tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>VIBE SPEAKER</span>
               <span className={`text-[9px] uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{status}</span>
            </div>
            <div className="flex items-center gap-2" style={{ appRegion: 'no-drag' } as any}>
                <button 
                  onClick={() => setShowSettingsPanel(prev => !prev)} 
                  className={`group flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-white/5 text-white/50 hover:bg-blue-500/20 hover:text-blue-400' : 'bg-black/5 text-slate-500 hover:bg-blue-500/10 hover:text-blue-600'}`}
                  title="Settings"
                >
                  <Settings2 size={12} />
                </button>
                <button 
                  onClick={() => window.open('http://localhost:62000/dashboard', '_blank')}
                  className={`group flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-white/5 text-white/50 hover:bg-blue-500/20 hover:text-blue-400' : 'bg-black/5 text-slate-500 hover:bg-blue-500/10 hover:text-blue-600'}`}
                  title="Open Dashboard"
                >
                  <LayoutDashboard size={12} />
                </button>
                <button onClick={closeApp} className={`group flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-white/5 text-white/50 hover:bg-red-500/20 hover:text-red-400' : 'bg-black/5 text-slate-500 hover:bg-red-500/10 hover:text-red-600'}`}>
                  <X size={14} />
                </button>
            </div>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex px-5 pb-3 gap-2" style={{ appRegion: 'no-drag' } as any}>
             <button onClick={() => setView('live')} className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${view === 'live' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black') : (isDark ? 'text-white/40 hover:text-white/80' : 'text-slate-400 hover:text-slate-700')}`}>Live</button>
             <button onClick={() => setView('history')} className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${view === 'history' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black') : (isDark ? 'text-white/40 hover:text-white/80' : 'text-slate-400 hover:text-slate-700')}`}>History</button>
          </div>
        </div>

        {/* Settings Panel Overlay */}
        <AnimatePresence>
          {showSettingsPanel && (
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`absolute inset-0 z-20 flex flex-col p-5 overflow-y-auto ${isDark ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-md`}
              style={{ appRegion: 'no-drag' } as any}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Settings</h3>
                <button onClick={() => setShowSettingsPanel(false)} className={`group flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-white/5 text-white/50 hover:bg-white/20' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}>
                    <X size={14} />
                </button>
              </div>

              {/* General Settings */}
              <div className={`space-y-4 mb-6 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Appearance</h4>

                <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Dark Mode</span>
                    <button onClick={cycleTheme} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-black/30 hover:bg-black/50 text-white' : 'bg-white/50 hover:bg-white/80 text-slate-900'}`}>
                      <ThemeIcon />
                    </button>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] uppercase text-gray-500 font-bold mb-2">
                     <span>Window Opacity</span>
                     <span>{opacity}%</span>
                  </div>
                  <input 
                    type="range" min="20" max="100" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} 
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Audio Settings */}
              <div className={`space-y-4 mb-6 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Audio Input</h4>
                <div className="relative">
                   <button 
                     onClick={() => setShowDeviceMenu(prev => !prev)}
                     className={`flex items-center justify-between w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors 
                       ${isDark ? 'bg-black/30 text-white/80 hover:bg-black/50' : 'bg-white/50 text-slate-700 hover:bg-white/80'}`}
                   >
                      <span className="flex items-center gap-2 truncate">
                        <Mic size={12} /> 
                        <span className="truncate max-w-[140px]">{devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Default'}</span>
                      </span>
                      <ChevronDown size={12} className="opacity-50" />
                   </button>
                   {showDeviceMenu && (
                       <div className={`mt-2 rounded-xl overflow-hidden border ${isDark ? 'border-white/10 bg-zinc-900' : 'border-black/5 bg-white'}`}>
                         {devices.map(d => (
                           <button
                             key={d.deviceId}
                             onClick={() => { setSelectedDeviceId(d.deviceId); setShowDeviceMenu(false) }}
                             className={`w-full truncate px-3 py-2 text-left text-xs transition-colors block border-b last:border-0 ${isDark ? 'border-white/5 hover:bg-white/5 text-zinc-400' : 'border-black/5 hover:bg-black/5 text-slate-600'} ${selectedDeviceId === d.deviceId ? 'text-blue-500' : ''}`}
                           >
                             {d.label}
                           </button>
                         ))}
                       </div>
                   )}
                </div>
              </div>

              {/* Shortcuts */}
              <div className={`space-y-3 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Shortcuts</h4>
                <ShortcutRecorder label="Toggle Mic" shortcut={micShortcut} onChange={setMicShortcut} />
                <ShortcutRecorder label="Toggle View" shortcut={visibilityShortcut} onChange={setVisibilityShortcut} />
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {view === 'live' ? (
             <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
                  {currentText ? (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{currentText}</motion.p>
                  ) : (
                    <div className={`flex h-full flex-col items-center justify-center gap-3 ${isDark ? 'text-white/20' : 'text-slate-400/50'}`}>
                      <Zap size={32} strokeWidth={1} />
                      <p className="text-xs font-medium">Ready to transcribe</p>
                    </div>
                  )}
                  <div ref={textEndRef} />
                </div>
                {currentText && (
                  <div className="absolute bottom-4 right-4 z-10">
                     <button onClick={() => copyText(currentText)} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all ${isDark ? 'border-white/10 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white' : 'border-black/5 bg-white/60 text-slate-600 hover:bg-white/80 hover:text-slate-900'}`} style={{ appRegion: 'no-drag' } as any}>
                       {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                       {copied ? 'Copied' : 'Copy'}
                     </button>
                  </div>
                )}
             </div>
          ) : (
             <div className="absolute inset-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-3">
               {history.map(item => (
                 <div key={item.id} className={`p-3 rounded-xl border transition-colors ${isDark ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-black/5 hover:bg-black/10'}`}>
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{new Date(item.timestamp + "Z").toLocaleString()}</span>
                       <button onClick={() => copyText(item.transcription)} className={`p-1 rounded hover:bg-white/10 ${isDark ? 'text-white/40' : 'text-slate-500'}`}><Copy size={12}/></button>
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.transcription}</p>
                 </div>
               ))}
               {history.length === 0 && <div className="text-center py-10 opacity-50 text-xs">No history found</div>}
             </div>
          )}
        </div>

        {/* Footer (Controls) - Only show in Live Mode */}
        {view === 'live' && (
          <div className={`relative px-5 py-4 border-t ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <div className="absolute inset-0 pointer-events-none opacity-30"><canvas ref={canvasRef} width={420} height={88} className="w-full h-full" /></div>
              <div className="relative z-10 flex items-center justify-between gap-4" style={{ appRegion: 'no-drag' } as any}>
                  
                  {/* Left: Mode Toggle */}
                  <div className="flex-1 flex justify-start">
                    <button 
                        onClick={() => setMode(prev => prev === 'append' ? 'replace' : 'append')}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors 
                        ${mode === 'append' 
                            ? (isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600') 
                            : (isDark ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-600')}`}
                        title={mode === 'append' ? "Mode: Append Text" : "Mode: Replace Text"}
                    >
                        {mode === 'append' ? <ListPlus size={14} /> : <RefreshCw size={14} />}
                        <span className="hidden sm:inline">{mode}</span>
                    </button>
                  </div>

                  {/* Center: Record Button */}
                  <motion.button 
                     whileHover={{ scale: 1.05 }} 
                     whileTap={{ scale: 0.95 }} 
                     onClick={() => setIsListening(!isListening)} 
                     className={`group relative flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg ${isListening ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : (isDark ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:bg-blue-50' : 'bg-slate-900 text-white shadow-xl hover:bg-slate-800')}`}
                  >
                     {isListening ? <div className="h-5 w-5 rounded-sm bg-white" /> : <Mic size={24} className={isDark ? "text-black" : "text-white"} />}
                  </motion.button>

                  {/* Right: Auto Copy Toggle */}
                  <div className="flex-1 flex justify-end">
                    <button 
                        onClick={() => setAutoCopy(prev => !prev)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors 
                        ${autoCopy 
                            ? (isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-600') 
                            : (isDark ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-black/5 text-slate-400')}`}
                        title={autoCopy ? "Auto Copy: ON" : "Auto Copy: OFF"}
                    >
                        <CopyCheck size={14} />
                        <span className="hidden sm:inline">{autoCopy ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
              </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default App