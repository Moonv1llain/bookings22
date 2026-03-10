module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { booking, status } = req.body
  const RESEND_KEY   = process.env.RESEND_API_KEY
  const BARBER_EMAIL = process.env.BARBER_EMAIL
  const FROM         = 'onboarding@resend.dev'

  const send = (to, subject, html) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })

  try {
    if (status === 'new') {
      await send(
        BARBER_EMAIL,
        `New booking — ${booking.service}`,
        `<p><b>${booking.name}</b> wants a <b>${booking.service}</b><br>
         ${booking.date} at ${booking.time}<br>
         Phone: ${booking.phone}</p>`
      )
    }

    if (status === 'approved' || status === 'denied') {
      const approved = status === 'approved'
      await send(
        BARBER_EMAIL,
        approved ? 'Appointment confirmed ✓' : 'Update from Moon Barbershop',
        approved
          ? `<p>Hi ${booking.name}, your <b>${booking.service}</b> on ${booking.date} at ${booking.time} is confirmed!</p>`
          : `<p>Hi ${booking.name}, we can't accommodate ${booking.date} at ${booking.time}. Please book again.</p>`
      )
    }

    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
