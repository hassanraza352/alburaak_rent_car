import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { DEFAULT_IMG, money, statusToday } from "../lib/cars.js";
import { api } from "../lib/api.js";

const MAX_IMAGES = 4;
const MAX_SIZE = 5 * 1024 * 1024;

const EMPTY_FORM = {
  name: "",
  seats: 5,
  bags: 2,
  trans: "Automatic",
  fuel: "Petrol",
  selfPrice: "",
  driverPrice: "",
  color: "",
  desc: "",
};

export default function Cars() {
  const { cars, commit, notify } = useOutletContext();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const q = search.trim().toLowerCase();

  const list = cars.filter(
    (c) => !q || c.name.toLowerCase().includes(q)
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (car) => {
    setEditing(car);
    setFormOpen(true);
  };

  const remove = (car) => {
    if (!confirm(`Delete ${car.name}? Its bookings will be removed too.`))
      return;

    commit(cars.filter((c) => c.id !== car.id)).then((ok) => {
      if (ok) notify("Car deleted");
    });
  };

  const saveCar = async (data) => {
    let next;

    if (editing) {
      next = cars.map((c) =>
        c.id === editing.id ? { ...c, ...data } : c
      );
    } else {
      next = [...cars, { ...data, booked: [] }];
    }

    const ok = await commit(next);

    if (ok) {
      setFormOpen(false);
      notify("Car saved");
    }
  };

  return (
    <section className="view">
      <div className="card">
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search car name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="btn btn-red"
            type="button"
            onClick={openNew}
          >
            + Add car
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Car</th>
                <th className="hide-m">Gearbox / fuel</th>
                <th>Self drive / day</th>
                <th>With driver / day</th>
                <th>Status today</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {list.map((c) => {
                const st = statusToday(c);

                return (
                  <tr key={c.id}>
                    <td className="thumb">
                      <img
                        src={c.img || DEFAULT_IMG}
                        alt={c.name}
                      />
                    </td>

                    <td>
                      <b> {c.name} {c.color ? `(${c.color})` : ""}</b>
                      <small>
                        {c.seats} seats · {c.bags} bags
                        {c.color ? ` · ${c.color}` : ""}
                      </small>
                    </td>

                    <td className="hide-m">
                      {c.trans} / {c.fuel}
                    </td>

                    <td>{money(c.self)}</td>
                    <td>{money(c.driver)}</td>

                    <td>
                      <span
                        className={`badge ${st.busy ? "busy" : "ok"}`}
                      >
                        {st.label}
                      </span>
                    </td>

                    <td className="actions">
                      <button
                        className="btn-sm"
                        type="button"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-sm danger"
                        type="button"
                        onClick={() => remove(c)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No cars found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <CarForm
          key={editing ? editing.id : "new"}
          car={editing}
          onCancel={() => setFormOpen(false)}
          onSave={saveCar}
          notify={notify}
        />
      )}
    </section>
  );
}

function CarForm({ car, onCancel, onSave, notify }) {
  const dialogRef = useRef(null);

  const [v, setV] = useState(() =>
    car
      ? {
          name: car.name,
          seats: car.seats,
          bags: car.bags,
          trans: car.trans,
          fuel: car.fuel,
          selfPrice: String(car.self),
          driverPrice: String(car.driver),
          color: car.color || "",
          desc: car.desc || "",
        }
      : EMPTY_FORM
  );

  // Existing images load when editing a car.
  const [images, setImages] = useState(() => {
    if (!car) return [];

    const existingImages = Array.isArray(car.images)
      ? car.images
      : [];

    const allImages = [...existingImages];

    if (car.img && !allImages.includes(car.img)) {
      allImages.unshift(car.img);
    }

    return allImages.slice(0, MAX_IMAGES);
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();

    dialogRef.current
      ?.querySelector('input[name="name"]')
      ?.focus();
  }, []);

  const set = (key) => (e) => {
    setV((s) => ({
      ...s,
      [key]: e.target.value,
    }));
  };

  // Upload multiple images to Cloudinary through existing API.
  const pickPhotos = async (e) => {
    const files = Array.from(e.target.files || []);

    e.target.value = "";

    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;

    if (remaining <= 0) {
      notify("Maximum 4 images allowed", "err");
      return;
    }

    if (files.length > remaining) {
      notify(
        `You can upload only ${remaining} more image(s)`,
        "err"
      );
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        notify("Please select valid image files", "err");
        return;
      }

      if (file.size > MAX_SIZE) {
        notify(`${file.name} exceeds the 5MB limit`, "err");
        return;
      }
    }

    try {
      setUploading(true);

      const uploadedImages = [];

      for (const file of files) {
        const result = await api.uploadImage(file);

        if (!result?.url) {
          throw new Error("Image upload failed");
        }

        uploadedImages.push(result.url);
      }

      setImages((prev) =>
        [...prev, ...uploadedImages].slice(0, MAX_IMAGES)
      );

      notify(
        `${uploadedImages.length} image(s) uploaded successfully`
      );
    } catch (err) {
      notify(err.message || "Image upload failed", "err");
    } finally {
      setUploading(false);
    }
  };

  // Remove any image.
  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = (e) => {
    e.preventDefault();

    if (uploading) {
      return notify("Please wait for image uploads to finish", "err");
    }

    const data = {
      name: v.name.trim(),
      seats: +v.seats,
      bags: +v.bags,
      trans: v.trans,
      fuel: v.fuel,
      self: +v.selfPrice,
      driver: +v.driverPrice,
      desc: v.desc.trim(),
      color: v.color.trim(),

      // First image is the main image.
      img: images[0] || DEFAULT_IMG,

      // All four images are saved in order.
      images: [...images],
    };

    if (!data.name) {
      return notify("Car name is required", "err");
    }

    if (!(data.self > 0) || !(data.driver > 0)) {
      return notify(
        "Enter valid prices for both rental types",
        "err"
      );
    }

    if (!(data.seats > 0) || data.bags < 0) {
      return notify("Check the seats and bags values", "err");
    }

    onSave(data);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
    >
      <h2 className="dlg-title">
        {car ? `Edit ${car.name}` : "Add new car"}
      </h2>

      <form className="grid-form" onSubmit={submit}>
        {/* IMAGE UPLOAD SECTION */}

        <div className="full photo-box">
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0 }}>
                Car Photos ({images.length}/{MAX_IMAGES})
              </h3>

              <span className="muted">
                First image = Main photo
              </span>
            </div>

            {/* Image previews */}

            {images.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "12px",
                  marginBottom: "15px",
                }}
              >
                {images.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    style={{
                      position: "relative",
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      overflow: "hidden",
                      padding: "5px",
                    }}
                  >
                    <img
                      src={image}
                      alt={`Car view ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "6px",
                      }}
                    />

                    {index === 0 && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginTop: "5px",
                          color: "green",
                        }}
                      >
                        ★ Main Image
                      </span>
                    )}

                    {index !== 0 && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "12px",
                          marginTop: "5px",
                        }}
                      >
                        Additional View {index + 1}
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn-sm danger"
                      disabled={uploading}
                      onClick={() => removeImage(index)}
                      style={{
                        width: "100%",
                        marginTop: "6px",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "25px",
                  textAlign: "center",
                  border: "1px dashed #ccc",
                  borderRadius: "10px",
                  marginBottom: "15px",
                }}
              >
                <p className="muted">
                  No car images uploaded yet.
                </p>
              </div>
            )}

            {/* Upload button */}

            <label
              className="btn btn-ghost file-btn"
              style={{
                display: "inline-block",
                cursor:
                  images.length >= MAX_IMAGES || uploading
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  images.length >= MAX_IMAGES || uploading
                    ? 0.5
                    : 1,
              }}
            >
              📷 {uploading ? "Uploading..." : "Upload Photos"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                hidden
                disabled={
                  uploading || images.length >= MAX_IMAGES
                }
                onChange={pickPhotos}
              />
            </label>

            <p className="muted">
              Maximum 4 images. JPG, PNG, WEBP or AVIF.
              Maximum size 5MB per image.
            </p>

            {images.length > 1 && (
              <p className="muted">
                The first image is your main car photo.
                Remove it to make the next image the main photo.
              </p>
            )}
          </div>
        </div>

        {/* CAR DETAILS */}

        <label className="full">
          Car name

          <input
            name="name"
            type="text"
            placeholder="e.g. Toyota Yaris"
            required
            value={v.name}
            onChange={set("name")}
          />
        </label>

        <label>
          Seats

          <input
            type="number"
            min="1"
            max="20"
            required
            value={v.seats}
            onChange={set("seats")}
          />
        </label>

        <label>
          Luggage bags

          <input
            type="number"
            min="0"
            max="20"
            required
            value={v.bags}
            onChange={set("bags")}
          />
        </label>

        <label>
          Gearbox

          <select
            value={v.trans}
            onChange={set("trans")}
          >
            <option>Automatic</option>
            <option>Manual</option>
          </select>
        </label>

        <label>
          Fuel

          <select
            value={v.fuel}
            onChange={set("fuel")}
          >
            <option>Petrol</option>
            <option>Diesel</option>
            <option>CNG</option>
            <option>Hybrid</option>
            <option>Electric</option>
          </select>
        </label>

        <label>
          Car colour

          <input
            type="text"
            placeholder="e.g. Pearl White, Black, Silver"
            value={v.color}
            onChange={set("color")}
          />
        </label>

        <label>
          Self drive price / day (PKR)

          <input
            type="number"
            min="1"
            required
            value={v.selfPrice}
            onChange={set("selfPrice")}
          />
        </label>

        <label>
          With driver price / day (PKR)

          <input
            type="number"
            min="1"
            required
            value={v.driverPrice}
            onChange={set("driverPrice")}
          />
        </label>

        <label className="full">
          Short description

          <textarea
            rows={3}
            placeholder="One or two lines about this car"
            value={v.desc}
            onChange={set("desc")}
          />
        </label>

        {/* FORM ACTIONS */}

        <div className="full form-actions">
          <button
            className="btn btn-ghost"
            type="button"
            disabled={uploading}
            onClick={() => dialogRef.current.close()}
          >
            Cancel
          </button>

          <button
            className="btn btn-red"
            type="submit"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Save car"}
          </button>
        </div>
      </form>
    </dialog>
  );
}