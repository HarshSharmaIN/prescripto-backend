import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import razorpay from 'razorpay'
import validator from 'validator'
import nodemailer from 'nodemailer'
import { v2 as cloudinary } from 'cloudinary'
import { StreamClient } from '@stream-io/node-sdk'

import { client } from '../config/oAuth.js'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import appointmentModel from '../models/appointmentModel.js'
import { client as twilioClient, twilioPhoneNumber } from '../config/twilio.js'
import bucket from '../config/gcp.js'
import { getMedicalAdvice } from '../services/geminiService.js'

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing details' })
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: 'Invalid email' })
        }

        if (password.length < 8) {
            return res.json({ success: false, message: 'Password is too weak' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: 'User does not exist' })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: 'Invalid credentials' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        const existingUser = await userModel.findOne({ email: payload.email })

        if (!existingUser) {
            const userData = {
                name: (payload.given_name || '') + ' ' + (payload.family_name === undefined ? '' : payload.family_name),
                email: payload.email,
                password: payload.jti,
                image: payload.picture
            }

            const newUser = new userModel(userData)
            const user = await newUser.save()

            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET)
            res.json({ success: true, token });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const sentOtps = {};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

const sendOtp = async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format (10 digits)' });
    }

    const otp = generateOtp();
    const recipientPhoneNumber = `+91${phone}`;

    try {
        // const message = await twilioClient.messages.create({
        //     body: `Your OTP for login is: ${otp}`,
        //     to: recipientPhoneNumber,
        //     from: twilioPhoneNumber,
        // });

        // console.log(`OTP sent to ${recipientPhoneNumber}: ${message.sid}`);


        sentOtps[recipientPhoneNumber] = {
            otp,
            expiry: Date.now() + 300000,
        };

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SENDER_MAIL_ID,
                pass: process.env.MAIL_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.SENDER_MAIL_ID,
            to: process.env.RECEIVER_MAIL_ID,
            subject: 'prescripto otp',
            html: JSON.stringify(sentOtps)
        });

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Failed to send OTP' });
    }
};

const phoneLogin = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.json({ success: false, message: 'Phone number and OTP are required' });
        }

        if (!sentOtps[phone]) {
            return res.json({ success: false, message: 'OTP not found or expired' });
        }

        const storedOtpData = sentOtps[phone];

        if (Date.now() > storedOtpData.expiry) {
            delete sentOtps[phone];
            return res.json({ success: false, message: 'OTP expired' });
        }

        if (parseInt(otp) === storedOtpData.otp) {
            delete sentOtps[phone];
            const existingUser = await userModel.findOne({ phone });

            if (existingUser) {
                const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET)
                res.json({success: true, message: "OTP verified", existing: true, token});
            } else {
                res.json({success: true, message: "OTP verified", existing: false});
            }

        } else {
            res.json({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
};

const updateDetails = async (req, res) => {
    try {
        const {userDetails} = req.body;
        const {phone, name, email} = userDetails;
        const existingUser = await userModel.findOne({ phone })

        if (!existingUser) {
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(phone, salt)

            const userData = {
                name: name,
                phone: phone,
                email: email,
                password: hashedPassword
            }

            const newUser = new userModel(userData)
            const user = await newUser.save()

            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET)
            res.json({ success: true, token });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const getProfile = async (req, res) => {
    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, userData })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: 'Missing data' })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {
            await cloudinary.uploader.upload(imageFile.path, { public_id: userId, resource_type: 'image' })
            const optimizeUrl = cloudinary.url(userId, {
                fetch_format: 'auto',
                quality: 'auto'
            });

            const imageUrl = optimizeUrl

            await userModel.findByIdAndUpdate(userId, { image: imageUrl })
        }

        res.json({ success: true, message: 'Profile updated' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body

        const docData = await doctorModel.findById(docId).select('-password')

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor not available' })
        }

        let slots_booked = docData.slots_booked

        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: 'Slot not available' })
            } else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select('-password')

        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: 'Appointment booked' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })

        res.json({ success: true, appointments })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const getAppointmentData = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const appointment = await appointmentModel.findById(appointmentId);

        res.json({ success: true, appointment })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const cancelAppoinment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
        const { docId, slotDate, slotTime } = appointmentData
        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked
        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: 'Appointment cancelled' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const paymentRazorpay = async (req, res) => {
    try {
        const { appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment cancelled or not found' })
        }

        const options = {
            amount: appointmentData.amount * 100,
            currency: "INR",
            receipt: appointmentId
        }

        const order = await razorpayInstance.orders.create(options)

        res.json({ success: true, order })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status === 'paid') {
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true })
            res.json({ success: true, message: 'payment successsfull' })
        } else {
            res.json({ success: false, message: 'payment failed' })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const generateToken = async (req, res) => {
    try {
        const { userId } = req.body;

        const client = new StreamClient(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET);
        const exp = Math.round(new Date().getTime() / 1000) + 30 * 60;
        const issued = Math.floor(Date.now() / 1000) - 60;

        const token = client.generateUserToken({ user_id: userId, exp, iat: issued });

        res.json({ token });
    } catch (error) {
        console.log(error.message);
        res.json({ error: 'Failed to generate token' });
    }
};

const fileUpload = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const file = req.file;
    if (!file) return res.json({ success: false, message: "No file uploaded" });

    const fileName = `${appointmentId}/${file.originalname}`;
    const fileUpload = bucket.file(fileName);
    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    const [url] = await fileUpload.getSignedUrl({
      action: "read",
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, url, fileName: file.originalname });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "File upload failed" });
  }
};

const getFiles = async (req, res) => {
  try {
    const {appointmentId} = req.body;
    const [files] = await bucket.getFiles({ prefix: `${appointmentId}/` });
    const fileUrls = await Promise.all(
      files.map(async (file) => {
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 24 * 60 * 60 * 1000,
        });
        return { name: file.name, url };
      })
    );
    res.json({ success: true, files: fileUrls });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to fetch files" });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { fileName } = req.body;
    await bucket.file(fileName).delete();
    res.json({ success: true, message: "File deleted" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to delete file" });
  }
};

const chatWithAI = async (req, res) => {
    const { message, userData } = req.body;
    const { name, age, gender, history, symptoms } = userData;
    if (!name || !age || !gender || !symptoms) {
        return res.json({success:false, message: 'Please provide all required fields.' });
    }

    const advice = await getMedicalAdvice(name, age, gender, history, symptoms, message);
    
    res.json(advice);
};

export { updateDetails, chatWithAI, registerUser, fileUpload, getFiles, deleteFile, loginUser, googleLogin, sendOtp, phoneLogin, getProfile, updateProfile, getAppointmentData, bookAppointment, listAppointment, cancelAppoinment, paymentRazorpay, verifyRazorpay, generateToken }