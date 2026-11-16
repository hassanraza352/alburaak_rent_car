import { useOutletContext } from "react-router-dom";
import { money, statusToday, todayISO } from "../lib/cars.js";

export default function Dashboard() {
  const { cars, bookings = [] } = useOutletContext();
  const t = todayISO();
  const busy = cars.filter((c) => statusToday(c).busy).length;
  const upcoming = cars.reduce((n, c) => n + (c.booked || []).filter(([, e]) => e >= t).length, 0);
  const avg = cars.length ? Math.round(cars.reduce((s, c) => s + c.self, 0) / cars.length) : 0;

  const stats = [
    ["Total cars", cars.length],
    ["Available today", cars.length - busy],
    ["Booked today", busy],
    ["Upcoming bookings", upcoming],
    ["Customer requests", bookings.length],
    ["Pending requests", bookings.filter((b) => b.status === "Pending").length],
    ["Avg self-drive rate", cars.length ? money(avg) : "—"],
  ];

  return (
    <section className="view">
      <div className="stats">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}><span>{label}</span><b>{value}</b></div>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><h2>Today's car status</h2><a href="/admin/cars">Manage cars →</a></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Car</th><th>Status today</th></tr></thead>
            <tbody>
              {cars.map((c) => {
                const st = statusToday(c);
                return (
                  <tr key={c.id}>
                    <td><b> {c.name} {c.color ? `(${c.color})` : ""}</b></td>
                    <td><span className={`badge ${st.busy ? "busy" : "ok"}`}>{st.label}</span></td>
                  </tr>
                );
              })}
              {cars.length === 0 && <tr><td colSpan={2} className="empty">No cars yet. Add one from the Cars page.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
