# Al Buraak Rent a Car

React + Vite frontend with an Express + MongoDB backend.

## Frontend setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` in the frontend `.env` to the backend API URL. Local default: `http://localhost:5000/api`.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set:
- `MONGODB_URI` (local MongoDB or MongoDB Atlas connection string)
- `JWT_SECRET` (long, random secret)
- `ADMIN_PASSWORD` (strong password, at least 12 characters)
- `CLIENT_URL` (frontend origin; comma-separated origins are supported)

Create/update the first admin account:

```bash
npm run seed-admin
```

Start backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000` by default. Health check: `/api/health`.

## Run both applications

Terminal 1 (project root): `npm run dev`

Terminal 2 (project root): `npm run dev:backend`

## Database collections

- `admins`: hashed admin credentials and roles
- `cars`: car specifications, colour, prices, image URL and blocked dates
- `bookings`: customer booking requests, rental type, dates, amount, booking and payment status
- `settings`: business contact details, map location and social links
- `contacts`: contact-form inquiries

New customer booking requests are saved as `Pending`. Admin confirms them after checking availability. Confirmed bookings block the selected car dates. Booking confirmation does not process a payment; payment status is managed separately by admin.

## Image upload

The admin car form uploads images to the backend. Without Cloudinary credentials, image files are stored in `backend/uploads` and served from `/uploads`. This is suitable for local development. For production hosting with ephemeral storage, configure Cloudinary in `backend/.env` (recommended) or attach persistent storage to the backend host.

Accepted formats: JPG, PNG, WEBP, AVIF. Maximum upload size: 5 MB.

## Existing LocalStorage data migration

On the first admin dashboard load against an empty database, the app imports the existing `ab_cars` LocalStorage list (or starter demo cars if none exists) into MongoDB. Existing base64 car photos are uploaded through the backend during migration. After successful import, the old `ab_cars` key is removed. Admin login sessions now use a JWT token, not the old demo password embedded in frontend code.

## Business settings

Open Admin → Settings to update the business phone, WhatsApp, email, office address, map location, Google Maps share link, opening hours and social profile URLs. Empty social URLs are not displayed on the public footer. The map currently uses the location text configured in Settings; replace the starter Lahore location with the client's exact pin/address when supplied.

## Security / production checklist

- Use HTTPS for frontend and backend.
- Use MongoDB Atlas credentials with least privilege and network restrictions.
- Set a unique strong `JWT_SECRET` and admin password.
- Configure `CLIENT_URL` to the exact deployed frontend origin(s).
- Configure Cloudinary or persistent backend storage for images.
- Set `VITE_API_URL` to the deployed backend `/api` URL in Vercel build environment.
- Do not commit `.env` files or upload credentials to GitHub.
- Configure backups and monitor database access.

### Windows PowerShell quick commands

From the project root:

```powershell
Copy-Item .env.example .env
npm install
npm install --prefix backend
Copy-Item backend/.env.example backend/.env
notepad backend/.env
npm run seed-admin --prefix backend
```

Then run the frontend and backend in two separate PowerShell terminals:

```powershell
npm run dev
```

```powershell
npm run dev:backend
```
