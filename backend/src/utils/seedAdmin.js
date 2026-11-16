import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

// DNS configuration
dns.setServers(['8.8.8.8', '1.1.1.1']);

const seedAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGODB_URI is not set in .env');
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@alburaak.pk';
    const password = process.env.ADMIN_PASSWORD;

    if (!password || password.length < 12) {
      throw new Error(
        'Set ADMIN_PASSWORD in .env (at least 12 characters)'
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.findOneAndUpdate(
      { username },
      {
        username,
        email,
        passwordHash,
        role: 'superadmin',
        isActive: true
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`Admin account ready: ${username}`);

  } catch (error) {
    console.error('Admin seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await seedAdmin();