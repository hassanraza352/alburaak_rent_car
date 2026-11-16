import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  businessName: {type:String,default:'Al Buraak Rent a Car'}, phone:{type:String,default:'+92 313 044 6260'}, whatsapp:{type:String,default:'+92 313 044 6260'}, email:{type:String,default:'alburakautos@gmail.com'}, address:{type:String,default:'Lahore, Pakistan'}, city:{type:String,default:'Lahore'}, mapLocation:{type:String,default:'Lahore, Pakistan'}, googleMapsUrl:{type:String,default:'https://maps.google.com/?q=Lahore'}, latitude:{type:Number,default:null}, longitude:{type:Number,default:null}, openingHours:{type:String,default:'Mon to Sat, 9 AM to 7 PM'}, instagram:{type:String,default:''}, facebook:{type:String,default:''}, tiktok:{type:String,default:''}, youtube:{type:String,default:''}, linkedin:{type:String,default:''}
}, {timestamps:true});
export default mongoose.model('Settings', schema);
