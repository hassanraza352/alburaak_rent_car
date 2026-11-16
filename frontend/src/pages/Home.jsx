import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCars, WA, money, overlaps, freeUntil, iso } from "../lib/cars.js";
import { api } from "../lib/api.js";

const TODAY = iso(new Date());
const photo = (c) => c.img || "/images/car.jpg";

export default function Home() {
  const [cars, setCars] = useState(loadCars);
  const [settings, setSettings] = useState({});

  // Default: aaj se aaj tak
  const [fromIn, setFromIn] = useState(TODAY);
  const [toIn, setToIn] = useState(TODAY);
  const [range, setRange] = useState({ from: TODAY, to: TODAY });

  const firstId = cars[0] ? String(cars[0].id) : "";
  const [selSelf, setSelSelf] = useState(firstId);
  const [selDriver, setSelDriver] = useState(firstId);
  const [loaderDone, setLoaderDone] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    customerName: "",
    phone: "",
    email: "",
    pickupLocation: "",
  });

  const updateCustomer = (key) => (e) =>
    setCustomerDetails((v) => ({ ...v, [key]: e.target.value }));

  // Same page par section tak smooth scroll. "top" par page ke start tak jata hai.
  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMenuOpen(false);

    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.history.replaceState(null, "", `#${id}`);
  };

  // Past dates allow nahi. "to" kabhi "from" se pehle nahi ho sakti.
  const onDate = (which, value) => {
    if (!value) return;
    if (value < TODAY) value = TODAY;

    let f = which === "from" ? value : fromIn;
    let t = which === "to" ? value : toIn;

    if (t < f) t = f;

    setFromIn(f);
    setToIn(t);
    setRange({ from: f, to: t });
  };

  const carById = (id) => cars.find((c) => String(c.id) === String(id));

  useEffect(() => {
    api
      .getCars()
      .then((data) => {
        setCars(data);
        if (data[0]) {
          setSelSelf(String(data[0].id));
          setSelDriver(String(data[0].id));
        }
      })
      .catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const startBooking = async (car, rentalType) => {
    if (!car) return;

    const { customerName, phone, email, pickupLocation } = customerDetails;

    if (!customerName.trim() || !phone.trim() || !pickupLocation.trim()) {
      window.alert("Please fill in your name, phone number and pickup location above.");
      return;
    }

    // Popup ko user ke click ke foran khola jata hai, warna browser block kar deta hai.
    const whatsappWindow = window.open("about:blank", "_blank");

    try {
      const saved = await api.createBooking({
        customerName,
        phone,
        email,
        carId: car.id,
        rentalType,
        pickupDate: range.from,
        returnDate: range.to,
        pickupLocation,
      });

      const type = rentalType === "self" ? "Self drive" : "With driver";

      const message = `Assalamualaikum Al Buraak! I submitted booking request ${saved.bookingId}.
Name: ${customerName}
Phone: ${phone}
Email: ${email || "Not provided"}
Car: ${car.name}
Color: ${car.color || "Not specified"}
Type: ${type}
Pickup: ${range.from}
Return: ${range.to}
Location: ${pickupLocation}
Please confirm availability and final quote. Thank you so much.`;

      const whatsappNumber = String(settings.whatsapp || WA).replace(/\D/g, "");
      const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      if (whatsappWindow && !whatsappWindow.closed) {
        // Popup mil gaya to usi tab mein WhatsApp kholo.
        whatsappWindow.location.href = waUrl;
      } else {
        // Popup block hua to same tab mein WhatsApp kholo.
        window.location.href = waUrl;
      }

      window.alert("Your booking request has been saved. WhatsApp will open to send the details.");
    } catch (error) {
      if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      window.alert(error.message);
    }
  };

  // Loader
  useEffect(() => {
    const loaderShown = sessionStorage.getItem("loaderShown");

    if (loaderShown) {
      setLoaderDone(true);
    } else {
      const t = setTimeout(() => {
        setLoaderDone(true);
        sessionStorage.setItem("loaderShown", "true");
      }, 1600);

      return () => clearTimeout(t);
    }
  }, []);

  // Nav shadow on scroll
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document
      .querySelectorAll(".site .reveal:not(.in)")
      .forEach((el) => io.observe(el));
    return () => io.disconnect();
  });

  const selfCar = carById(selSelf);
  const driverCar = carById(selDriver);

  return (
    <div className="site">
      <div className={`loader ${loaderDone ? "done" : ""}`} id="loader" aria-hidden="true">
        <img className="loader-logo" src="/assets/logo.png" alt="" />
        <div className="loader-road">
          <span className="loader-car">🚗</span>
        </div>
        <div className="loader-text">Getting the road ready...</div>
      </div>

      <header className={`nav ${scrolled ? "scrolled" : ""}`} id="nav">
        <div className="wrap nav-in">
          <a href="#top" className="brand" onClick={(e) => scrollToSection(e, "top")}>
            <img src="/assets/logo.png" alt="Al Buraak logo" className="logo-img" />
          </a>
          <nav className={`menu ${menuOpen ? "open" : ""}`} id="menu">
            <a href="#fleet" onClick={(e) => scrollToSection(e, "fleet")}>Fleet</a>
            <a href="#why" onClick={(e) => scrollToSection(e, "why")}>Why us</a>
            <a href="#book" onClick={(e) => scrollToSection(e, "book")}>Book</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")}>Rates</a>
            <a href="#location" onClick={(e) => scrollToSection(e, "location")}>Location</a>
            <a href="#faq" onClick={(e) => scrollToSection(e, "faq")}>FAQ</a>
          </nav>
          <div className="nav-actions">
            <a
              className="btn btn-red btn-sm"
              href={`https://wa.me/${String(settings.whatsapp || WA).replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener"
            >
              WhatsApp
            </a>
            <button
              className="burger"
              id="burger"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Intro */}
      <section className="hero" id="top">
        <div className="wrap hero-in">
          <div className="hero-copy reveal">
            <p className="kicker">About Al Buraak</p>
            <h1>Car rental in Lahore, built on trust.</h1>
            <p className="lead">
              Al Buraak is a Lahore car rental company for families, professionals, event guests and travellers. Choose a self drive car or a car with an experienced driver. Every car is checked before handover, and every price is written clearly before you confirm.
            </p>
            <div className="hero-actions">
              <a className="btn btn-red" href="#fleet" onClick={(e) => scrollToSection(e, "fleet")}>
                See our cars
              </a>
              <a className="btn btn-ghost" href="#book" onClick={(e) => scrollToSection(e, "book")}>
                Self drive or with driver
              </a>
            </div>
            <ul className="hero-points">
              <li>Sedans and SUVs</li>
              <li>Self drive or with driver</li>
              <li>Book on WhatsApp, no login</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="strip">
        <div className="wrap strip-in">
          <div><b>12+</b><span>Cars in Lahore</span></div>
          <div><b>Same day</b><span>Delivery in most areas</span></div>
          <div><b>24/7</b><span>WhatsApp support</span></div>
          <div><b>Fixed</b><span>Daily rate, no hidden fees</span></div>
        </div>
      </section>

      {/* Why */}
      <section className="sec" id="why">
        <div className="wrap">
          <div className="head reveal">
            <p className="kicker">Why choose us</p>
            <h2>Simple rules we follow on every booking</h2>
          </div>
          <div className="grid-4">
            <article className="feature reveal">
              <span className="ico">✓</span>
              <h3>Checked before every trip</h3>
              <p>Oil, tyres, brakes and AC are checked before handover, and we share a photo report on WhatsApp.</p>
            </article>
            <article className="feature reveal">
              <span className="ico">₨</span>
              <h3>Clear pricing</h3>
              <p>The daily rate you see is the rate you pay. Fuel and driver charges are written in the quote first.</p>
            </article>
            <article className="feature reveal">
              <span className="ico">👤</span>
              <h3>Trained drivers</h3>
              <p>Our drivers know Lahore's roads, arrive on time and can plan airport or wedding schedules.</p>
            </article>
            <article className="feature reveal">
              <span className="ico">⏱</span>
              <h3>Quick booking</h3>
              <p>No account or app. Pick a car, send one WhatsApp message and we confirm the details with you.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="sec sec-grey" id="fleet">
        <div className="wrap">
          <div className="head head-row reveal">
            <div>
              <p className="kicker">Our fleet</p>
              <h2>Select a car</h2>
              <p className="sub">Open any car to see its specs, rates and availability calendar.</p>
            </div>
            <div className="filters">
              <div className="dates-bar">
                <label>
                  From
                  <input
                    type="date"
                    id="fromDate"
                    min={TODAY}
                    value={fromIn}
                    onChange={(e) => onDate("from", e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    id="toDate"
                    min={fromIn || TODAY}
                    value={toIn}
                    onChange={(e) => onDate("to", e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="cars" id="cars">
            {cars.map((c) => {
              const busy = overlaps(c, range.from, range.to);
              return (
                <Link className="car reveal in" key={c.id} to={`/car/${c.id}`}>
                  <div className="car-img">
                    <img src={photo(c)} alt={c.name} loading="lazy" />
                    <span className={`tag-avail ${busy ? "busy" : ""}`}>
                      {busy ? "Booked" : "Available"}
                    </span>
                  </div>
                  <div className="car-body">
                    <div className="car-top">
                      <div>
                        <h3>{c.name}</h3>
                        <small>{c.fuel}</small>
                      </div>
                      <div className="car-price">
                        {money(c.self)}
                        <small>self drive / day</small>
                      </div>
                    </div>
                    <div className="specs-mini">
                      <span>{c.seats} seats</span>
                      <span>{c.bags} bags</span>
                      <span>{c.trans}</span>
                      {c.color && <span>{c.color}</span>}
                    </div>
                    <p className={`status ${busy ? "busy" : ""}`}>
                      {busy
                        ? "Booked on your dates"
                        : `Available · free until ${freeUntil(c, range.from)}`}
                    </p>
                    <span className="view">View details →</span>
                  </div>
                </Link>
              );
            })}
            {cars.length === 0 && <p className="empty">No cars available right now.</p>}
          </div>
        </div>
      </section>

      {/* Book */}
      <section className="sec" id="book">
        <div className="wrap">
          <div className="head reveal">
            <p className="kicker">Book now</p>
            <h2>Self drive or with driver</h2>
            <p className="sub">
              Choose a car and a rental type, then book on WhatsApp. We confirm the total and pick-up time with you.
            </p>
          </div>
          <div className="booking-details reveal">
            <label>
              Full name
              <input
                type="text"
                value={customerDetails.customerName}
                onChange={updateCustomer("customerName")}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Phone / WhatsApp
              <input
                type="tel"
                value={customerDetails.phone}
                onChange={updateCustomer("phone")}
                placeholder="03xx xxxxxxx"
                required
              />
            </label>
            <label>
              Email (optional)
              <input
                type="email"
                value={customerDetails.email}
                onChange={updateCustomer("email")}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Pickup location
              <input
                type="text"
                value={customerDetails.pickupLocation}
                onChange={updateCustomer("pickupLocation")}
                placeholder="Area / address in Lahore"
                required
              />
            </label>
          </div>
          <div className="book-grid">
            <article className="book-card reveal">
              <span className="tag-dark">Option 1</span>
              <h3>Self drive</h3>
              <p>You drive the car yourself. Bring a valid driving license and your CNIC.</p>
              <ul>
                <li>Driving license required</li>
                <li>Refundable security deposit</li>
                <li>Fuel returned at the same level</li>
              </ul>
              <label className="field">
                Select car
                <select
                  className="car-select"
                  value={selSelf}
                  onChange={(e) => setSelSelf(e.target.value)}
                >
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}> {c.name} {c.color ? `(${c.color})` : ""}</option>
                  ))}
                </select>
              </label>
              <button
                className="btn btn-black btn-block book-btn"
                type="button"
                onClick={() => startBooking(selfCar, "self")}
              >
                Book now on WhatsApp
              </button>
            </article>
            <article className="book-card featured reveal">
              <span className="tag-red">Most booked</span>
              <h3>With driver</h3>
              <p>An experienced driver takes care of the car. Ideal for weddings, events, airport trips and long days.</p>
              <ul>
                <li>Driver included in the quote</li>
                <li>Hourly rate for short trips</li>
                <li>Outstation trips with fixed quote</li>
              </ul>
              <label className="field">
                Select car
                <select
                  className="car-select"
                  value={selDriver}
                  onChange={(e) => setSelDriver(e.target.value)}
                >
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}> {c.name} {c.color ? `(${c.color})` : ""}</option>
                  ))}
                </select>
              </label>
              <button
                className="btn btn-red btn-block book-btn"
                type="button"
                onClick={() => startBooking(driverCar, "driver")}
              >
                Book now on WhatsApp
              </button>
            </article>
          </div>
        </div>
      </section>

      <div className="wrap">
        <p className="wa-note">
          Prefer to talk first? WhatsApp us on{" "}
          <a href={`https://wa.me/${String(settings.whatsapp || WA).replace(/\D/g, "")}`}>
            {settings.phone || "+92 319 4196426"}
          </a>
        </p>
      </div>

      {/* Pricing */}
      <section className="sec sec-grey" id="pricing">
        <div className="wrap">
          <div className="head reveal">
            <p className="kicker">Rates</p>
            <h2>Daily rates in PKR</h2>
            <p className="sub">Final quote is confirmed on WhatsApp based on your dates and route.</p>
          </div>
          <div className="rates reveal">
            <table>
              <thead>
                <tr>
                  <th>Car</th>
                  <th>Self drive / day</th>
                  <th>With driver / day</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>
                        {c.name} {c.color ? `(${c.color})` : ""}
                      </b>
                    </td>
                    <td>{money(c.self)}</td>
                    <td>{money(c.driver)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How */}
      <section className="sec sec-dark" id="how">
        <div className="wrap">
          <div className="head reveal">
            <p className="kicker">How it works</p>
            <h2>Four steps from choosing to driving</h2>
          </div>
          <ol className="steps">
            <li className="reveal"><span>1</span><h3>Select a car</h3><p>Open the car and check the dates that are free.</p></li>
            <li className="reveal"><span>2</span><h3>Send a message</h3><p>Tap Book now on WhatsApp. The details are filled in for you.</p></li>
            <li className="reveal"><span>3</span><h3>Confirm the quote</h3><p>We confirm the total, pick-up point and time with you.</p></li>
            <li className="reveal"><span>4</span><h3>Pick up and go</h3><p>Bring your CNIC and license, check the car together and start.</p></li>
          </ol>
        </div>
      </section>

      {/* Areas */}
      <section className="sec">
        <div className="wrap split">
          <div className="reveal">
            <p className="kicker">Service areas</p>
            <h2>We deliver across Lahore</h2>
            <p className="sub">
              Choose a pick-up area when you book. Delivery to your home, office or the airport is available for a small extra fee.
            </p>
            <div className="tags">
              <span>Gulberg</span>
              <span>DHA</span>
              <span>Johar Town</span>
              <span>Model Town</span>
              <span>Bahria Town</span>
              <span>Lahore Airport</span>
              <span>Mall Road</span>
              <span>Wapda Town</span>
            </div>
          </div>
          <div className="reveal">
            <ul className="check">
              <li>
                <b>Airport pick-up and drop-off</b>
                <span>We track the flight time so the driver is ready when you land.</span>
              </li>
              <li>
                <b>Weddings and events</b>
                <span>Clean, well-kept cars for family functions.</span>
              </li>
              <li>
                <b>Outstation trips</b>
                <span>Trips from Lahore to nearby cities with a fixed quote.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="sec sec-grey" id="location">
        <div className="wrap">
          <div className="head reveal">
            <p className="kicker">Find us</p>
            <h2>Our Lahore office</h2>
          </div>
          <div className="loc">
            <div className="map" aria-label="Al Buraak office map">
              <iframe
                title="Al Buraak office location"
                width="100%"
                height="400"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${
                  settings.latitude !== null &&
                  settings.latitude !== undefined &&
                  settings.longitude !== null &&
                  settings.longitude !== undefined
                    ? `${settings.latitude},${settings.longitude}`
                    : encodeURIComponent(settings.mapLocation || settings.address || "Lahore, Pakistan")
                }&output=embed`}
              ></iframe>
              <div className="map-badge">
                {settings.mapLocation || settings.city || "Lahore, Pakistan"}
              </div>
            </div>
            <div className="loc-info reveal">
              <h3>Al Buraak Office</h3>
              <p>{settings.address || "Lahore, Pakistan"}</p>
              <dl>
                <dt>Phone</dt>
                <dd>{settings.phone || "+92 313 044 6260"}</dd>
                <dt>WhatsApp</dt>
                <dd>{settings.whatsapp || "+92 313 044 6260"}</dd>
                <dt>Email</dt>
                <dd>{settings.email || "alburakautos@gmail.com"}</dd>
                <dt>Hours</dt>
                <dd>{settings.openingHours || "Mon to Sat, 9 AM to 7 PM"}</dd>
              </dl>
              <a
                className="btn btn-black"
                href={
                  settings.googleMapsUrl ||
                  `https://maps.google.com/?q=${encodeURIComponent(settings.mapLocation || settings.address || "Lahore")}`
                }
                target="_blank"
                rel="noopener"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec" id="faq">
        <div className="wrap narrow">
          <div className="head reveal">
            <p className="kicker">Questions</p>
            <h2>Frequently asked</h2>
          </div>
          <div className="faq">
            <details className="reveal">
              <summary>What documents do I need?</summary>
              <p>A valid CNIC or passport, and a driving license for self drive. We keep copies on file for the trip only.</p>
            </details>
            <details className="reveal">
              <summary>Is there a mileage limit?</summary>
              <p>Daily rentals include a fair daily distance. Extra kilometres are charged at a fixed rate, shown in your quote.</p>
            </details>
            <details className="reveal">
              <summary>Can I change my dates after booking?</summary>
              <p>Yes, if the car is free. Message us on WhatsApp at least 12 hours before pick-up.</p>
            </details>
            <details className="reveal">
              <summary>What if the car breaks down?</summary>
              <p>Call or WhatsApp us right away. We send a replacement car or a recovery vehicle as soon as possible.</p>
            </details>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot-in">
          <div>
            <img src="/assets/logo.png" alt="Al Buraak" className="logo-img logo-light" />
            <p>Car rental in Lahore. Self drive or with driver.</p>
          </div>

          <div>
            <h4>Explore</h4>
            <a href="#fleet" onClick={(e) => scrollToSection(e, "fleet")}>Fleet</a>
            <a href="#book" onClick={(e) => scrollToSection(e, "book")}>Book</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")}>Rates</a>
            <a href="#faq" onClick={(e) => scrollToSection(e, "faq")}>FAQ</a>
          </div>

          <div>
            <h4>Contact</h4>
            <a href={`tel:${(settings.phone || "+923130446260").replace(/\s/g, "")}`}>
              {settings.phone || "+92 313 044 6260"}
            </a>
            <a href={`mailto:${settings.email || "alburakautos@gmail.com"}`}>
              {settings.email || "alburakautos@gmail.com"}
            </a>
          </div>
        </div>

        <div className="footer-credit-line">
          © {new Date().getFullYear()} Al Buraak. All Rights Reserved.
          <span className="footer-built">
            Built by
            <a href="https://code-stack-vibes.vercel.app/" rel="noopener noreferrer">
              Code Stack Vibes <span>↗</span>
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}