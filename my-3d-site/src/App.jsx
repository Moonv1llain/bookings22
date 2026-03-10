import React, { useRef, Suspense, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Float } from '@react-three/drei'
import { EffectComposer, Noise, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

/* ─────────────────────────────────────────────
   PARTICLES
───────────────────────────────────────────── */
function Particles({ count = 120 }) {
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particles = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 14,
    z: (Math.random() - 0.5) * 8 - 1,
    speedY: 0.0015 + Math.random() * 0.003,
    speedX: (Math.random() - 0.5) * 0.0008,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.008,
    scale: 0.01 + Math.random() * 0.02,
  })), [count])

  useFrame(() => {
    particles.forEach((p, i) => {
      p.y -= p.speedY
      p.x += p.speedX
      p.rot += p.rotSpeed
      if (p.y < -8) { p.y = 8; p.x = (Math.random() - 0.5) * 20 }
      dummy.position.set(p.x, p.y, p.z)
      dummy.rotation.z = p.rot
      dummy.scale.setScalar(p.scale)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <planeGeometry args={[1, 0.1]} />
      <meshBasicMaterial color="#a89880" transparent opacity={0.2} depthWrite={false} />
    </instancedMesh>
  )
}

/* ─────────────────────────────────────────────
   RIG — mouse parallax
───────────────────────────────────────────── */
function Rig({ isMobile }) {
  const { camera, mouse } = useThree()
  return useFrame(() => {
    camera.position.lerp(
      new THREE.Vector3(
        isMobile ? mouse.x * 0.18 : mouse.x * 0.5,
        mouse.y * 0.1,
        10
      ), 0.035
    )
    camera.lookAt(0, 0, 0)
  })
}

/* ─────────────────────────────────────────────
   BARBER POLE
───────────────────────────────────────────── */
function BarbersPole({ isMobile }) {
  const { scene } = useGLTF('/barbers_pole.glb')
  const groupRef   = useRef()
  const stripesRef = useRef()
  const clock      = useRef(0)

  useMemo(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return
      child.material = child.material.clone()
      child.material.roughness = 0.3
      child.material.metalness = 0.5
      // Keep original colors — just tune material response
      if (child.name === 'Inner_Inner_Mat_0') {
        stripesRef.current = child
        child.material.roughness = 0.2
        child.material.metalness = 0.0
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    clock.current += delta
    if (stripesRef.current) stripesRef.current.rotation.z += delta * 1.6
    if (groupRef.current)
      groupRef.current.scale.setScalar(1 + Math.sin(clock.current * 0.7) * 0.012)
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={isMobile ? 0.034 : 0.048}
        position={isMobile ? [0, 0.2, 0] : [0, -1.2, 0]}
      />
    </group>
  )
}

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const services = [
  { id: '01', name: 'Brows',                  time: '15 min', price: '$10' },
  { id: '02', name: 'Beard Trim',             time: '20 min', price: '$15' },
  { id: '03', name: 'Haircut',                time: '30 min', price: '$35' },
  { id: '04', name: 'Haircut & Design',       time: '40 min', price: '$40' },
  { id: '05', name: 'Haircut & Eyebrows',     time: '35 min', price: '$40' },
  { id: '06', name: 'Haircut & Beard',        time: '45 min', price: '$45' },
  { id: '07', name: 'Full Service',           time: '50 min', price: '$50' },
  { id: '08', name: 'Home Visit',             time: '1.5 hr', price: '$60' },
]

/* ─────────────────────────────────────────────
   CURSOR
───────────────────────────────────────────── */
function Cursor() {
  const dot  = useRef(null)
  const ring = useRef(null)
  const pos  = useRef({ x: -100, y: -100 })
  const lag  = useRef({ x: -100, y: -100 })
  const [hov, setHov] = useState(false)

  useEffect(() => {
    let raf
    const lerp = (a, b, t) => a + (b - a) * t
    const tick = () => {
      lag.current.x = lerp(lag.current.x, pos.current.x, 0.1)
      lag.current.y = lerp(lag.current.y, pos.current.y, 0.1)
      if (ring.current) {
        ring.current.style.left = lag.current.x + 'px'
        ring.current.style.top  = lag.current.y + 'px'
      }
      raf = requestAnimationFrame(tick)
    }
    const move = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
      if (dot.current) {
        dot.current.style.left = e.clientX + 'px'
        dot.current.style.top  = e.clientY + 'px'
      }
    }
    const over = (e) => setHov(!!e.target.closest('[data-hover]'))
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={dot} style={{
        position:'fixed', pointerEvents:'none', zIndex:9999,
        width: hov ? '8px' : '5px', height: hov ? '8px' : '5px',
        borderRadius:'50%',
        background: hov ? '#ff3333' : '#f0ede8',
        transform:'translate(-50%,-50%)',
        transition:'width 0.2s, height 0.2s, background 0.2s',
      }}/>
      <div ref={ring} style={{
        position:'fixed', pointerEvents:'none', zIndex:9998,
        width: hov ? '44px' : '28px',
        height: hov ? '44px' : '28px',
        borderRadius:'50%',
        border:`1px solid rgba(240,237,232,${hov ? 0.5 : 0.2})`,
        transform:'translate(-50%,-50%)',
        transition:'width 0.4s cubic-bezier(0.16,1,0.3,1),height 0.4s cubic-bezier(0.16,1,0.3,1),border-color 0.3s',
      }}/>
    </>
  )
}

/* ─────────────────────────────────────────────
   WORD REVEAL — blur + rise
───────────────────────────────────────────── */
function WordReveal({ text, delay = 0, faded = false, italic = false }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i} style={{ display:'inline-block', overflow:'hidden', verticalAlign:'bottom', marginRight:'0.2em' }}>
          <span style={{
            display:'inline-block',
            opacity: 0,
            fontStyle: italic ? 'italic' : 'normal',
            color: faded ? 'rgba(240,237,232,0.3)' : '#f0ede8',
            animation: `blurRise 1.1s cubic-bezier(0.16,1,0.3,1) ${delay + i * 0.08}s forwards`,
          }}>
            {word}
          </span>
        </span>
      ))}
    </>
  )
}

