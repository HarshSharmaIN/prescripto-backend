import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default:
      "https://res.cloudinary.com/dbdkll1nw/image/upload/v1757521664/icon-7797704_640_xiq8qv.png",
  },
  address: {
    type: Object,
    default: {
      line1: "",
      line2: "",
    },
  },
  gender: {
    type: String,
    default: "Not Selected",
  },
  dob: {
    type: String,
    default: "Not Selected",
  },
  phone: {
    type: String,
    default: "Your Phone Number",
  },
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
