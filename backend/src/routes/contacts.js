import { Router } from 'express';
import Contact from '../models/Contact.js';
import { requireAuth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
const router=Router();
const contactLimiter=rateLimit({windowMs:15*60*1000,max:8,standardHeaders:true,legacyHeaders:false});
router.post('/',contactLimiter,async(req,res,next)=>{try{const {name,phone,email,message}=req.body;if(!name?.trim()||!message?.trim())return res.status(400).json({message:'Name and message are required'});const item=await Contact.create({name,phone,email,message});res.status(201).json({message:'Message received',id:item._id});}catch(e){next(e);}});
router.get('/',requireAuth,async(req,res,next)=>{try{res.json(await Contact.find().sort({createdAt:-1}));}catch(e){next(e);}});
export default router;
