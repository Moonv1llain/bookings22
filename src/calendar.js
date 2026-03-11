import { getBookings, getSchedule } from './booking.js';

const DURATIONS = {
  'Brows — $10': 15,
  'Beard Trim — $15': 20,
  'Haircut — $35': 30,
  'Haircut & Design — $40': 40,
  'Haircut & Eyebrows — $40': 35,
  'Haircut & Beard — $45': 45,
  'Haircut, Beard & Eyebrows — $50': 50,
  'Home Haircut Service — $60': 90,
};

const isMobile = () => window.innerWidth < 768;

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toDisplay(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const mins = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
  return `${hour}${mins} ${ampm}`;
}

function getWeekDates(offset = 0) {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getSlotsForDay(date, duration, bookedSlots, schedule) {
  const dow = date.getDay();
  const daySched = schedule.schedule[dow];
  const dateStr = formatDate(date);

  if (schedule.closedDates?.includes(dateStr)) return null;
  if (!daySched?.open) return [];

  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
  if (date < todayMidnight) return [];

  const now = new Date();
  const isToday = dateStr === formatDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const BUFFER = 60; // minimum minutes from now to allow booking

  const open  = toMinutes(daySched.start);
  const close = toMinutes(daySched.end);
  const slots = [];

  for (let t = open; t + duration <= close; t += 30) {
    const timeStr = toTimeStr(t);
    const sEnd = t + duration;

    // Hide past slots and slots within buffer time for today
    if (isToday && t < nowMinutes + BUFFER) continue;

    const isBooked = bookedSlots.some(b => {
      if (b.date !== dateStr || b.status === 'cancelled') return false;
      const bStart = toMinutes(b.time);
      const bEnd   = bStart + (DURATIONS[b.service] || 30);
      return t < bEnd && sEnd > bStart;
    });

    const isBlocked = (schedule.blockedTimes || []).some(bl => {
      if (bl.date !== dateStr) return false;
      const bStart = toMinutes(bl.start);
      const bEnd   = toMinutes(bl.end);
      return t < bEnd && sEnd > bStart;
    });

    slots.push({ time: timeStr, display: toDisplay(timeStr), available: !isBooked && !isBlocked });
  }

  return slots;
}

export function initCalendar(onSelect) {
  let weekOffset   = 0;
  let selectedDate = '';
  let selectedTime = '';
  let bookedSlots  = [];
  let schedule     = null;

  const container = document.getElementById('calendar-container');
  const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DAY_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  async function render() {
    const serviceEl = document.getElementById('b-service');
    const duration  = DURATIONS[serviceEl?.value] || 30;

    if (!schedule) {
      container.innerHTML = '<div style="padding:40px;text-align:center;font-size:11px;letter-spacing:3px;color:#444">Loading...</div>';
    }

    const [newBookings, newSchedule] = await Promise.all([getBookings(), getSchedule()]);
    bookedSlots = newBookings;
    schedule    = newSchedule;
    if (!schedule.blockedTimes) schedule.blockedTimes = [];

    const dates    = getWeekDates(weekOffset);
    const todayMid = new Date(); todayMid.setHours(0,0,0,0);
    const todayStr = formatDate(new Date());
    const mobile   = isMobile();

    const ws = dates[0], we = dates[6];
    const weekLabel = `${DAY_SHORT[ws.getDay()]} ${ws.getDate()} ${MONTHS[ws.getMonth()]} — ${DAY_SHORT[we.getDay()]} ${we.getDate()} ${MONTHS[we.getMonth()]}`;

    const dayCards = dates.map(date => {
      const dateStr  = formatDate(date);
      const isPast   = date < todayMid;
      const isToday  = dateStr === todayStr;
      const slots    = isPast ? [] : getSlotsForDay(date, duration, bookedSlots, schedule);
      const isHoliday = slots === null;

      const availCount = isHoliday ? 0 : slots.filter(s => s.available).length;

      let slotsHTML;
      if (isPast) {
        slotsHTML = mobile ? '' : '<span class="cal-closed">—</span>';
      } else if (isHoliday) {
        slotsHTML = '<span class="cal-closed" style="color:#cc1f1f">Holiday</span>';
      } else if (slots.length === 0 || availCount === 0) {
        slotsHTML = '<span class="cal-closed">Closed</span>';
      } else {
        slotsHTML = slots.map(slot => `
          <button
            class="cal-slot ${!slot.available ? 'booked' : ''} ${selectedDate===dateStr && selectedTime===slot.time ? 'selected' : ''}"
            data-date="${dateStr}"
            data-time="${slot.time}"
            ${!slot.available ? 'disabled' : ''}
          >${slot.display}</button>
        `).join('');
      }

      if (mobile) {
        const isOpen = isToday || (selectedDate === dateStr);
        const statusLabel = isPast ? '' : isHoliday ? 'Holiday' : availCount === 0 ? 'Closed' : `${availCount} open`;
        return `
          <div class="cal-day ${isPast ? 'past' : ''} ${isToday ? 'today-day' : ''}" data-date="${dateStr}">
            <div class="cal-day-header ${isToday ? 'today' : ''}" data-toggle="${dateStr}">
              <div class="cal-day-header-left">
                <span class="cal-day-num">${date.getDate()}</span>
                <span class="cal-day-name">${DAY_FULL[date.getDay()]}</span>
              </div>
              <span class="cal-day-toggle">${statusLabel}</span>
            </div>
            <div class="cal-slots ${isOpen ? 'open' : ''}">
              ${slotsHTML}
            </div>
          </div>
        `;
      } else {
        return `
          <div class="cal-day ${isPast ? 'past' : ''}">
            <div class="cal-day-header ${isToday ? 'today' : ''}">
              <span class="cal-day-name">${DAY_SHORT[date.getDay()]}</span>
              <span class="cal-day-num">${date.getDate()}</span>
            </div>
            <div class="cal-slots">${slotsHTML}</div>
          </div>
        `;
      }
    }).join('');

    container.innerHTML = `
      <div class="cal-nav">
        <button class="cal-nav-btn" id="prev-week" ${weekOffset===0 ? 'disabled' : ''}>← Prev</button>
        <span class="cal-week-label">${weekLabel}</span>
        <button class="cal-nav-btn" id="next-week" ${weekOffset>=4 ? 'disabled' : ''}>Next →</button>
      </div>
      <div class="cal-grid">${dayCards}</div>
      <div class="cal-selected">
        ${selectedDate && selectedTime
          ? `<span class="cal-selected-text">✓ <strong>${selectedDate}</strong> at <strong>${toDisplay(selectedTime)}</strong></span>
             <button class="cal-clear" id="cal-clear">Clear</button>`
          : `<span class="cal-selected-placeholder">No slot selected — pick a time above</span>`
        }
      </div>
    `;

    document.getElementById('prev-week').addEventListener('click', () => { if (weekOffset>0) { weekOffset--; render(); } });
    document.getElementById('next-week').addEventListener('click', () => { if (weekOffset<4) { weekOffset++; render(); } });

    if (mobile) {
      container.querySelectorAll('[data-toggle]').forEach(header => {
        header.addEventListener('click', () => {
          const slots = header.closest('.cal-day').querySelector('.cal-slots');
          slots.classList.toggle('open');
        });
      });
    }

    container.querySelectorAll('.cal-slot:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDate = btn.dataset.date;
        selectedTime = btn.dataset.time;
        onSelect(selectedDate, selectedTime);
        render();
      });
    });

    const clearBtn = document.getElementById('cal-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectedDate = ''; selectedTime = '';
        onSelect('', ''); render();
      });
    }
  }

  document.getElementById('b-service').addEventListener('change', () => {
    selectedDate = ''; selectedTime = '';
    onSelect('', ''); render();
  });

  render();
  return { refresh: render };
}