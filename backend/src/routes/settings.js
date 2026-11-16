import { Router } from 'express';
import Settings from '../models/Settings.js';
import { requireAuth } from '../middleware/auth.js';
const router=Router();
router.get('/',async(req,res,next)=>{try{const settings=await Settings.findOne();res.json(settings||new Settings({}));}catch(e){next(e);}});
router.put('/',requireAuth,async(req,res,next)=>{try{const settings=await Settings.findOne()||new Settings();Object.assign(settings,req.body);await settings.save();res.json(settings);}catch(e){next(e);}});
export default router;
