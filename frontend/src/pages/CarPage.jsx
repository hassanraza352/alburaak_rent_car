import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  loadCars,
  money,
  iso,
  fmtDate,
  overlaps,
  isBooked,
  freeUntil,
} from "../lib/cars.js";
import { api } from "../lib/api.js";

const TODAY_DATE = new Date();
const TODAY = iso(TODAY_DATE);
const START_YEAR = TODAY_DATE.getFullYear();
const START_MONTH = TODAY_DATE.getMonth();
const MAX_MONTHS = 12;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Social URLs bina "https://" ke save ho jayen to unhe theek karta hai.
const normalizeUrl = (url) => {
  const u = String(url || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

export default function CarPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cars, setCars] = useState(loadCars);
  const [settings, setSettings] = useState({});
  const [selectedImage, setSelectedImage] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  const touchStartX = useRef(null);

  const [customerDetails, setCustomerDetails] = useState({
    customerName: "",
    phone: "",
    email: "",
    pickupLocation: "",
  });

  const updateCustomer = (key) => (e) =>
    setCustomerDetails((v) => ({
      ...v,
      [key]: e.target.value,
    }));

  useEffect(() => {
    api.getCars().then(setCars).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  // Home page par jaa kar #fleet section tak smooth scroll karta hai.
  const goToFleet = (e) => {
    e.preventDefault();
    navigate("/");

    let tries = 0;
    const tryScroll = () => {
      const el = document.getElementById("fleet");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (++tries < 30) setTimeout(tryScroll, 50);
    };
    setTimeout(tryScroll, 0);
  };

  const car = cars.find((c) => String(c.id) === String(id)) || cars[0];

  // Get all car images, supporting old and new records.
  const carImages = car
    ? [
        ...new Set([
          ...(Array.isArray(car.images) ? car.images : []),
          ...(car.img ? [car.img] : []),
        ]),
      ].filter(Boolean).slice(0, 4)
    : [];

  const activeImage =
    carImages.includes(selectedImage)
      ? selectedImage
      : carImages[0] || "/images/car.jpg";

  const activeIndex = carImages.indexOf(activeImage);

  // Only show images other than the currently active image.
  const thumbnailImages = carImages.filter(
    (image) => image !== activeImage
  );

  useEffect(() => {
    setSelectedImage("");
  }, [id]);

  // Change main image.
  const changeImage = (index) => {
    if (!carImages.length) return;

    const nextIndex =
      (index + carImages.length) % carImages.length;

    setSelectedImage(carImages[nextIndex]);
  };

  // Previous image.
  const previousImage = () => {
    changeImage(activeIndex - 1);
  };

  // Next image.
  const nextImage = () => {
    changeImage(activeIndex + 1);
  };

  // Detect swipe start.
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // Detect swipe end.
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const difference = touchStartX.current - touchEndX;

    if (Math.abs(difference) > 50) {
      if (difference > 0) {
        nextImage();
      } else {
        previousImage();
      }
    }

    touchStartX.current = null;
  };

  const [type, setType] = useState("self");

  // Default selection: aaj se aaj tak.
  const [fromIn, setFromIn] = useState(TODAY);
  const [toIn, setToIn] = useState(TODAY);

  const [range, setRange] = useState({
    from: TODAY,
    to: TODAY,
  });

  useEffect(() => {
    if (car) document.title = `${car.name} | Al Buraak`;
    else document.title = "Car details | Al Buraak";
  }, [car]);

  // Past dates allow nahi hain. Range sirf aaj ya us ke baad ka ho sakta hai.
  const onDate = (which, value) => {
    if (!value) return;
    if (value < TODAY) value = TODAY;

    const f = which === "from" ? value : fromIn;
    const t = which === "to" ? value : toIn;

    if (which === "from") setFromIn(value);
    else setToIn(value);

    if (f && t && t >= f) {
      setRange({ from: f, to: t });
    }
  };

  if (!car) {
    return (
      <div className="site">
        <header className="nav">
          <div className="wrap nav-in">
            <Link to="/" className="brand">
              <img
                src="/assets/logo.png"
                alt="Al Buraak logo"
                className="logo-img"
              />
            </Link>

            <a className="back" href="/#fleet" onClick={goToFleet}>
              ← All cars
            </a>
          </div>
        </header>

        <main className="wrap car-page">
          <p className="empty">No car found.</p>
        </main>
      </div>
    );
  }

  const busy = overlaps(car, range.from, range.to);
  const self = type === "self";
  const price = self ? car.self : car.driver;

  const days =
    (new Date(range.to) - new Date(range.from)) / 86400000 + 1;

  const total = price * days;

  const startBooking = async () => {
    const {
      customerName,
      phone,
      email,
      pickupLocation,
    } = customerDetails;

    if (
      !customerName.trim() ||
      !phone.trim() ||
      !pickupLocation.trim()
    ) {
      window.alert(
        "Please fill in your name, phone number and pickup location."
      );
      return;
    }

    const whatsappWindow = window.open("_blank");

    try {
      const saved = await api.createBooking({
        customerName,
        phone,
        email,
        carId: car.id,
        rentalType: type,
        pickupDate: range.from,
        returnDate: range.to,
        pickupLocation,
      });

    const message = `Assalamualaikum Al Buraak! I submitted booking request ${saved.bookingId}.
Name: ${customerName}
Phone: ${phone}
Email: ${email || "Not provided"}
Car: ${car.name}
Color: ${car.color || "Not specified"}
Type: ${self ? "Self drive" : "With driver"}
Pickup: ${range.from}
Return: ${range.to}
Location: ${pickupLocation}
Please confirm availability and final quote.`;
      const whatsappNumber = String(
        settings.whatsapp || "923130446260"
      ).replace(/\D/g, "");

      if (whatsappWindow) {
        whatsappWindow.location.href =
          `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      }

      window.alert(
        "Booking request saved. WhatsApp will open to send the details."
      );
    } catch (error) {
      if (whatsappWindow) whatsappWindow.close();
      window.alert(error.message);
    }
  };

  // Calendar: current month se shuru, arrows se aage navigate.
  const viewDate = new Date(START_YEAR, START_MONTH + monthOffset, 1);
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < first; i++) {
    cells.push(<div key={`b${i}`} className="day blank" />);
  }

  for (let d = 1; d <= count; d++) {
    const key = iso(new Date(y, m, d));

    const cls =
      key < TODAY ? "past" : isBooked(car, key) ? "booked" : "free";

    const picked =
      key >= range.from && key <= range.to ? " picked" : "";

    cells.push(
      <div key={d} className={`day ${cls}${picked}`} title={fmtDate(key)}>
        {d}
      </div>
    );
  }

  const calendar = (
    <div className="month">
      <div className="cal-nav">
        <button
          type="button"
          className="cal-btn"
          onClick={() => setMonthOffset((v) => v - 1)}
          disabled={monthOffset === 0}
          aria-label="Previous month"
        >
          &#10094;
        </button>

        <h4>{monthLabel}</h4>

        <button
          type="button"
          className="cal-btn"
          onClick={() => setMonthOffset((v) => v + 1)}
          disabled={monthOffset >= MAX_MONTHS - 1}
          aria-label="Next month"
        >
          &#10095;
        </button>
      </div>

      <div className="grid-cal">
        {WEEKDAYS.map((d) => (
          <div key={d} className="wd">
            {d}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );

  return (
    <div className="site">
      <header className="nav">
        <div className="wrap nav-in">
          <Link to="/" className="brand">
            <img
              src="/assets/logo.png"
              alt="Al Buraak logo"
              className="logo-img"
            />
          </Link>

          <a className="back" href="/#fleet" onClick={goToFleet}>
            ← All cars
          </a>
        </div>
      </header>

      <main className="wrap car-page" id="page">
        <p className="crumbs">
          <Link to="/">Home</Link> /
          <a href="/#fleet" onClick={goToFleet}> Fleet</a> /
          <span> {car.name}</span>
        </p>

        {/* CAR GALLERY */}

        <section className="car-hero">
          <div className="car-gallery">

            {/* MAIN IMAGE */}
            <div
              className="car-stage"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                key={activeImage}
                src={activeImage}
                alt={car.name}
                draggable="false"
                onError={(e) => {
                  e.currentTarget.src = "/images/car.jpg";
                }}
              />

              {carImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="gallery-arrow gallery-prev"
                    onClick={previousImage}
                    aria-label="Previous image"
                  >
                    &#10094;
                  </button>

                  <button
                    type="button"
                    className="gallery-arrow gallery-next"
                    onClick={nextImage}
                    aria-label="Next image"
                  >
                    &#10095;
                  </button>

                  <span className="gallery-counter">
                    {activeIndex + 1} / {carImages.length}
                  </span>
                </>
              )}
            </div>

            {/* THUMBNAILS */}
            {thumbnailImages.length > 0 && (
              <div className="car-thumbnails">
                {thumbnailImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className="car-thumbnail"
                    onClick={() => setSelectedImage(image)}
                    aria-label={`View car image ${index + 2}`}
                  >
                    <img
                      src={image}
                      alt={`${car.name} view ${index + 2}`}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="car-main">
            <p className="kicker">Car rental · Lahore</p>

            <h1>{car.name}</h1>

            <p className="lead">{car.desc}</p>

            <ul className="specs">
              <li>
                Seats<b>{car.seats}</b>
              </li>

              <li>
                Luggage<b>{car.bags} bags</b>
              </li>

              <li>
                Transmission<b>{car.trans}</b>
              </li>

              <li>
                Fuel<b>{car.fuel}</b>
              </li>

              {car.color && (
                <li>
                  Colour<b>{car.color}</b>
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="car-grid">
          <div className="panel">
            <h2>Choose rental type</h2>

            <div
              className="seg"
              role="group"
              aria-label="Rental type"
            >
              <button
                className={`seg-btn ${self ? "on" : ""}`}
                aria-pressed={self}
                onClick={() => setType("self")}
              >
                Self drive
                <small>{money(car.self)} / day</small>
              </button>

              <button
                className={`seg-btn ${!self ? "on" : ""}`}
                aria-pressed={!self}
                onClick={() => setType("driver")}
              >
                With driver
                <small>{money(car.driver)} / day</small>
              </button>
            </div>

            <ul className="opt-list">
              {self ? (
                <>
                  <li>
                    You drive. Driving license and CNIC required.
                  </li>
                  <li>
                    Refundable security deposit at handover.
                  </li>
                </>
              ) : (
                <>
                  <li>Driver included in the quote.</li>
                  <li>
                    Driver's food and rest time covered in the total.
                  </li>
                </>
              )}
            </ul>

            <h2>Your booking details</h2>

            <div className="booking-details car-booking-details">
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
                  placeholder="Area / address"
                  required
                />
              </label>
            </div>

            <h2>Pick your dates</h2>

            <div className="dates-row">
              <label>
                From
                <input
                  type="date"
                  id="from"
                  min={TODAY}
                  value={fromIn}
                  onChange={(e) =>
                    onDate("from", e.target.value)
                  }
                />
              </label>

              <label>
                To
                <input
                  type="date"
                  id="to"
                  min={fromIn || TODAY}
                  value={toIn}
                  onChange={(e) =>
                    onDate("to", e.target.value)
                  }
                />
              </label>
            </div>

            <div className={`avail-box ${busy ? "busy" : "ok"}`}>
              {busy
                ? "This car is booked on some of these dates. Pick other dates or message us."
                : `Available on your dates. Free until ${freeUntil(car, range.from)}.`}
            </div>

            <p className="total">
              Estimated total: <b>{money(total)}</b> for{" "}
              {days} day(s). Final quote is confirmed on WhatsApp.
            </p>

            <button
              className="btn btn-red btn-block"
              type="button"
              onClick={startBooking}
            >
              Book now on WhatsApp (
              {self ? "self drive" : "with driver"})
            </button>

            <p className="fine">
              No login needed. We confirm details with you on WhatsApp.
            </p>
          </div>

          <div className="panel">
            <h2>Availability calendar</h2>

            <div className="legend">
              <span>
                <i className="sw free"></i>Free
              </span>

              <span>
                <i className="sw booked"></i>Booked
              </span>

              <span>
                <i className="sw picked"></i>Your dates
              </span>
            </div>

            <div className="calendars">{calendar}</div>

            <p className="fine">
              Booked days update as new bookings are confirmed.
            </p>
          </div>
        </section>

        <p className="back-row">
          <a className="btn btn-ghost" href="/#fleet" onClick={goToFleet}>
            ← Back to all cars
          </a>
        </p>
      </main>

      <footer className="foot small-foot">
        <div className="wrap foot-bottom">
          © {new Date().getFullYear()} Al Buraak. Car rental in Lahore.
          Self drive or with driver.
        </div>

        <div className="wrap footer-social">
          {[
            ["Instagram", settings.instagram],
            ["Facebook", settings.facebook],
            ["TikTok", settings.tiktok],
            ["YouTube", settings.youtube],
            ["LinkedIn", settings.linkedin],
          ]
            .map(([name, url]) => [name, normalizeUrl(url)])
            .filter(([, url]) => url)
            .map(([name, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {name}
              </a>
            ))}
        </div>
      </footer>
    </div>
  );
}