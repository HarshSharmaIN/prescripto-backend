import multer from "multer";

const cloudinaryStorage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});
const cloudinaryUpload = multer({ storage: cloudinaryStorage });

const memoryStorage = multer.memoryStorage();
const gcpUpload = multer({ storage: memoryStorage });

export { cloudinaryUpload, gcpUpload };