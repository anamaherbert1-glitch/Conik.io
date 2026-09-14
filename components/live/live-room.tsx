'use client'

import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = { tokenUrl:string; tokenBody:Record<string,string>; host?:boolean }

export default function LiveRoom({ tokenUrl, tokenBody, host=false }: Props) {
  const [state,setState]=useState<'loading'|'connected'|'error'>('loading')
  const [message,setMessage]=useState('Connexion au Live…')
  const [mic,setMic]=useState(host)
  const [camera,setCamera]=useState(host)
  const localRef=useRef<HTMLDivElement>(null)
  const remoteRef=useRef<HTMLDivElement>(null)
  const roomRef=useRef<Room|null>(null)

  useEffect(()=>{
    let cancelled=false
    const room=new Room({adaptiveStream:true,dynacast:true})
    roomRef.current=room
    const attach=(publication:any,container:HTMLDivElement|null)=>{
      if(!container||!publication?.track)return
      const element=publication.track.attach()
      element.style.width='100%';element.style.height='100%';element.style.objectFit='cover';element.style.borderRadius='12px'
      container.appendChild(element)
    }
    room.on(RoomEvent.TrackSubscribed,(track)=>{if(track.kind===Track.Kind.Video)attach({track},remoteRef.current)})
    room.on(RoomEvent.TrackUnsubscribed,(track)=>{track.detach().forEach((el)=>el.remove())})
    ;(async()=>{
      try{
        const response=await fetch(tokenUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tokenBody)})
        const data=await response.json().catch(()=>({}))
        if(!response.ok)throw new Error(data.error||'Impossible de préparer la connexion.')
        await room.connect(data.url,data.token)
        if(cancelled)return
        setState('connected');setMessage(host?'Vous êtes connecté au studio.':'Vous êtes connecté au Live.')
        if(host){
          await room.localParticipant.setMicrophoneEnabled(true)
          await room.localParticipant.setCameraEnabled(true)
          room.localParticipant.videoTrackPublications.forEach((publication)=>{if(publication.track)attach(publication,localRef.current)})
          room.localParticipant.audioTrackPublications.forEach((publication)=>{if(publication.track)attach(publication,localRef.current)})
        }
      }catch(error){if(!cancelled){setState('error');setMessage(error instanceof Error?error.message:'Connexion impossible.')}}
    })()
    return()=>{cancelled=true;room.disconnect()}
  },[tokenUrl,JSON.stringify(tokenBody),host])

  async function toggleMic(){const room=roomRef.current;if(!room)return;const next=!mic;await room.localParticipant.setMicrophoneEnabled(next);setMic(next)}
  async function toggleCamera(){const room=roomRef.current;if(!room)return;const next=!camera;await room.localParticipant.setCameraEnabled(next);setCamera(next)}

  return <div style={{display:'grid',gap:12}}>
    <div style={{position:'relative',minHeight:480,borderRadius:14,overflow:'hidden',background:'#090a0f',border:'1px solid var(--line)'}}>
      <div ref={remoteRef} style={{width:'100%',height:'100%',minHeight:480,display:'grid',placeItems:'center'}}>{state!=='connected'&&<div style={{color:'#fff',textAlign:'center',padding:24}}><b>{message}</b></div>}</div>
      {host&&<div ref={localRef} style={{position:'absolute',right:16,bottom:16,width:220,height:130,zIndex:2,background:'#171922',borderRadius:12,overflow:'hidden'}}/>}
    </div>
    {state==='connected'&&<div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
      {host&&<><button className="outline" onClick={toggleMic}>{mic?'Couper le micro':'Activer le micro'}</button><button className="outline" onClick={toggleCamera}>{camera?'Couper la caméra':'Activer la caméra'}</button></>}
    </div>}
    {state==='error'&&<div className="error">{message}</div>}
  </div>
}
