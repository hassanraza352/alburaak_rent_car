import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  seats: {
    type: Number,
    min: 1,
    max: 20,
    default: 5
  },

  bags: {
    type: Number,
    min: 0,
    max: 20,
    default: 2
  },

  trans: {
    type: String,
    enum: ['Automatic', 'Manual'],
    default: 'Automatic'
  },

  fuel: {
    type: String,
    enum: ['Petrol', 'Diesel', 'CNG', 'Hybrid', 'Electric'],
    default: 'Petrol'
  },

  self: {
    type: Number,
    required: true,
    min: 1
  },

  driver: {
    type: Number,
    required: true,
    min: 1
  },

  desc: {
    type: String,
    default: '',
    maxlength: 1500
  },

  // Main image (backward compatibility)
  img: {
    type: String,
    default: '/images/car.jpg'
  },

  // Multiple car images (maximum 4)
  images: {
    type: [{ type: String, trim: true }],
    default: [],
    validate: {
      validator: function (value) {
        return value.length <= 4;
      },
      message: 'A car can have a maximum of 4 images.'
    }
  },

  color: {
    type: String,
    trim: true,
    default: ''
  },

  booked: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },

  isAvailable: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

export default mongoose.model('Car', carSchema);