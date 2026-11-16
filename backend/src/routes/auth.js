import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
const router = Router();
router.post('/login', async (req,res,next)=>{ try {
  const {username,password}=req.body;
  const admin=await Admin.findOne({username:String(username||'').trim(),isActive:true});
  if(!admin || !(await bcrypt.compare(String(password||''),admin.passwordHash))) return res.status(401).json({message:'Invalid username or password'});
  const token=jwt.sign({id:admin._id,username:admin.username,role:admin.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'1d'});
  res.json({token,admin:{username:admin.username,role:admin.role}});
 } catch(e){next(e);} });
export default router;
