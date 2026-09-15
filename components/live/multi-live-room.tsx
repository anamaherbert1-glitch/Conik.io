'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, Maximize2, Mic, MicOff, MonitorUp, MonitorStop, Move, Volume2, BringToFront } from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = { tokenUrl: string; tokenBody: Record<string, string>; host?: boolean; label?: string }
type VideoItem = { id: string; label: string; track: any; local: boolean }
type StageState = { featured: string | null; movable: boolean; x: number; y: number }

const DEFAULT_STAGE: StageState = { featured: null, movable: false, x: 8, y: 8 }

export default function MultiLiveRoom({ tokenUrl, tokenBody, host = false, label }: Props) {
  const [status, setStatus] = useState<'loading'|'connected'|'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [items, setItems] = useState<VideoItem[]>([])
  const [stage, setStage] = useState<StageState>(DEFAULT_STAGE)
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screenTrack, setScreenTrack] = useState<any>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [moveMode, setMoveMode] = useState(false)
  const roomRef = useRef<Room | null>(null)
  const videoRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const screenRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const publishStage = (next: StageState) => {
    setStage(next)
    if (!host) return
    const room = roomRef.current
    if (!room) return
    try {
      void room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'conik-stage-state', stage: next })),
        { reliable: true }
      )
    } catch {}
  }

  useEffect(() => {
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    const upsert = (item: VideoItem) => setItems(current => [...current.filter(x => x.id !== item.id), item])
    const remove = (id: string) => setItems(current => current.filter(x => x.id !== id))
    const attachAudio = (track: any) => {
      if (!track || track.kind !== Track.Kind.Audio) return
      const el = track.attach() as HTMLMediaElement
      el.autoplay = true
      el.muted = false
      el.volume = 1
      el.style.display = 'none'
      document.body.appendChild(el)
      void el.play().catch(() => { if (!cancelled) setAudioBlocked(true) })
    }
    const onParticipant = (participant: any) => participant.name || (participant.identity.startsWith('cohost-') ? 'Co-organisateur' : 'Organisateur')

    room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
      if (topic !== 'conik-stage-state') return
      try {
        const decoded = new TextDecoder().decode(payload)
        const data = JSON.parse(decoded)
        if (data?.type !== 'conik-stage-state' || !data.stage) return
        const next = data.stage as StageState
        setStage({
          featured: typeof next.featured === 'string' ? next.featured : null,
          movable: Boolean(next.movable),
          x: Number.isFinite(next.x) ? Math.max(0, Math.min(100, next.x)) : DEFAULT_STAGE.x,
          y: Number.isFinite(next.y) ? Math.max(0, Math.min(100, next.y)) : DEFAULT_STAGE.y,
        })
      } catch {}
    })

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) { attachAudio(track); return }
      if (publication.source === Track.Source.ScreenShare) { setScreenTrack(track); return }
      if (publication.source !== Track.Source.Camera) return
      upsert({ id: participant.identity, label: onParticipant(participant), track, local: false })
    })
    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach(el => el.remove())
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      if (publication.source === Track.Source.Camera) remove(participant.identity)
    })
    room.on(RoomEvent.LocalTrackPublished, publication => {
      if (!host || !publication.track) return
      if (publication.source === Track.Source.Camera) upsert({ id: room.localParticipant.identity, label: label || 'Organisateur principal', track: publication.track, local: true })
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(publication.track)
    })
    room.on(RoomEvent.LocalTrackUnpublished, publication => {
      if (publication.source === Track.Source.Camera) remove(room.localParticipant.identity)
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      publication.track?.detach().forEach((el:any) => el.remove())
    })

    ;(async () => {
      try {
        const response = await fetch(tokenUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tokenBody) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Impossible de préparer la connexion.')
        await room.connect(data.url, data.token)
        if (cancelled) return
        setStatus('connected')
        setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')
        if (!host) { try { await room.startAudio(); setAudioBlocked(false) } catch { setAudioBlocked(true) } }
        else {
          try { await room.localParticipant.setMicrophoneEnabled(true); if (!cancelled) setMic(true) } catch { setMessage('Microphone non disponible. Autorisez le micro pour continuer.') }
          try { await room.localParticipant.setCameraEnabled(true); if (!cancelled) setCamera(true) } catch { setMessage('Caméra non disponible. Autorisez la caméra pour apparaître dans le Live.') }
          setTimeout(() => {
            try {
              void room.localParticipant.publishData(
                new TextEncoder().encode(JSON.stringify({ type: 'conik-stage-state', stage: DEFAULT_STAGE })),
                { reliable: true }
              )
            } catch {}
          }, 250)
        }
      } catch (error) { if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Connexion impossible.') } }
    })()
    return () => { cancelled = true; room.disconnect() }
  }, [tokenUrl, JSON.stringify(tokenBody), host, label])

  useEffect(() => {
    items.forEach(item => {
      const container = videoRefs.current[item.id]
      if (!container) return
      container.querySelectorAll('video').forEach(v => v.remove())
      const el = item.track.attach() as HTMLVideoElement
      el.autoplay = true
      el.playsInline = true
      el.muted = item.local || host
      el.style.width='100%'; el.style.height='100%'; el.style.objectFit='cover'; el.style.display='block'; el.style.borderRadius='10px'
      container.appendChild(el)
    })
  }, [items, host])

  useEffect(() => {
    const container = screenRef.current
    if (!container || !screenTrack) return
    container.querySelectorAll('video').forEach(v => v.remove())
    const el = screenTrack.attach() as HTMLVideoElement
    el.autoplay=true; el.playsInline=true; el.muted=true; el.style.width='100%'; el.style.height='100%'; el.style.objectFit='contain'; el.style.display='block'; container.appendChild(el)
    return () => { screenTrack.detach().forEach((node:any) => node.remove()) }
  }, [screenTrack])

  async function toggleMic(){const room=roomRef.current;if(!room||!host)return;try{const next=!mic;await room.localParticipant.setMicrophoneEnabled(next);setMic(next)}catch{}}
  async function toggleCamera(){const room=roomRef.current;if(!room||!host)return;try{const next=!camera;await room.localParticipant.setCameraEnabled(next);setCamera(next)}catch{}}
  async function toggleScreen(){const room=roomRef.current;if(!room||!host)return;try{if(screenTrack){await room.localParticipant.setScreenShareEnabled(false);setScreenTrack(null);return}if(!window.isSecureContext||!navigator.mediaDevices?.getDisplayMedia)throw new Error('Le partage d’écran nécessite HTTPS et un navigateur compatible.');await room.localParticipant.setScreenShareEnabled(true,{audio:false,video:true,selfBrowserSurface:'exclude',surfaceSwitching:'include'})}catch(e){setMessage(e instanceof Error?e.message:'Impossible de partager l’écran.')}}
  async function fullscreen(id:string){const el=videoRefs.current[id];if(!el)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await el.requestFullscreen()}catch{}}

  function selectCamera(id: string) {
    if (!host) return
    publishStage({ ...stage, featured: id })
  }

  function toggleBringToFront(id: string) {
    if (!host) return
    const isFeatured = stage.featured === id
    publishStage({ ...stage, featured: isFeatured ? null : id, movable: isFeatured ? false : stage.movable })
  }

  function toggleMove(id: string) {
    if (!host) return
    if (stage.featured !== id) {
      publishStage({ ...stage, featured: id, movable: true })
      setMoveMode(true)
      return
    }
    const next = !moveMode
    setMoveMode(next)
    publishStage({ ...stage, movable: next })
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!host || !moveMode || !stage.featured || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const cameraWidth = Math.min(180, rect.width * 0.24)
    const cameraHeight = Math.min(105, rect.height * 0.24)
    const xPx = event.clientX - rect.left - cameraWidth / 2
    const yPx = event.clientY - rect.top - cameraHeight / 2
    const x = Math.max(1, Math.min(99, (xPx / Math.max(1, rect.width)) * 100))
    const y = Math.max(1, Math.min(99, (yPx / Math.max(1, rect.height)) * 100))
    publishStage({ ...stage, x, y })
  }

  const count=items.length
  const columns=count<=1?'1fr':count===2?'repeat(2,minmax(0,1fr))':count<=4?'repeat(2,minmax(0,1fr))':'repeat(3,minmax(0,1fr))'
  const featuredItem = useMemo(() => items.find(item => item.id === stage.featured) || null, [items, stage.featured])
  const normalItems = useMemo(() => items.filter(item => item.id !== stage.featured), [items, stage.featured])

  const renderTile = (item: VideoItem, floating = false) => (
    <div key={item.id} ref={el=>{videoRefs.current[item.id]=el}} onClick={()=>selectCamera(item.id)} style={{position:'relative',width:'100%',height:'100%',minWidth:0,minHeight:0,overflow:'hidden',borderRadius:10,background:'#171922',border:stage.featured===item.id?'2px solid rgba(255,255,255,.9)':'1px solid rgba(255,255,255,.16)',cursor:host?'pointer':'default',boxShadow:floating?'0 12px 28px rgba(0,0,0,.42)':'0 8px 24px rgba(0,0,0,.22)'}}>
      <div style={{position:'absolute',left:6,bottom:6,zIndex:3,padding:'4px 7px',borderRadius:7,background:'rgba(0,0,0,.68)',color:'#fff',fontSize:10,fontWeight:800}}>{item.label}</div>
      {host && floating && <div style={{position:'absolute',right:6,top:6,zIndex:5,display:'flex',gap:4}}>
        <button type="button" onClick={e=>{e.stopPropagation();toggleMove(item.id)}} title="Déplacer" style={{width:30,height:30,border:0,borderRadius:7,background:moveMode&&stage.featured===item.id?'rgba(255,255,255,.92)':'rgba(0,0,0,.68)',color:moveMode&&stage.featured===item.id?'#111':'#fff',display:'grid',placeItems:'center',cursor:'pointer'}}><Move size={14}/></button>
        <button type="button" onClick={e=>{e.stopPropagation();toggleBringToFront(item.id)}} title="Mettre la caméra en avant" style={{width:30,height:30,border:0,borderRadius:7,background:'rgba(0,0,0,.68)',color:'#fff',display:'grid',placeItems:'center',cursor:'pointer'}}><BringToFront size={14}/></button>
      </div>}
      <button type="button" onClick={e=>{e.stopPropagation();void fullscreen(item.id)}} title="Agrandir" style={{position:'absolute',right:6,bottom:6,zIndex:4,width:30,height:30,border:0,borderRadius:7,background:'rgba(0,0,0,.68)',color:'#fff',display:'grid',placeItems:'center',cursor:'pointer'}}><Maximize2 size={14}/></button>
    </div>
  )

  return <div style={{display:'grid',gap:10}}>
    <div ref={stageRef} className="conik-multi-live-stage" data-conik-studio-stage onPointerMove={handlePointerMove} style={{position:'relative',width:'100%',aspectRatio:'16/9',minHeight:0,overflow:'hidden',borderRadius:14,background:'#090a0f',border:'1px solid var(--line)'}}>
      <div data-conik-remote-canvas style={{position:'absolute',inset:0,width:'100%',height:'100%',minHeight:0}}>
        {status!=='connected'&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#fff',padding:24,textAlign:'center',zIndex:20}}><b>{message}</b></div>}
        {status==='connected'&&items.length===0&&!screenTrack&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#fff',opacity:.75}}>En attente des caméras…</div>}
        {screenTrack&&<div ref={screenRef} style={{position:'absolute',inset:0,zIndex:1,borderRadius:12,overflow:'hidden',background:'#000',padding:4}}/>}

        {normalItems.length>0 && <div style={{position:'absolute',inset:screenTrack?'auto 8px 8px 8px':8,display:'grid',gridTemplateColumns:screenTrack?columns:columns,gridAutoRows:screenTrack?'minmax(70px,100px)':undefined,gap:6,zIndex:2,maxHeight:screenTrack?'105px':'none'}}>
          {normalItems.map(item=>renderTile(item))}
        </div>}

        {featuredItem && <div style={{position:'absolute',left:`${stage.x}%`,top:`${stage.y}%`,width:'clamp(105px, 15vw, 155px)',height:'clamp(62px, 8.5vw, 88px)',zIndex:10,transform:'translate(-50%,-50%)',touchAction:moveMode&&host?'none':'auto'}}>
          {renderTile(featuredItem, true)}
        </div>}
      </div>
      <div data-conik-screen-canvas aria-hidden="true" style={{display:'none'}} />
      <div data-conik-camera-canvas aria-hidden="true" style={{display:'none'}} />
    </div>
    {host&&status==='connected'&&<div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}><button className="outline" onClick={()=>void toggleMic()} style={{minHeight:44,display:'inline-flex',alignItems:'center',gap:7}}>{mic?<Mic size={17}/>:<MicOff size={17}/>} {mic?'Couper le micro':'Activer le micro'}</button><button className="outline" onClick={()=>void toggleCamera()} style={{minHeight:44,display:'inline-flex',alignItems:'center',gap:7}}>{camera?<Camera size={17}/>:<CameraOff size={17}/>} {camera?'Couper la caméra':'Activer la caméra'}</button><button className="outline" onClick={()=>void toggleScreen()} style={{minHeight:44,display:'inline-flex',alignItems:'center',gap:7}}>{screenTrack?<MonitorStop size={17}/>:<MonitorUp size={17}/>} {screenTrack?'Arrêter le partage':'Partager mon écran'}</button></div>}
    {!host&&audioBlocked&&status==='connected'&&<button onClick={()=>void roomRef.current?.startAudio().then(()=>setAudioBlocked(false)).catch(()=>{})} style={{minHeight:44,border:0,borderRadius:10,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8}}><Volume2 size={17}/>Activer le son</button>}
    {host&&<div className="muted" style={{textAlign:'center',fontSize:11}}>La caméra sélectionnée reste petite dans un coin. « Déplacer » autorise son déplacement. « Mettre la caméra en avant » la place au premier plan. La position et la mise en avant sont envoyées aux followers, tandis que le partage d’écran reste visible derrière.</div>}
    <style>{`@media(max-width:700px){.conik-multi-live-stage{aspect-ratio:16/10!important}.conik-multi-live-stage>div[data-conik-remote-canvas]{inset:3px!important}.conik-multi-live-stage>div[data-conik-remote-canvas]>div:nth-child(3){gap:4px!important}.conik-multi-live-stage>div[data-conik-remote-canvas]>div:nth-child(3){max-height:82px!important;grid-auto-rows:72px!important}}`}</style>
  </div>
}