/* ─────────────────────────────────────────────
   CONFIG — fill these in before deploying
───────────────────────────────────────────── */
const JSONBIN_BIN_ID  = '69b06da9864efc355b5dfa3b'           // jsonbin.io bin ID
const JSONBIN_API_KEY = '$2a$10$RjEN7.HUwh2vOW75dua3deRQRq7nFfTmJ6SW4ZUvzp125NjgPrdlu'   // X-Master-Key
const NOTIFY_ENDPOINT = 'https://bookings22.vercel.app/api/notify'    // e.g. https://yoursite.vercel.app/api/notify

const INK   = '#f0ede8'
const PAPER = '#0a0a0a'
const RULE  = 'rgba(240,237,232,0.08)'
const mono  = { fontFamily:"'DM Mono', monospace", fontWeight:300 }
const serif = { fontFamily:"'Bebas Neue', sans-serif", fontWeight:400, letterSpacing:'0.06em' }

/* JSONBin helpers */
const getBin = async () => {
  const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_API_KEY }
  })
  const j = await r.json()
  return j.record?.bookings || []
}
const putBin = async (bookings) => {
  await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json', 'X-Master-Key': JSONBIN_API_KEY },
    body: JSON.stringify({ bookings })
  })
}
const notifyCustomer = async (booking, status) => {
  try {
    await fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ booking, status })
    })
  } catch(e) { console.warn('Twilio endpoint not configured:', e) }
}

/* shared panel shell */
const Panel = ({ open, isMobile, side='right', width=420, children }) => (
  <div style={{
    position:'fixed',
    ...(isMobile
      ? { left:0, right:0, bottom:0, height: open ? '90vh' : 0, borderTop:`1px solid ${RULE}`,
          transition:'height 0.75s cubic-bezier(0.16,1,0.3,1)' }
      : side === 'right'
        ? { right:0, top:0, bottom:0, width: open ? `${width}px` : 0, borderLeft:`1px solid ${RULE}`,
            transition:'width 0.75s cubic-bezier(0.16,1,0.3,1)' }
        : { left:0, top:0, bottom:0, width: open ? `${width}px` : 0, borderRight:`1px solid ${RULE}`,
            transition:'width 0.75s cubic-bezier(0.16,1,0.3,1)' }
    ),
    background: PAPER,
    zIndex: 70,
    display:'flex', flexDirection:'column',
    overflow:'hidden',
  }}>
    {children}
  </div>
)

const PanelHeader = ({ title, sub, onClose }) => (
  <div style={{
    padding:'36px 38px 24px', borderBottom:`1px solid ${RULE}`,
    display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexShrink:0,
  }}>
    <div>
      <div style={{ ...serif, fontSize:'34px', fontWeight:600, fontStyle:'italic', color:INK, lineHeight:1 }}>{title}</div>
      {sub && <div style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.3em', color:INK, opacity:0.3, marginTop:'8px', textTransform:'uppercase' }}>{sub}</div>}
    </div>
    <span data-hover onClick={onClose} style={{ ...mono, fontSize:'8px', letterSpacing:'0.22em', color:INK, opacity:0.3, cursor:'none', transition:'opacity 0.2s' }}
      onMouseEnter={e=>e.target.style.opacity='0.9'} onMouseLeave={e=>e.target.style.opacity='0.3'}>ESC</span>
  </div>
)

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:'18px' }}>
    <div style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.25em', color:INK, opacity:0.4, marginBottom:'7px', textTransform:'uppercase' }}>{label}</div>
    {props.as === 'select'
      ? <select {...props} as={undefined} style={{ width:'100%', padding:'11px 14px', background:'transparent', border:`1px solid ${RULE}`, borderRadius:0, color:INK, ...mono, fontSize:'12px', letterSpacing:'0.05em', appearance:'none', cursor:'none', outline:'none' }}>
          {props.children}
        </select>
      : <input {...props} style={{ width:'100%', padding:'11px 14px', background:'transparent', border:`1px solid ${RULE}`, borderRadius:0, color:INK, ...mono, fontSize:'12px', letterSpacing:'0.05em', outline:'none', boxSizing:'border-box' }}
          onFocus={e=>e.target.style.borderColor='rgba(12,10,8,0.4)'}
          onBlur={e=>e.target.style.borderColor=RULE}
        />
    }
  </div>
)

