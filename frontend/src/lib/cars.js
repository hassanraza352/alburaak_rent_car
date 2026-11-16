// Shared demo defaults and date/price helpers. LocalStorage is read only for one-time migration of the old demo data.

export const DEFAULT_WA = "923000000000"; // WhatsApp number, digits only with country code
export const WA = DEFAULT_WA;
export const DEFAULT_IMG = "/images/car.jpg";
const STORAGE_KEY = "ab_cars";

// booked: [start, end, note] with YYYY-MM-DD dates. These dates are blocked on the website.
export const DEFAULT_CARS = [
  { id: 1, name: "Toyota Corolla", seats: 5, bags: 2, trans: "Automatic", fuel: "Petrol", self: 5000, driver: 7500, img: DEFAULT_IMG,
    desc: "A comfortable economy sedan for city drives, office trips and short family outings.",
    booked: [["2026-11-12", "2026-11-15", ""], ["2026-11-22", "2026-11-25", ""]] },
  { id: 2, name: "Honda Civic", seats: 5, bags: 2, trans: "Automatic", fuel: "Petrol", self: 7000, driver: 9500, img: DEFAULT_IMG,
    desc: "A premium sedan with a smooth ride, good cabin space and a quiet engine for longer trips.",
    booked: [["2026-11-14", "2026-11-18", ""]] },
  { id: 3, name: "Kia Sportage", seats: 5, bags: 3, trans: "Automatic", fuel: "Petrol", self: 9000, driver: 11500, img: DEFAULT_IMG,
    desc: "A compact SUV with high seating, extra luggage room and a confident feel on rough roads.",
    booked: [["2026-11-17", "2026-11-21", ""]] },
  { id: 4, name: "Toyota Fortuner", seats: 7, bags: 4, trans: "Automatic", fuel: "Diesel", self: 12000, driver: 14500, img: DEFAULT_IMG,
    desc: "A seven seat SUV for family trips, events and outstation travel with a lot of luggage.",
    booked: [] },
];

export function loadCars() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(v)) return v;
  } catch (e) { /* use defaults */ }
  return structuredClone(DEFAULT_CARS);
}

// Throws if browser storage is full. Callers should catch it.
export function saveCars(cars) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
}

export const money = (n) => "PKR " + Number(n).toLocaleString("en-PK");
// Local date as YYYY-MM-DD (toISOString would shift the day in Pakistan time).
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayISO = () => iso(new Date());
export const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const dayBefore = (d) => { const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() - 1); return iso(x); };
export const nights = (s, e) => Math.round((new Date(e + "T00:00:00") - new Date(s + "T00:00:00")) / 86400000) + 1;

// Is any booking inside [from, to]?
export const overlaps = (car, from, to) => (car.booked || []).some(([s, e]) => s <= to && e >= from);
// Is a single day booked?
export const isBooked = (car, day) => (car.booked || []).some(([s, e]) => day >= s && day <= e);

export function freeUntil(car, from) {
  const next = (car.booked || []).map((b) => b[0]).filter((s) => s > from).sort()[0];
  return next ? fmtDate(dayBefore(next)) : "end of November";
}

export function waLink(car, type, from, to) {
  const kind = type === "self" ? "self drive" : "with driver";
  const dates = from && to ? ` from ${fmtDate(from)} to ${fmtDate(to)}` : "";
const msg = `Assalamualaikum, I want to book the ${car.name} (${kind}), Color: ${car.color || "Not specified"} in Lahore${dates}. Please confirm the quote.`;  return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
}

// Booking status of a car for today (used by the admin panel).
export function statusToday(car) {
  const t = todayISO();
  const b = (car.booked || []).find(([s, e]) => s <= t && e >= t);
  return b ? { busy: true, label: `Booked until ${fmtDate(b[1])}` } : { busy: false, label: "Available" };
}
