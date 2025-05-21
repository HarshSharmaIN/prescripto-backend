import validator from "validator"
import bcrypt from "bcrypt"
import {v2 as cloudinary} from "cloudinary"
import doctorModel from "../models/doctorModel.js"
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js"
import userModel from "../models/userModel.js"
import adminModel from "../models/adminModel.js"

const addDoctor = async (req,res) => {
    try {
        const {name, email, password, speciality, degree, experience, about, fees, address, adminId} = req.body;
        const imageFile = req.file;

        if (!name || !email || !password || ! speciality || ! degree || !experience || !about || ! fees || !address) {
            return res.json({success:false, message: "Missing Details"});
        }

        if (!validator.isEmail(email)) {
            return res.json({success:false, message: "Please enter a valid email"});
        }

        if (password.length < 8) {
            return res.json({success:false, message: "Please enter a strong password"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt)

        await cloudinary.uploader.upload(imageFile.path, { public_id: adminId, resource_type: 'image' })
        const optimizeUrl = cloudinary.url(adminId, {
            fetch_format: 'auto',
            quality: 'auto'
        });

        const imageUrl = optimizeUrl

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now()
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()

        res.json({success: true, message: "Doctor added"})
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        const admin = await adminModel.findOne({ email })

        if (!admin) {
            return res.json({ success: false, message: 'Admin does not exist' })
        }

        const isMatch = await bcrypt.compare(password, admin.password)

        if (isMatch) {
            const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: 'Invalid credentials' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const adminRegister = async (req, res) => {
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

        const adminData = {
            name,
            email,
            password: hashedPassword
        }

        const newAdmin = new adminModel(adminData)
        const admin = await newAdmin.save()

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const allDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select('-password')
        res.json({success:true, doctors})
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

const appointmentsAdmin = async (req,res) => {
    try {
        const appointments = await appointmentModel.find({})
        res.json({success:true, appointments})
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

const appointmentCancel = async (req,res) => {
    try {
        const {appointmentId} = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        await appointmentModel.findByIdAndUpdate(appointmentId, {cancelled: true})
        const {docId, slotDate, slotTime} = appointmentData
        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked
        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)
        await doctorModel.findByIdAndUpdate(docId, {slots_booked})

        res.json({success:true, message:'Appointment cancelled'})
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const adminDashboard = async (req,res) => {
    try {
        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse().slice(0,5)
        }

        res.json({success:true, dashData})
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const getProfile = async (req, res) => {
    try {
        const { adminId } = req.body
        const adminData = await adminModel.findById(adminId).select('-password')

        res.json({ success: true, adminData })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const updateProfile = async (req, res) => {
    try {
        const { adminId, name, password } = req.body

        if (!name || !password) {
            return res.json({ success: false, message: 'Missing data' })
        }

        if (password.length < 8) {
            return res.json({ success: false, message: 'Password is too weak' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const adminData = {
            name,
            password: hashedPassword
        }

        await adminModel.findByIdAndUpdate(adminId, adminData)

        res.json({ success: true, message: 'Profile updated' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

export {addDoctor, adminRegister, adminLogin, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard, getProfile, updateProfile}