const Btn = ({ children, onClick, secondary, disabled }) => (
  <button data-hover onClick={onClick} disabled={disabled} style={{
    padding:'14px 0', width:'100%',
    background: secondary ? 'transparent' : disabled ? 'rgba(12,10,8,0.2)' : INK,
    border: secondary ? `1px solid ${RULE}` : 'none',
    color: secondary ? INK : PAPER,
    ...mono, fontSize:'8.5px', letterSpacing:'0.3em', textTransform:'uppercase',
    cursor: disabled ? 'default' : 'none', transition:'opacity 0.2s',
    opacity: disabled ? 0.5 : 1,
  }}
    onMouseEnter={e=>{ if(!disabled) e.target.style.opacity='0.65' }}
    onMouseLeave={e=>{ e.target.style.opacity='1' }}
  >{children}</button>
)

/* ─────────────────────────────────────────────
   BOOKING PANEL  (customer-facing)
───────────────────────────────────────────── */
function BookingPanel({ open, onClose, isMobile }) {
  const [step, setStep]       = useState(0) // 0=service 1=datetime 2=contact 3=done
  const [form, setForm]       = useState({ service:'', date:'', time:'', name:'', phone:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const times = ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
                 '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
                 '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM']

  // Min date = today
  const today = new Date().toISOString().split('T')[0]

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const bookings = await getBin()
      const booking = {
        id: Date.now().toString(),
        ...form,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      await putBin([...bookings, booking])
      await notifyCustomer(booking, 'new')
      setStep(3)
    } catch(e) {
      setError('Could not save booking. Check your JSONBin config.')
    }
    setLoading(false)
  }

  const reset = () => { setStep(0); setForm({ service:'', date:'', time:'', name:'', phone:'' }); setError('') }

  return (
    <Panel open={open} isMobile={isMobile} side="left" width={420}>
      <PanelHeader
        title="Book"
        sub={`Step ${Math.min(step+1,3)} of 3`}
        onClose={()=>{ onClose(); reset() }}
      />

      <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '28px 24px' : '32px 38px' }}>

        {/* Step indicator */}
        {step < 3 && (
          <div style={{ display:'flex', gap:'6px', marginBottom:'32px' }}>
            {['Service','Date & Time','Contact'].map((l,i) => (
              <div key={i} style={{ flex:1 }}>
                <div style={{ height:'2px', background: i <= step ? INK : RULE, marginBottom:'6px', transition:'background 0.3s' }} />
                <div style={{ ...mono, fontSize:'7px', letterSpacing:'0.2em', color:INK, opacity: i <= step ? 0.6 : 0.2, textTransform:'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 0 — Service */}
        {step === 0 && (
          <div>
            <div style={{ ...serif, fontSize:'22px', fontWeight:300, color:INK, marginBottom:'24px', letterSpacing:'-0.01em' }}>
              What are you coming in for?
            </div>
            {services.map(s => (
              <div key={s.id} data-hover onClick={()=>set('service', s.name)} style={{
                display:'flex', justifyContent:'space-between', alignItems:'baseline',
                padding:'14px 16px',
                marginBottom:'4px',
                background: form.service === s.name ? INK : 'transparent',
                border:`1px solid ${form.service === s.name ? INK : RULE}`,
                cursor:'none', transition:'all 0.2s',
              }}>
                <div>
                  <div style={{ ...serif, fontSize:'18px', fontWeight:500, color: form.service === s.name ? PAPER : INK }}>{s.name}</div>
                  <div style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.15em', color: form.service === s.name ? 'rgba(248,246,242,0.5)' : 'rgba(12,10,8,0.35)', marginTop:'3px' }}>{s.time}</div>
                </div>
                <div style={{ ...serif, fontSize:'18px', color: form.service === s.name ? PAPER : INK }}>{s.price}</div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 1 — Date & Time */}
        {step === 1 && (
          <div>
            <div style={{ ...serif, fontSize:'22px', fontWeight:300, color:INK, marginBottom:'24px' }}>
              Pick a date & time
            </div>
            <Input label="Date" type="date" value={form.date} min={today} onChange={e=>set('date', e.target.value)} />
            {form.date && (
              <>
                <div style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.25em', color:INK, opacity:0.4, marginBottom:'10px', textTransform:'uppercase' }}>Available Times</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'8px' }}>
                  {times.map(t => (
                    <div key={t} data-hover onClick={()=>set('time', t)} style={{
                      padding:'10px 6px', textAlign:'center',
                      background: form.time === t ? INK : 'transparent',
                      border:`1px solid ${form.time === t ? INK : RULE}`,
                      ...mono, fontSize:'10px', letterSpacing:'0.05em',
                      color: form.time === t ? PAPER : INK,
                      cursor:'none', transition:'all 0.15s',
                    }}>{t}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2 — Contact */}
        {step === 2 && (
          <div>
            <div style={{ ...serif, fontSize:'22px', fontWeight:300, color:INK, marginBottom:'24px' }}>
              Your details
            </div>
            {/* Summary */}
            <div style={{ padding:'14px 16px', border:`1px solid ${RULE}`, marginBottom:'24px' }}>
              <div style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.2em', color:INK, opacity:0.35, marginBottom:'8px', textTransform:'uppercase' }}>Booking Summary</div>
              <div style={{ ...serif, fontSize:'16px', color:INK, marginBottom:'4px' }}>{form.service}</div>
              <div style={{ ...mono, fontSize:'10px', color:INK, opacity:0.5 }}>{form.date} · {form.time}</div>
            </div>
            <Input label="Full Name" type="text" placeholder="Your name" value={form.name} onChange={e=>set('name', e.target.value)} />
            <Input label="Phone Number" type="tel" placeholder="+1 (805) 000-0000" value={form.phone} onChange={e=>set('phone', e.target.value)} />
            <div style={{ ...mono, fontSize:'8px', letterSpacing:'0.1em', color:INK, opacity:0.3, lineHeight:1.6, marginTop:'4px' }}>
              You'll receive an SMS confirmation once the barber approves your booking.
            </div>
            {error && <div style={{ ...mono, fontSize:'9px', color:'#cc2200', marginTop:'12px', letterSpacing:'0.05em' }}>{error}</div>}
          </div>
        )}

        {/* STEP 3 — Done */}
        {step === 3 && (
          <div style={{ textAlign:'center', paddingTop:'40px' }}>
            <div style={{ fontSize:'32px', marginBottom:'20px' }}>✦</div>
            <div style={{ ...serif, fontSize:'28px', fontWeight:600, fontStyle:'italic', color:INK, marginBottom:'12px' }}>You're on the list.</div>
            <div style={{ ...mono, fontSize:'9px', letterSpacing:'0.15em', color:INK, opacity:0.45, lineHeight:1.8 }}>
              We'll text you at {form.phone}<br/>once your appointment is confirmed.
            </div>
            <div style={{ marginTop:'40px' }}>
              <Btn onClick={()=>{ reset(); onClose() }}>Done</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div style={{ padding: isMobile ? '16px 24px 28px' : '18px 38px 36px', borderTop:`1px solid ${RULE}`, flexShrink:0, display:'flex', gap:'10px' }}>
          {step > 0 && <Btn secondary onClick={()=>setStep(s=>s-1)}>← Back</Btn>}
          {step < 2
            ? <Btn disabled={step===0 ? !form.service : (!form.date||!form.time)} onClick={()=>setStep(s=>s+1)}>Continue →</Btn>
            : <Btn disabled={loading} onClick={submit}>{loading ? 'Sending...' : 'Request Booking'}</Btn>
          }
        </div>
      )}
    </Panel>
  )
}

/* ─────────────────────────────────────────────
   DASHBOARD PANEL  (barber-facing)
───────────────────────────────────────────── */
const BARBER_PIN = '1234'  // change this

function DashboardPanel({ open, onClose, isMobile }) {
  const [authed, setAuthed]       = useState(false)
  const [pin, setPin]             = useState('')
  const [pinErr, setPinErr]       = useState(false)
  const [bookings, setBookings]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [filter, setFilter]       = useState('pending')
  const [acting, setActing]       = useState(null) // id being acted on

  const load = async () => {
    setLoading(true)
    try { setBookings(await getBin()) } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { if (authed && open) load() }, [authed, open])

  const tryPin = () => {
    if (pin === BARBER_PIN) { setAuthed(true); setPinErr(false) }
    else { setPinErr(true); setPin('') }
  }

  const act = async (id, status) => {
    setActing(id)
    try {
      const all = await getBin()
      const booking = all.find(b=>b.id===id)
      const updated = all.map(b => b.id === id ? {...b, status} : b)
      await putBin(updated)
      await notifyCustomer(booking, status)
      setBookings(updated)
    } catch(e) { console.error(e) }
    setActing(null)
  }

  const filtered = bookings.filter(b => b.status === filter)
  const counts = {
    pending:  bookings.filter(b=>b.status==='pending').length,
    approved: bookings.filter(b=>b.status==='approved').length,
    denied:   bookings.filter(b=>b.status==='denied').length,
  }

  const fmtDate = iso => {
    if (!iso) return ''
    const [y,m,d] = iso.split('-')
    return `${m}/${d}/${y}`
  }

  return (
    <Panel open={open} isMobile={isMobile} side="right" width={460}>
      <PanelHeader title="Dashboard" sub="Moon Barbershop" onClose={()=>{ onClose(); setAuthed(false); setPin('') }} />

      <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '28px 24px' : '32px 38px' }}>

        {/* PIN gate */}
        {!authed ? (
          <div style={{ maxWidth:'260px' }}>
            <div style={{ ...serif, fontSize:'20px', fontWeight:300, color:INK, marginBottom:'24px' }}>Barber Access</div>
            <Input label="PIN" type="password" placeholder="••••" value={pin}
              onChange={e=>setPin(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&tryPin()}
            />
            {pinErr && <div style={{ ...mono, fontSize:'9px', color:'#cc2200', marginBottom:'12px' }}>Incorrect PIN</div>}
            <Btn onClick={tryPin}>Enter</Btn>
          </div>
        ) : (
          <>
            {/* Tab filters */}
            <div style={{ display:'flex', gap:'0', marginBottom:'28px', border:`1px solid ${RULE}` }}>
              {['pending','approved','denied'].map(s => (
                <div key={s} data-hover onClick={()=>setFilter(s)} style={{
                  flex:1, padding:'10px 6px', textAlign:'center',
                  background: filter===s ? INK : 'transparent',
                  cursor:'none', transition:'all 0.2s',
                  borderRight: s!=='denied' ? `1px solid ${RULE}` : 'none',
                }}>
                  <div style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.2em', color: filter===s ? PAPER : INK, opacity: filter===s ? 1 : 0.4, textTransform:'uppercase' }}>
                    {s} {counts[s] > 0 && `(${counts[s]})`}
                  </div>
                </div>
              ))}
            </div>

            {/* Refresh */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
              <span data-hover onClick={load} style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.2em', color:INK, opacity:0.3, cursor:'none', transition:'opacity 0.2s', textTransform:'uppercase' }}
                onMouseEnter={e=>e.target.style.opacity='0.8'} onMouseLeave={e=>e.target.style.opacity='0.3'}>
                {loading ? 'Loading...' : '↻ Refresh'}
              </span>
            </div>

            {/* Booking cards */}
            {filtered.length === 0 ? (
              <div style={{ ...mono, fontSize:'9px', letterSpacing:'0.15em', color:INK, opacity:0.3, textAlign:'center', paddingTop:'40px', textTransform:'uppercase' }}>
                No {filter} bookings
              </div>
            ) : filtered.sort((a,b)=>new Date(a.date+' '+a.time)-new Date(b.date+' '+b.time)).map(b => (
              <div key={b.id} style={{ border:`1px solid ${RULE}`, padding:'18px 20px', marginBottom:'10px' }}>
                {/* Header row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                  <div>
                    <div style={{ ...serif, fontSize:'19px', fontWeight:500, color:INK }}>{b.name}</div>
                    <div style={{ ...mono, fontSize:'8px', letterSpacing:'0.1em', color:INK, opacity:0.4, marginTop:'3px' }}>{b.phone}</div>
                  </div>
                  <div style={{ ...mono, fontSize:'7.5px', letterSpacing:'0.1em', color:INK, opacity:0.3, textAlign:'right' }}>
                    {fmtDate(b.date)}<br/>{b.time}
                  </div>
                </div>
                {/* Service */}
                <div style={{ ...mono, fontSize:'9px', letterSpacing:'0.12em', color:INK, opacity:0.55, marginBottom:'14px', paddingBottom:'12px', borderBottom:`1px solid ${RULE}` }}>
                  {b.service}
                </div>
                {/* Actions */}
                {b.status === 'pending' && (
                  <div style={{ display:'flex', gap:'8px' }}>
                    <Btn onClick={()=>act(b.id,'approved')} disabled={acting===b.id}>
                      {acting===b.id ? '...' : '✓ Approve'}
                    </Btn>
                    <Btn secondary onClick={()=>act(b.id,'denied')} disabled={acting===b.id}>
                      ✕ Deny
                    </Btn>
                  </div>
                )}
                {b.status !== 'pending' && (
                  <div style={{ ...mono, fontSize:'8px', letterSpacing:'0.18em', textTransform:'uppercase',
                    color: b.status==='approved' ? '#1a7a3a' : '#cc2200', opacity:0.7 }}>
                    {b.status==='approved' ? '✓ Confirmed' : '✕ Denied'}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Panel>
  )
}

/* ─────────────────────────────────────────────
   SERVICES PANEL
───────────────────────────────────────────── */
function ServicesPanel({ open, onClose, onBook, isMobile }) {
  return (
    <div style={{
      position:'fixed',
      ...(isMobile
        ? { left:0, right:0, bottom:0, height: open ? '78vh' : 0, borderTop:'1px solid rgba(240,237,232,0.1)' }
        : { right:0, top:0, bottom:0, width: open ? '370px' : 0, borderLeft:'1px solid rgba(240,237,232,0.08)' }
      ),
      background:'#111',
      zIndex:60,
      display:'flex', flexDirection:'column',
      overflow:'hidden',
      transition: isMobile
        ? 'height 0.8s cubic-bezier(0.16,1,0.3,1)'
        : 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '24px 26px 20px' : '40px 38px 26px',
        borderBottom:'1px solid rgba(240,237,232,0.07)',
        display:'flex', justifyContent:'space-between', alignItems:'flex-end',
        flexShrink:0,
      }}>
        <div>
          <div style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize: isMobile ? '30px' : '40px',
            fontWeight:400,
            color:'#f0ede8',
            letterSpacing:'0.06em',
            lineHeight:1,
          }}>
            Services
          </div>
          <div style={{
            fontFamily:"'DM Mono', monospace",
            fontSize:'7.5px',
            fontWeight:300,
            letterSpacing:'0.3em',
            color:'#f0ede8',
            opacity:0.3,
            marginTop:'9px',
            textTransform:'uppercase',
          }}>
            {services.length} offerings · Oxnard, CA
          </div>
        </div>
        <span data-hover onClick={onClose} style={{
          fontFamily:"'DM Mono', monospace",
          fontSize:'8px', letterSpacing:'0.22em',
          color:'#f0ede8', opacity:0.28, cursor:'none',
          transition:'opacity 0.2s', marginBottom:'5px',
        }}
          onMouseEnter={e=>e.target.style.opacity='1'}
          onMouseLeave={e=>e.target.style.opacity='0.28'}
        >ESC</span>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '4px 26px 0' : '4px 38px 0' }}>
        {services.map((s) => (
          <div key={s.id} data-hover style={{
            display:'flex', justifyContent:'space-between', alignItems:'baseline',
            padding:'15px 0',
            borderBottom:'1px solid rgba(240,237,232,0.06)',
            cursor:'none', transition:'opacity 0.2s',
          }}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.35'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}
          >
            <div style={{ display:'flex', alignItems:'baseline', gap:'16px' }}>
              <span style={{
                fontFamily:"'DM Mono', monospace",
                fontSize:'7.5px', letterSpacing:'0.1em',
                color:'#f0ede8', opacity:0.18, minWidth:'20px',
              }}>{s.id}</span>
              <div>
                <div style={{
                  fontFamily:"'Bebas Neue', sans-serif",
                  fontSize: isMobile ? '20px' : '23px',
                  fontWeight:400,
                  color:'#f0ede8', letterSpacing:'0.06em',
                }}>{s.name}</div>
                <div style={{
                  fontFamily:"'DM Mono', monospace",
                  fontSize:'7.5px', letterSpacing:'0.16em',
                  color:'#f0ede8', opacity:0.25, marginTop:'4px',
                }}>{s.time}</div>
              </div>
            </div>
            <div style={{
              fontFamily:"'Bebas Neue', sans-serif",
              fontSize: isMobile ? '20px' : '23px',
              fontWeight:400,
              color:'#f0ede8', letterSpacing:'0.06em',
            }}>{s.price}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        padding: isMobile ? '18px 26px 34px' : '22px 38px 40px',
        borderTop:'1px solid rgba(240,237,232,0.07)',
        flexShrink:0,
      }}>
        <button data-hover onClick={onBook} style={{
          width:'100%', padding:'16px',
          background:'#f0ede8',
          border:'none',
          color:'#0a0a0a',
          fontFamily:"'DM Mono', monospace",
          fontSize:'8.5px', letterSpacing:'0.32em', textTransform:'uppercase',
          cursor:'none', transition:'opacity 0.2s',
        }}
          onMouseEnter={e=>e.target.style.opacity='0.7'}
          onMouseLeave={e=>e.target.style.opacity='1'}
        >
          Book Appointment
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   APP
───────────────────────────────────────────── */
export default function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [dashOpen, setDashOpen] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=DM+Mono:wght@300;400&display=swap');

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; cursor:none !important; }
        body { background:#000000; overflow:hidden; }

        @keyframes blurRise {
          from { opacity:0; transform:translateY(60%) skewY(3deg); filter:blur(8px); }
          to   { opacity:1; transform:translateY(0) skewY(0deg);   filter:blur(0);  }
        }
        @keyframes fadeIn {
          from { opacity:0; } to { opacity:1; }
        }
        @keyframes lineGrow {
          from { transform:scaleX(0); opacity:0; }
          to   { transform:scaleX(1); opacity:1; }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:none; }
        }

        ::-webkit-scrollbar { display:none; }

        .nav-item {
          font-family:'DM Mono', monospace;
          font-size:8px;
          font-weight:300;
          letter-spacing:0.28em;
          text-transform:uppercase;
          color:#f0ede8;
          opacity:0.3;
          cursor:none;
          transition:opacity 0.2s;
        }
        .nav-item:hover { opacity:1 !important; }
      `}</style>

      <Cursor />

      {/* ── CANVAS ── */}
      <div style={{ position:'fixed', inset:0, zIndex:0 }}>
        <Canvas shadows={false} dpr={[1,2]} camera={{ position:[0,0,10], fov: isMobile ? 52 : 42 }}>
          <color attach="background" args={['#000000']} />

          <Environment preset="night" environmentIntensity={0.15} />
          <ambientLight intensity={0.08} />
          <spotLight position={[3, 6, 5]} intensity={3} color="#ffffff" angle={0.35} penumbra={1} />
          <spotLight position={[-4, 2, 3]} intensity={1} color="#6688bb" angle={0.5} penumbra={1} />

          <Suspense fallback={null}>
            <Particles count={isMobile ? 55 : 100} />
            <Float speed={0.85} rotationIntensity={0.2} floatIntensity={0.28}>
              <BarbersPole isMobile={isMobile} />
            </Float>
          </Suspense>

          <Rig isMobile={isMobile} />

          <EffectComposer disableNormalPass>
            <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.5} radius={0.7} />
            <Noise opacity={0.028} />
            <Vignette eskil={false} offset={0.08} darkness={0.85} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* ── GHOST BG — giant stacked number + city tag ── */}
      {!isMobile && (
        <div style={{
          position:'fixed', inset:0, zIndex:1, pointerEvents:'none', overflow:'hidden',
        }}>
          {/* Giant background number */}
          <div style={{
            position:'absolute', right:'-2vw', top:'50%',
            transform:'translateY(-52%)',
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:'clamp(300px,38vw,600px)',
            fontWeight:400,
            color:'transparent',
            WebkitTextStroke:'1px rgba(240,237,232,0.035)',
            letterSpacing:'-0.02em',
            lineHeight:0.85,
            userSelect:'none',
            animation:'fadeIn 3s ease 1s both',
            opacity:0,
          }}>
            805
          </div>
        </div>
      )}

      {/* ── UI LAYER ── */}
      <div style={{ position:'fixed', inset:0, zIndex:10, pointerEvents:'none' }}>

        {/* TOP BAR — full-width with logo left, nav right */}
        <header style={{
          position:'absolute', top:0, left:0, right:0,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding: isMobile ? '0 20px' : '0 36px',
          height: isMobile ? '52px' : '60px',
          borderBottom:'1px solid rgba(240,237,232,0.07)',
          pointerEvents:'auto',
          animation:'fadeIn 0.6s ease 0.1s both', opacity:0,
        }}>
          {/* Logo block */}
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{
              fontFamily:"'Bebas Neue', sans-serif",
              fontSize: isMobile ? '26px' : '30px',
              color:'#f0ede8',
              letterSpacing:'0.12em',
              lineHeight:1,
            }}>Moon</div>
            {!isMobile && (
              <div style={{
                width:'1px', height:'18px',
                background:'rgba(240,237,232,0.15)',
              }}/>
            )}
            {!isMobile && (
              <div style={{
                fontFamily:"'DM Mono', monospace",
                fontSize:'7px', fontWeight:300,
                letterSpacing:'0.3em', textTransform:'uppercase',
                color:'#f0ede8', opacity:0.28, lineHeight:1.5,
              }}>
                Barbershop<br/>Est. 2019
              </div>
            )}
          </div>

          {/* Right nav */}
          {!isMobile ? (
            <nav style={{ display:'flex', alignItems:'center', gap:'32px' }}>
              {['Gallery','About'].map(label => (
                <span key={label} data-hover style={{
                  fontFamily:"'DM Mono', monospace",
                  fontSize:'8px', fontWeight:300,
                  letterSpacing:'0.28em', textTransform:'uppercase',
                  color:'#f0ede8', opacity:0.28, cursor:'none', transition:'opacity 0.2s',
                }}
                  onMouseEnter={e=>e.target.style.opacity='1'}
                  onMouseLeave={e=>e.target.style.opacity='0.28'}
                >{label}</span>
              ))}
              <div style={{ width:'1px', height:'16px', background:'rgba(240,237,232,0.12)' }} />
              <span data-hover onClick={()=>setDrawerOpen(d=>!d)} style={{
                fontFamily:"'DM Mono', monospace",
                fontSize:'8px', fontWeight:300,
                letterSpacing:'0.28em', textTransform:'uppercase',
                color: drawerOpen ? '#ff3333' : '#f0ede8',
                opacity: drawerOpen ? 1 : 0.28,
                cursor:'none', transition:'all 0.2s',
              }}
                onMouseEnter={e=>{ e.target.style.opacity='1'; if(!drawerOpen) e.target.style.color='#f0ede8' }}
                onMouseLeave={e=>{ if(!drawerOpen){ e.target.style.opacity='0.28'; e.target.style.color='#f0ede8' } }}
              >{drawerOpen ? '✕ Close' : 'Services'}</span>
            </nav>
          ) : (
            <span data-hover onClick={()=>setDrawerOpen(d=>!d)} style={{
              fontFamily:"'DM Mono', monospace",
              fontSize:'8px', fontWeight:300,
              letterSpacing:'0.28em', textTransform:'uppercase',
              color:'#f0ede8', opacity:0.5, cursor:'none',
            }}>
              {drawerOpen ? '✕' : '≡'}
            </span>
          )}
        </header>

        {/* HERO TEXT — left aligned, vertical rhythm */}
        <div style={{
          position:'absolute',
          bottom: isMobile ? '80px' : '68px',
          left: isMobile ? '20px' : '36px',
          pointerEvents:'none',
        }}>

          {/* Location tag */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'8px',
            padding:'4px 10px',
            border:'1px solid rgba(240,237,232,0.15)',
            marginBottom:'20px',
            animation:'fadeIn 0.8s ease 0.4s both', opacity:0,
          }}>
            <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#ff3333' }} />
            <span style={{
              fontFamily:"'DM Mono', monospace",
              fontSize:'7.5px', fontWeight:300,
              letterSpacing:'0.3em', textTransform:'uppercase',
              color:'#f0ede8', opacity:0.6,
            }}>Oxnard, CA · Open Now</span>
          </div>

          {/* Headline */}
          <div style={{ lineHeight:0.88, marginBottom:'22px' }}>
            {[
              { text:'THE', size: isMobile ? '60px' : '96px', weight:400, font:'Bebas Neue', color:'rgba(240,237,232,0.22)', delay:0.5 },
              { text:'CULTURE', size: isMobile ? '80px' : '130px', weight:400, font:'Bebas Neue', color:'#f0ede8', delay:0.62 },
              { text:'OF THE', size: isMobile ? '60px' : '96px', weight:400, font:'Bebas Neue', color:'rgba(240,237,232,0.22)', delay:0.74 },
              { text:'CUT.', size: isMobile ? '80px' : '130px', weight:400, font:'Bebas Neue', color:'#ff3333', delay:0.88 },
            ].map(({ text, size, weight, font, color, delay }) => (
              <div key={text} style={{ display:'block', overflow:'hidden' }}>
                <div style={{
                  fontFamily:`'${font}', sans-serif`,
                  fontSize:size, fontWeight:weight,
                  color, letterSpacing:'0.05em',
                  opacity:0,
                  animation:`blurRise 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s forwards`,
                }}>{text}</div>
              </div>
            ))}
          </div>

          {/* Sub line */}
          <div style={{
            fontFamily:"'DM Mono', monospace",
            fontSize: isMobile ? '9px' : '10px', fontWeight:300,
            letterSpacing:'0.18em', lineHeight:2,
            color:'#f0ede8', opacity:0,
            animation:'fadeIn 1s ease 1.1s both',
          }}>
            Walk-ins welcome · No appointment needed
          </div>
        </div>

        {/* BOTTOM TICKER — scrolling text strip */}
        {!isMobile && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            height:'36px',
            borderTop:'1px solid rgba(240,237,232,0.07)',
            display:'flex', alignItems:'center',
            overflow:'hidden',
            animation:'fadeIn 1s ease 1.3s both', opacity:0,
          }}>
            <style>{`
              @keyframes ticker {
                from { transform:translateX(0) }
                to   { transform:translateX(-50%) }
              }
            `}</style>
            <div style={{
              display:'flex', whiteSpace:'nowrap',
              animation:'ticker 22s linear infinite',
              fontFamily:"'DM Mono', monospace",
              fontSize:'7.5px', fontWeight:300,
              letterSpacing:'0.3em', textTransform:'uppercase',
              color:'#f0ede8', opacity:0.18,
            }}>
              {Array(8).fill('Moon Barbershop · Oxnard CA · Haircuts · Fades · Beard Trims · Walk-ins Welcome · \u00a0\u00a0\u00a0').join('')}
            </div>
          </div>
        )}

        {/* BOTTOM RIGHT — services toggle (desktop) */}
        {!isMobile && (
          <div style={{
            position:'absolute',
            bottom:'50px', right:'36px',
            pointerEvents:'auto',
            animation:'fadeIn 1s ease 1s both', opacity:0,
          }}>
            <span data-hover onClick={()=>setDrawerOpen(d=>!d)} style={{
              fontFamily:"'DM Mono', monospace",
              fontSize:'8px', fontWeight:300,
              letterSpacing:'0.24em', textTransform:'uppercase',
              color:'#f0ede8', opacity:0.28,
              cursor:'none', transition:'opacity 0.2s',
            }}
              onMouseEnter={e=>e.target.style.opacity='1'}
              onMouseLeave={e=>{ if(!drawerOpen) e.target.style.opacity='0.28' }}
            >
              {drawerOpen ? '← Close' : 'Services →'}
            </span>
          </div>
        )}

        {/* VERTICAL SPINE — right edge */}
        {!isMobile && (
          <div style={{
            position:'absolute', right:'14px', top:'50%',
            transform:'translateY(-50%) rotate(90deg)',
            transformOrigin:'center',
            fontFamily:"'DM Mono', monospace",
            fontSize:'7px', fontWeight:300,
            letterSpacing:'0.4em', textTransform:'uppercase',
            color:'#f0ede8', opacity:0.07,
            whiteSpace:'nowrap', pointerEvents:'none',
            animation:'fadeIn 2s ease 1.4s both',
          }}>
            Moon Barbershop · Oxnard · California · Since 2019
          </div>
        )}
      </div>

      {/* ── SERVICES PANEL ── */}
      <ServicesPanel
        open={drawerOpen}
        onClose={()=>setDrawerOpen(false)}
        onBook={()=>{ setDrawerOpen(false); setBookingOpen(true) }}
        isMobile={isMobile}
      />

      {/* ── BOOKING PANEL ── */}
      <BookingPanel
        open={bookingOpen}
        onClose={()=>setBookingOpen(false)}
        isMobile={isMobile}
      />

      {/* ── BARBER DASHBOARD ── */}
      <DashboardPanel
        open={dashOpen}
        onClose={()=>setDashOpen(false)}
        isMobile={isMobile}
      />

      {/* Secret barber access: double-click top-left corner */}
      <div
        style={{ position:'fixed', top:0, left:0, width:'80px', height:'80px', zIndex:200, cursor:'none' }}
        onDoubleClick={()=>setDashOpen(true)}
      />
    </>
  )
}