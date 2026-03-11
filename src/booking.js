import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';

const JSONBIN_BASE = 'https://api.jsonbin.io';

export const CONFIG = {
  JSONBIN_BIN_ID: '69b09a92864efc355b5e9819',
  JSONBIN_API_KEY: '$2a$10$RjEN7.HUwh2vOW75dua3deRQRq7nFfTmJ6SW4ZUvzp125NjgPrdlu',
  SCHEDULE_BIN_ID: '69b0ac4b1687bc351c7b7821',
  REVENUE_BIN_ID: '69b0b436864efc355b5ee408',
  WEB3FORMS_KEY: '84dd324b-4aab-4447-b556-d39cf9f2b8f3',
  DASHBOARD_PASSWORD: 'barber2024',
  EMAILJS_SERVICE_ID: 'service_tsx5a1h',
  EMAILJS_TEMPLATE_ID: 'template_b438zet',
  EMAILJS_PUBLIC_KEY: '94tm1uP9Lei3u_5_X',
};

emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);

// ── BOOKINGS ──

export async function getBookings() {
  const res = await fetch(`${JSONBIN_BASE}/v3/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': CONFIG.JSONBIN_API_KEY, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  return data.record.bookings || [];
}

export async function saveBookings(bookings) {
  await fetch(`${JSONBIN_BASE}/v3/b/${CONFIG.JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': CONFIG.JSONBIN_API_KEY
    },
    body: JSON.stringify({ bookings })
  });
}

export async function addBooking(booking) {
  const bookings = await getBookings();
  const newBooking = {
    ...booking,
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  bookings.push(newBooking);
  await saveBookings(bookings);
  return newBooking;
}

// ── SCHEDULE ──

export async function getSchedule() {
  const res = await fetch(`${JSONBIN_BASE}/v3/b/${CONFIG.SCHEDULE_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': CONFIG.JSONBIN_API_KEY, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  return data.record;
}

export async function saveSchedule(schedule) {
  await fetch(`${JSONBIN_BASE}/v3/b/${CONFIG.SCHEDULE_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': CONFIG.JSONBIN_API_KEY
    },
    body: JSON.stringify(schedule)
  });
}

// ── REVENUE ──

export async function getRevenueEntries() {
  const res = await fetch(`${JSONBIN_BASE}/v3/b/${CONFIG.REVENUE_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': CONFIG.JSONBIN_API_KEY, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  return data.record.entries || [];
}

export async function logRevenue(booking) {
  const match = booking.service.match(/\$(\d+)/);
  const amount = match ? parseInt(match[1]) : 0;
  if (!amount) return;

  const entries = await getRevenueEntries();

  const alreadyLogged = entries.some(e => e.bookingId === booking.id);
  if (alreadyLogged) return;

  entries.push({
    bookingId: booking.id,
    name: booking.name,
    service: booking.service,
    amount,
    date: booking.date,
    completedAt: new Date().toISOString()
  });

  await fetch(`${JSONBIN_BASE}/v3/b/${CONFIG.REVENUE_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': CONFIG.JSONBIN_API_KEY
    },
    body: JSON.stringify({ entries })
  });
}

// ── NOTIFICATIONS ──

export async function notifyBarber(booking) {
  await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: CONFIG.WEB3FORMS_KEY,
      subject: `New Booking — ${booking.service}`,
      from_name: booking.name,
      message: `
New booking received at Moon!

Name: ${booking.name}
Email: ${booking.email}
Service: ${booking.service}
Date: ${booking.date}
Time: ${booking.time}
      `.trim()
    })
  });
}

export async function notifyCustomer(booking, status) {
  const messages = {
    confirmed: `Your appointment has been confirmed! We look forward to seeing you.`,
    cancelled: `Unfortunately your appointment has been cancelled. Please rebook at your convenience.`,
  };

  if (!messages[status]) return;

  try {
    const result = await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
      to_email: booking.email,
      to_name: booking.name,
      status: status.charAt(0).toUpperCase() + status.slice(1),
      message: messages[status],
      service: booking.service,
      date: booking.date,
      time: booking.time,
    });
    console.log('EmailJS result:', result);
  } catch (err) {
    console.error('EmailJS error:', JSON.stringify(err));
  }
}

// ── CLEANUP ──

export async function cleanOldBookings() {
  const bookings = await getBookings();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const fresh = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate >= cutoff;
  });

  if (fresh.length !== bookings.length) {
    await saveBookings(fresh);
    console.log(`Cleaned ${bookings.length - fresh.length} old bookings`);
  }
}