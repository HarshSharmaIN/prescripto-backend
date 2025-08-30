import express from "express";
import {
  updateDetails,
  bookAppointment,
  cancelAppoinment,
  chatWithAI,
  deleteFile,
  fileUpload,
  generateToken,
  getAppointmentData,
  getFiles,
  getProfile,
  googleLogin,
  listAppointment,
  loginUser,
  paymentRazorpay,
  registerUser,
  updateProfile,
  verifyRazorpay,
  checkUser,
} from "../controllers/userController.js";
import authUser from "../middlewares/authUser.js";
import { cloudinaryUpload, gcpUpload } from "../middlewares/multer.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/google-login", googleLogin);
userRouter.post("/check-user", checkUser);
userRouter.post("/update-details", updateDetails);

userRouter.post(
  "/update-profile",
  cloudinaryUpload.single("image"),
  authUser,
  updateProfile
);

userRouter.post("/upload-file", gcpUpload.single("file"), authUser, fileUpload);
userRouter.post("/get-files", authUser, getFiles);
userRouter.post("/delete-file", authUser, deleteFile);

userRouter.post("/get-profile", authUser, getProfile);
userRouter.post("/get-appointment", authUser, getAppointmentData);
userRouter.post("/book-appointment", authUser, bookAppointment);
userRouter.post("/appointments", authUser, listAppointment);
userRouter.post("/cancel-appointment", authUser, cancelAppoinment);

userRouter.post("/payment-razorpay", authUser, paymentRazorpay);
userRouter.post("/verify-razorpay", authUser, verifyRazorpay);

userRouter.post("/token", authUser, generateToken);
userRouter.post("/chat", chatWithAI);

export default userRouter;
