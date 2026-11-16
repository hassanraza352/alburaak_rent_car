import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api.js';
import { fmtDate, money, nights, overlaps, todayISO } from '../lib/cars.js';

export default function Bookings() {
  const { cars, bookings, commit, refresh, notify } = useOutletContext();

  const [carId, setCarId] = useState(cars[0] ? String(cars[0].id) : '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState('');

  const t = todayISO();

  const blocked = cars
    .flatMap((car) => (car.booked || []).map((b, i) => ({ car, b, i })))
    .sort((a, b) => (a.b[0] < b.b[0] ? -1 : 1));

  const add = async (e) => {
    e.preventDefault();

    const car = cars.find((c) => String(c.id) === String(carId));

    if (!car || !from || !to) return notify('Choose a car and both dates', 'err');
    if (to < from) return notify('End date cannot be before start date', 'err');
    if (overlaps(car, from, to))
      return notify(`${car.name} is already blocked on some of these dates`, 'err');

    const next = cars.map((c) =>
      c.id === car.id
        ? {
            ...c,
            booked: [...(c.booked || []), [from, to, note.trim()]].sort((a, b) =>
              a[0] < b[0] ? -1 : 1
            ),
          }
        : c
    );

    if (await commit(next)) {
      setFrom('');
      setTo('');
      setNote('');
      notify('Dates blocked on website');
    }
  };

  const removeBlocked = async (car, idx) => {
    if (!confirm('Remove these blocked dates?')) return;

    const next = cars.map((c) =>
      c.id === car.id
        ? { ...c, booked: c.booked.filter((_, i) => i !== idx) }
        : c
    );

    if (await commit(next)) notify('Blocked dates removed');
  };

  // Status update. Agar status "Completed" ho to booking delete bhi ho jati hai.
  const update = async (id, patch) => {
    setBusyId(id);
    try {
      await api.updateBooking(id, patch);

      if (patch.status === 'Completed') {
        await api.deleteBooking(id);
        await refresh();
        notify('Booking completed and removed from list');
      } else {
        await refresh();
        notify('Booking updated');
      }
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this booking request permanently?')) return;

    try {
      await api.deleteBooking(id);
      await refresh();
      notify('Booking deleted');
    } catch (e) {
      notify(e.message, 'err');
    }
  };

  return (
    <section className="view">
      <div className="card">
        <div className="card-head">
          <h2>Add manual availability block</h2>
        </div>
        <form className="form-row" onSubmit={add}>
          <label>
            Car
            <select value={carId} onChange={(e) => setCarId(e.target.value)}>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.color ? `(${c.color})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Customer / note
            <input
              type="text"
              placeholder="Name or phone"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button className="btn btn-red" type="submit">
            Block dates
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Manual blocked dates</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Car</th>
                <th>From</th>
                <th>To</th>
                <th>Length</th>
                <th>Customer / note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {blocked.map(({ car, b, i }) => (
                <tr
                  key={`${car.id}-${i}-${b[0]}`}
                  className={b[1] < t ? 'past' : ''}
                >
                  <td>
                    <b>
                      {car.name}{car.color ? `(${car.color})` : ''}
                    </b>
                  </td>
                  <td>{fmtDate(b[0])}</td>
                  <td>{fmtDate(b[1])}</td>
                  <td>{nights(b[0], b[1])} day(s)</td>
                  <td>{b[2] || '—'}</td>
                  <td className="actions">
                    <button
                      className="btn-sm danger"
                      type="button"
                      onClick={() => removeBlocked(car, i)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {blocked.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No manual blocked dates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Customer booking requests</h2>
          <span>{bookings.length} total</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Car / type</th>
                <th>Dates</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <b>{b.bookingId}</b>
                    <small>{new Date(b.createdAt).toLocaleDateString()}</small>
                  </td>
                  <td>
                    <b>{b.customerName}</b>
                    <small>{b.phone}</small>
                    <small>{b.pickupLocation}</small>
                  </td>
                  <td>
                    <b>
                      {b.car?.name}
                      {b.car?.color ? ` (${b.car.color})` : ''}
                    </b>
                    <small>
                      {b.rentalType === 'self' ? 'Self drive' : 'With driver'}
                    </small>
                  </td>
                  <td>
                    {fmtDate(b.pickupDate)} – {fmtDate(b.returnDate)}
                  </td>
                  <td>
                    {money(b.totalAmount || 0)}
                    <small>{b.paymentStatus}</small>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        b.status === 'Confirmed'
                          ? 'ok'
                          : b.status === 'Cancelled'
                          ? 'busy'
                          : ''
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="actions">
                    <select
                      aria-label="Booking status"
                      value={b.status}
                      disabled={busyId === b._id}
                      onChange={(e) => update(b._id, { status: e.target.value })}
                    >
                      <option>Pending</option>
                      <option>Confirmed</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                    <button
                      className="btn-sm danger"
                      type="button"
                      onClick={() => remove(b._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No customer booking requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted">
          New requests are Pending. Confirm only after checking availability. Confirmed bookings automatically block the selected dates. Completed bookings are removed from this list.
        </p>
      </div>
    </section>
  );
}