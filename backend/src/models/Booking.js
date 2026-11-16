import mongoose from 'mongoose';
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, index: true },
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  email: { type: String, trim: true, default: '' },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  carName: { type: String, required: true },
  rentalType: { type: String, enum: ['self','driver'], required: true },
  pickupDate: { type: String, required: true },
  returnDate: { type: String, required: true },
  pickupLocation: { type: String, default: '', maxlength: 250 },
  notes: { type: String, default: '', maxlength: 1000 },
  dailyRate: { type: Number, min: 0, default: 0 },
  totalAmount: { type: Number, min: 0, default: 0 },
  carColor: {
  type: String,
  default: ''
},
  status: { type: String, enum: ['Pending','Confirmed','Completed','Cancelled'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Unpaid','Partially paid','Paid','Refunded'], default: 'Unpaid' }
}, { timestamps: true });
bookingSchema.pre('validate', function(next) { if (!this.bookingId) this.bookingId = `AB-${Date.now().toString().slice(-8)}`; next(); });
export default mongoose.model('Booking', bookingSchema);
