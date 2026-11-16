import multer from 'multer';
const allowed = ['image/jpeg','image/png','image/webp','image/avif'];
export const upload = multer({ storage: multer.memoryStorage(), limits:{fileSize:5*1024*1024}, fileFilter:(req,file,cb)=> allowed.includes(file.mimetype) ? cb(null,true) : cb(new Error('Only JPG, PNG, WEBP or AVIF images up to 5MB are allowed')) });
