import { Router } from 'express';
import mongoose from 'mongoose';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import cloudinary, { cloudinaryEnabled } from '../config/cloudinary.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GET all cars
router.get('/', async (req, res, next) => {
  try {
    const cars = await Car.find().sort({ createdAt: 1 });
    res.json(cars);
  } catch (e) {
    next(e);
  }
});

// GET single car by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }

    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json(car);
  } catch (e) {
    next(e);
  }
});

// Upload car image
router.post('/upload', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose an image first' });
    }

    if (cloudinaryEnabled) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'alburaak/cars',
            resource_type: 'image'
          },
          (err, data) => err ? reject(err) : resolve(data)
        );

        stream.end(req.file.buffer);
      });

      return res.json({ url: result.secure_url });
    }

    const dir = path.resolve(__dirname, '../../uploads');

    await fs.mkdir(dir, { recursive: true });

    const ext = ({
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/avif': '.avif'
    })[req.file.mimetype] || '.jpg';

    const filename = `car-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    await fs.writeFile(path.join(dir, filename), req.file.buffer);

    return res.json({ url: `/uploads/${filename}` });

  } catch (e) {
    next(e);
  }
});

// Import cars
router.post('/import', requireAuth, async (req, res, next) => {
  try {
    if (await Car.countDocuments()) {
      return res.status(409).json({
        message: 'Cars already exist; import is only available for an empty database'
      });
    }

    const rows = Array.isArray(req.body.cars) ? req.body.cars : [];

    if (!rows.length) {
      return res.status(400).json({ message: 'No cars supplied' });
    }

    const clean = rows.map(({ id, _id, createdAt, updatedAt, ...c }) => ({
      ...c,
      img: typeof c.img === 'string' && c.img.startsWith('data:')
        ? '/images/car.jpg'
        : c.img
    }));

    const inserted = await Car.insertMany(clean);

    res.status(201).json(inserted);
  } catch (e) {
    next(e);
  }
});

// Create car
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const car = await Car.create(req.body);
    res.status(201).json(car);
  } catch (e) {
    next(e);
  }
});

// Update car
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json(car);
  } catch (e) {
    next(e);
  }
});

// Delete car
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    await Booking.deleteMany({ car: car._id });

    res.json({ message: 'Car and its booking records deleted' });
  } catch (e) {
    next(e);
  }
});

export default router;