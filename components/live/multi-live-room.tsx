'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Maximize2, Mic, MicOff, MonitorUp, MonitorStop, Volume2 } from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = { tokenUrl: string; tokenBody: Record<string, string>; host?: boolean }
type VideoItem = { id: string; label: string; track: any; local: boolean }

export default function MultiLiveRoom({ tokenUrl, tokenBody, host = false }: Props) {
  const [status, setStatus] = useState<'loading'|'connected'|'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [items, setItems] = useState<VideoItem[]>([])
  const [featured, setFeatured] = useState<string | null>(null)
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screenTrack, setScreenTrack] = useState<any>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const roomRef = useRef<Room | null>(null)
  const videoRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const screenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    const upsert = (item: VideoItem) => setItems(current => [...current.filter(x => x.id !== item.id), item])
    const remove = (id: string) => setItems(current => current.filter(x => x.id !== id))
    const attachAudio = (track: any) => {
      if (!track || track.kind !== Track.Kind.Audio) return
      const el = track.attach(); el.autoplay = true; el.muted = false; el.volume = 1; el.style.display = 'none'; document.body.appendChild(el)
      void el.play().catch(() => { if (!cancelled) setAudioBlocked(true) })
    }
    room.on(RoomEvent.TrackSubscribed, (track, publication) => {
      if (track.kind === Track.Kind.Audio) { attachAudio(track); return }
      if (publication.source === Track.Source.ScreenShare) { setScreenTrack(track); return }
      if (publication.source !== Track.Source.Camera) return
      const participant = publication.participant
      upsert({ id: participant.identity, label: participant.name || (participant.identity.startsWith('cohost-') ? 'Co-organisateur' : 'Organisateur'), track, local: false })
    })
    room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
      track.detach().forEach(el => el.remove())
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      if (publication.source === Track.Source.Camera) remove(publication.participant.identity)
    })
    room.on(RoomEvent.LocalTrackPublished, publication => {
      if (!host || !publication.track) return
      if (publication.source === Track.Source.Camera) upsert({ id: room.localParticipant.identity, label: 'Organisateur principal', track: publication.track, local: true })
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(publication.track)
    })
    room.on(RoomEvent.LocalTrackUnpublished, publication => {
      if (publication.source === Track.Source.Camera) remove(room.localParticipant.identity)
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      publication.track?.detach().forEach(el => el.remove())
    })
    ;(async () => {
      try {
        const response = await fetch(tokenUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tokenBody) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Impossible de préparer la connexion.')
        await room.connect(data.url, data.token)
        if (cancelled) return
        setStatus('connected'); setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')
        if (!host) { try { await room.startAudio(); setAudioBlocked(false) } catch { setAudioBlocked(true) } }
        else { try { await room.localParticipant.setMicrophoneEnabled(true); if (!cancelled) setMic(true) } catch {} ; try { await room.localParticipant.setCameraEnabled(true); if (!cancelled) setCamera(true) } catch {} }
      } catch (error) { if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Connexion impossible.') } }
    })()
    return () => { cancelled = true; room.disconnect() }
  }, [tokenUrl, JSON.stringify(tokenBody), host])

  useEffect(() => {
    items.forEach(item => {
      const container = videoRefs.current[item.id]
      if (!container) return
      container.querySelectorAll('video').forEach(v => v.remove())
      const el = item.track.attach(); el.autoplay = true; el.playsInline = true; el.muted = item.local || host; el.style.width='100%'; el.style.height='100%'; el.style.objectFit='cover'; el.style.display='block'; el.style.borderRadius='12px'; container.appendChild(el)
    })
  }, [items, host])

  useEffect(() => {
    const container = screenRef.current
    if (!container || !screenTrack) return
    container.querySelectorAll('video').forEach(v => v.remove())
    const el = screenTrack.attach(); el.autoplay=true; el.playsInline=true; el.muted=true; el.style.width='100%'; el.style.height='100%'; el.style.objectFit='contain'; container.appendChild(el)
    return () => { screenTrack.detach().forEach((node:any) => node.remove()) }
  }, [screenTrack])

  async function toggleMic(){const room=roomRef.current;if(!room||!host)return;try{const next=!mic;await room.localParticipant.setMicrophoneEnabled(next);setMic(next)}catch{}}
  async function toggleCamera(){const room=roomRef.current;if(!room||!host)return;try{const next=!camera;await room.localParticipant.setCameraEnabled(next);setCamera(next)}catch{}}
  async function toggleScreen(){const room=roomRef.current;if(!room||!host)return;try{if(screenTrack){await room.localParticipant.setScreenShareEnabled(false);setScreenTrack(null);return}if(!window.isSecureContext||!navigator.mediaDevices?.getDisplayMedia)throw new Error('Le partage d’écran nécessite HTTPS et un navigateur compatible.');await room.localParticipant.setScreenShareEnabled(true,{audio:false,video:true,selfBrowserSurface:'exclude',surfaceSwitching:'include'})}catch(e){setMessage(e instanceof Error?e.message:'Impossible de partager l’écran.')}}
  async function fullscreen(id:string){const el=videoRefs.current[id];if(!el)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await el.requestFullscreen()}catch{}}

  const count=items.length
  const columns=count<=1?'1fr':count===2?'repeat(2,minmax(0,1fr))':count<=4?'repeat(2,minmax(0,1fr))':'repeat(3,minmax(0,1fr))'
  return <div style={{display:'grid',gap:10}}>
    <div className="conik-multi-live-stage" style={{position:'relative',width:'100%',aspectRatio:'16/9',minHeight:0,overflow:'hidden',borderRadius:14,background:'#090a0f',border:'1px solid var(--line)'}}>
      {status!=='connected'&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#fff',padding:24,textAlign:'center'}}><b>{message}</b></div>}
      {status==='connected'&&items.length===0&&!screenTrack&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#fff',opacity:.75}}>En attente des caméras…</div>}
      {screenTrack&&<div ref={screenRef} style={{position:'absolute',inset:8,zIndex:2,borderRadius:12,overflow:'hidden',background:'#000'}}/>}
      <div style={{position:'absolute',inset:8,display:'grid',gridTemplateColumns:columns,gap:8,zIndex:screenTrack?3:1}}>
        {items.map(item=><div key={item.id} ref={el=>{videoRefs.current[item.id]=el}} onDoubleClick={()=>setFeatured(v=>v===item.id?null:item.id)} style={{position:'relative',minWidth:0,minHeight:0,overflow:'hidden',borderRadius:12,background:'#171922',border:featured===item.id?'2px solid rgba(255,255,255,.9)':'1px solid rgba(255,255,255,.16)',gridColumn:featured===item.id?'1 / -1':undefined,gridRow:featured===item.id?'1 / -1':undefined,zIndex:featured===item.id?10:1,cursor:'pointer',boxShadow:'0 10px 30px rgba(0,0,0,.28)'}}><div style={{position:'absolute',left:8,bottom:8,zIndex:3,padding:'5px 8px',borderRadius:8,background:'rgba(0,0,0,.65)',color:'#fff',fontSize:11,fontWeight:800}}>{item.label}</div><button type="button" onClick={()=>void fullscreen(item.id)} title="Agrandir" style={{position:'absolute',right:8,top:8,zIndex:4,width:34,height:34,border:0,borderRadius:9,background:'rgba(0,0,0,.65)',color:'#fff',display:'grid',placeItems:'center',cursor:'pointer'}}><Maximize2 size={16}/></button></div>)}
      </div>
    </div>
    {host&&status==='connected'&&<div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}><button className="outline" onClick={()=>void toggleMic()} style={{minHeight:44,display:'inline-flex',alignItems:'center',gap:7}}>{mic?<Mic size={17}/>:<MicOff size={17}/>} {mic?'Couper le micro':'Activer le micro'}</button><button className="outline" onClick={()=>void toggleCamera()} style={{minHeight:44,display:'inline-flex',alignItems:'center',gap:7}}>{camera?<Camera size={17}/>:<CameraOff size={17}/>} {camera?'Couper la caméra':'Activer la caméra'}</button><button className="outline" onClick={()=>void toggleScreen()} style={{minHeight:44,display:'inline-flex',alignItems:'center',gap:7}}>{screenTrack?<MonitorStop size={17}/>:<MonitorUp size={17}/>} {screenTrack?'Arrêter le partage':'Partager mon écran'}</button></div>}
    {!host&&audioBlocked&&status==='connected'&&<button onClick={()=>void roomRef.current?.startAudio().then(()=>setAudioBlocked(false)).catch(()=>{})} style={{minHeight:44,border:0,borderRadius:10,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8}}><Volume2 size={17}/>Activer le son</button>}
    {host&&<div className="muted" style={{textAlign:'center',fontSize:11}}>Double-cliquez sur une caméra pour la mettre en avant. Le bouton ⛶ permet de l’agrandir.</div>}
    <style>{`@media(max-width:700px){.conik-multi-live-stage{aspect-ratio:16/10!important}.conik-multi-live-stage>div:nth-child(3){inset:5px!important;gap:5px!important}}`}</style>
  </div>
}
