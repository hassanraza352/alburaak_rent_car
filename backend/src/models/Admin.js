import mongoose from 'mongoose';
const schema = new mongoose.Schema({ username: {type:String,unique:true,required:true}, email: {type:String,unique:true,required:true}, passwordHash: {type:String,required:true}, role: {type:String,enum:['admin','superadmin'],default:'admin'}, isActive: {type:Boolean,default:true} }, {timestamps:true});
export default mongoose.model('Admin', schema);
