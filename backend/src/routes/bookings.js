
import { Router } from 'express';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import { requireAuth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many booking requests. Please try again later.'
  }
});

// GET ALL BOOKINGS
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('car', 'name color')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (e) {
    next(e);
  }
});

// CREATE BOOKING
router.post('/', bookingLimiter, async (req, res, next) => {
  try {
    const {
      customerName,
      phone,
      carId,
      rentalType,
      pickupDate,
      returnDate,
      pickupLocation,
      notes
    } = req.body;

    if (
      !customerName?.trim() ||
      !phone?.trim() ||
      !carId ||
      !pickupDate ||
      !returnDate ||
      !['self', 'driver'].includes(rentalType)
    ) {
      return res.status(400).json({
        message: 'Please provide customer, car, rental type and dates'
      });
    }

    if (returnDate < pickupDate) {
      return res.status(400).json({
        message: 'Return date cannot be before pickup date'
      });
    }

    const car = await Car.findById(carId);

    if (!car) {
      return res.status(404).json({
        message: 'Selected car not found'
      });
    }

    const conflict = await Booking.exists({
      car: car._id,
      status: 'Confirmed',
      pickupDate: { $lte: returnDate },
      returnDate: { $gte: pickupDate }
    });

    const manualConflict = (car.booked || []).some(
      ([start, end]) => start <= returnDate && end >= pickupDate
    );

    if (conflict || manualConflict) {
      return res.status(409).json({
        message: 'This car is already confirmed for some of these dates'
      });
    }

    const dailyRate = rentalType === 'self' ? car.self : car.driver;

    const days = Math.floor(
      (
        new Date(`${returnDate}T00:00:00`) -
        new Date(`${pickupDate}T00:00:00`)
      ) / 86400000
    ) + 1;

    const booking = await Booking.create({
      customerName,
      phone,
      car: car._id,
      carName: car.name,
      carColor: car.color,
      rentalType,
      pickupDate,
      returnDate,
      pickupLocation,
      notes,
      dailyRate,
      totalAmount: dailyRate * days
    });

    res.status(201).json(booking);

  } catch (e) {
    next(e);
  }
});

// UPDATE BOOKING
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const allowed = {};

    if (['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(req.body.status)) {
      allowed.status = req.body.status;
    }

    if (['Unpaid', 'Partially paid', 'Paid', 'Refunded'].includes(req.body.paymentStatus)) {
      allowed.paymentStatus = req.body.paymentStatus;
    }

    const current = await Booking.findById(req.params.id);

    if (!current) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    if (allowed.status === 'Confirmed') {
      const clash = await Booking.exists({
        _id: { $ne: current._id },
        car: current.car,
        status: 'Confirmed',
        pickupDate: { $lte: current.returnDate },
        returnDate: { $gte: current.pickupDate }
      });

      if (clash) {
        return res.status(409).json({
          message: 'Another confirmed booking overlaps these dates'
        });
      }

      const linkedCar = await Car.findById(current.car);

      const manualClash = (linkedCar?.booked || []).some(
        x =>
          Array.isArray(x) &&
          x[2] !== current.bookingId &&
          x[0] <= current.returnDate &&
          x[1] >= current.pickupDate
      );

      if (manualClash) {
        return res.status(409).json({
          message: 'These dates are blocked for this car already'
        });
      }
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      allowed,
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    const car = await Car.findById(booking.car);

    if (car) {
      car.booked = (car.booked || []).filter(
        x => !(Array.isArray(x) && x[2] === booking.bookingId)
      );

      if (booking.status === 'Confirmed') {
        car.booked.push([
          booking.pickupDate,
          booking.returnDate,
          booking.bookingId
        ]);
      }

      await car.save();
    }

    res.json(booking);

  } catch (e) {
    next(e);
  }
});

// DELETE BOOKING
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndDelete(req.params.id);

    if (!b) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    const car = await Car.findById(b.car);

    if (car) {
      car.booked = (car.booked || []).filter(
        x => !(Array.isArray(x) && x[2] === b.bookingId)
      );

      await car.save();
    }

    res.json({
      message: 'Booking deleted'
    });

  } catch (e) {
    next(e);
  }
});

export default router;
