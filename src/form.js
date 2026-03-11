import { addBooking, notifyBarber } from './booking.js';
import { initCalendar } from './calendar.js';

let selectedDate = '';
let selectedTime = '';

initCalendar((date, time) => {
  selectedDate = date;
  selectedTime = time;
});

async function submitBooking() {
  const name = document.getElementById('b-name').value.trim();
  const email = document.getElementById('b-email').value.trim();
  const service = document.getElementById('b-service').value;
  const msg = document.getElementById('booking-msg');
  const btn = document.getElementById('book-btn');

  if (!name || !email || !service) {
    msg.className = 'error';
    msg.textContent = '— Please fill in your name, email and service';
    return;
  }

  if (!selectedDate || !selectedTime) {
    msg.className = 'error';
    msg.textContent = '— Please select a time slot from the calendar';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Booking...';
  msg.textContent = '';

  try {
    const booking = { name, email, service, date: selectedDate, time: selectedTime };
    await addBooking(booking);
    await notifyBarber(booking);
    btn.textContent = 'Book Appointment';
    btn.disabled = false;
    msg.className = 'success';
    msg.textContent = '✓ Booking received — we\'ll be in touch!';
    document.getElementById('b-name').value = '';
    document.getElementById('b-email').value = '';
    document.getElementById('b-service').value = '';
    selectedDate = '';
    selectedTime = '';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Book Appointment';
    msg.className = 'error';
    msg.textContent = '— Something went wrong, please try again';
    console.error(err);
  }
}

document.getElementById('book-btn').addEventListener('click', submitBooking);

console.log('form.js loaded ✓');