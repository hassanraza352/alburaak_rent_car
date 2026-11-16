import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name:{type:String,required:true,trim:true}, phone:{type:String,default:''}, email:{type:String,default:''}, message:{type:String,required:true}, status:{type:String,enum:['New','Read','Replied'],default:'New'} }, {timestamps:true});
export default mongoose.model('Contact', schema);
