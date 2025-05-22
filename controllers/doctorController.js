import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import appointmentModel from "../models/appointmentModel.js";
import { StreamClient } from "@stream-io/node-sdk";
import bucket from "../config/gcp.js";
import PDFDocument from "pdfkit";
import { predictDoctorSpeciality } from "../services/geminiService.js";
import {v2 as cloudinary} from "cloudinary"
import blogModel from "../models/blogModel.js";

const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body
        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availability changed' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const doctorList = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select(['-email', '-password'])
        res.json({ success: true, doctors })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const doctorLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        const doctor = await doctorModel.findOne({ email })

        if (!doctor) {
            return res.json({ success: false, message: 'Invalid credentials' })
        }

        const isMatch = await bcrypt.compare(password, doctor.password)

        if (isMatch) {
            const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: 'Invalid credentials' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const appointmentsDoctor = async (req, res) => {
    try {
        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        res.json({ success: true, appointments })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const appointmentCompleted = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId);

        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
            return res.json({ success: true, message: 'Appoinment completed' })
        } else {
            return res.json({ success: false, message: 'Mark failed' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const appointmentCancel = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId);

        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
            return res.json({ success: true, message: 'Appoinment cancelled' })
        } else {
            return res.json({ success: false, message: 'Mark failed' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const doctorDashboard = async (req, res) => {
    try {
        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        let earning = 0

        appointments.map((item, index) => {
            if (item.isCompleted || item.payment) {
                earning += item.amount
            }
        })

        let patients = []

        appointments.map((item, index) => {
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })

        const dashData = {
            earning,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse().slice(0, 5)
        }

        res.json({ success: true, dashData })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const doctorProfile = async (req, res) => {
    try {
        const { docId } = req.body
        const profileData = await doctorModel.findById(docId).select('-password')

        res.json({ success: true, profileData })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const updateDoctorProfile = async (req, res) => {
    try {
        const { docId, fees, address, available } = req.body
        await doctorModel.findByIdAndUpdate(docId, { fees, address, available })
        res.json({ success: true, message: 'Profile updated' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const generateToken = async (req, res) => {
    try {
        const { docId } = req.body;

        const client = new StreamClient(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET);
        const exp = Math.round(new Date().getTime() / 1000) + 30 * 60;
        const issued = Math.floor(Date.now() / 1000) - 60;

        const token = client.generateUserToken({ user_id: docId, exp, iat: issued });

        res.json({ token });
    } catch (error) {
        console.log(error.message);
        res.json({ error: 'Failed to generate token' });
    }
};

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

const getFiles = async (req, res) => {
    try {
        const { appointmentId } = req.body;
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

const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split('_')
    return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
}

const createPrescription = async (req, res) => {
    try {
        const { appointmentId, medicines } = req.body;
        const appointment = await appointmentModel.findById(appointmentId);
        const birthYear = new Date(appointment.userData.dob).getFullYear();
        const age = new Date().getFullYear() - birthYear;

        const fileName = `${appointmentId}/${appointment.slotDate}-prescription.pdf`;
        const file = bucket.file(fileName);
        const stream = file.createWriteStream({ metadata: { contentType: "application/pdf" } });

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        doc.image("./logo.png", { width: 150, align: "center" });
        doc.moveDown(0.5);

        doc.font("Helvetica-Bold")
            .fontSize(20)
            .text("Prescription", { align: "center", underline: true });
        doc.moveDown(0.5);
        doc.font("Helvetica")
            .fontSize(12)
            .text(`Prescription Number: ${appointment._id}`, { align: "center" })
            .text(`Date & Time: ${slotDateFormat(appointment.slotDate)} | ${appointment.slotTime}`, { align: "center" });
        doc.moveDown(1);

        doc.moveTo(50, doc.y)
            .lineTo(550, doc.y)
            .stroke("#5f6FFF");
        doc.moveDown(1);

        doc.font("Helvetica-Bold")
            .fontSize(16)
            .text("Patient Information", { underline: true });
        doc.moveDown(0.5);
        doc.font("Helvetica")
            .fontSize(12)
            .text(`Name: ${appointment.userData.name}`)
            .text(`Age: ${age}`)
            .text(`Phone: ${appointment.userData.phone}`)
            .text(`Date of Birth: ${appointment.userData.dob}`)
            .text(`Email: ${appointment.userData.email}`)
            .text(`Gender: ${appointment.userData.gender}`)
            .text(`Address: ${appointment.userData.address.line1}, ${appointment.userData.address.line2}`);
        doc.moveDown(1);

        doc.font("Helvetica-Bold")
            .fontSize(16)
            .text("Medications", { underline: true });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const itemX = 50;
        const nameX = 80;
        const dosageX = 250;
        const durationX = 350;
        const remarkX = 450;

        doc.font("Helvetica-Bold").fontSize(12).fillColor("#000");
        doc.text("S.No", itemX, tableTop, { width: 30 });
        doc.text("Medicine Name", nameX, tableTop, { width: 150 });
        doc.text("Dosage", dosageX, tableTop, { width: 80 });
        doc.text("Duration", durationX, tableTop, { width: 80 });
        doc.text("Remark", remarkX, tableTop, { width: 100 });

        doc.moveTo(itemX, tableTop + 18)
            .lineTo(550, tableTop + 18)
            .stroke("#5f6FFF");

        let rowY = tableTop + 25;
        doc.font("Helvetica").fontSize(12);
        medicines.forEach((med, idx) => {
            doc.text(idx + 1, itemX, rowY, { width: 30 });
            doc.text(med.name, nameX, rowY, { width: 150 });
            doc.text(med.dose, dosageX, rowY, { width: 80 });
            doc.text(med.duration, durationX, rowY, { width: 80 });
            doc.text(med.remarks || "-", remarkX, rowY, { width: 100 });
            rowY += 20;
        });
        doc.moveDown(2);
        doc.x = doc.page.margins.left;

        doc.fontSize(16).text("Doctor Information", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12)
            .text(`Name: ${appointment.docData.name}`)
            .text(`Qualification: ${appointment.docData.degree}`)
            .text(`Specialization: ${appointment.docData.speciality}`);
        doc.moveDown(0.5);

        doc.font("Helvetica")
            .fontSize(10)
            .fillColor("#555")
            .text("This prescription is computer-generated and does not require a physical signature.", {
                align: "left",
                italics: true
            });
        doc.end();

        stream.on("finish", async () => {
            res.json({ success: true, message: "Prescription saved!" });
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error });
    }
}

const getDoctors = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms) {
            return res.json({ success: false, message: 'Please provide symptoms' });
        }

        const predictedSpeciality = await predictDoctorSpeciality(symptoms);

        res.json({ success: true, predictedSpeciality });
    } catch (error) {
        console.log(error);
    }
};

const addDoctorReview = async (req, res) => {
    try {
        const { review } = req.body;
        const { docId, userName, date, content, stars } = review;

        const newReview = { userName, date, content, stars }

        await doctorModel.findByIdAndUpdate(docId, {
            $push: { reviews: newReview }
        });
        res.json({ success: true, message: 'Review Added' })
    } catch (error) {
        console.log(error.message);
        res.send({ success: false, message: error.message })
    }
}

const addBlog = async (req, res) => {
    try {
        const { docId, content, title, summary } = req.body;
        const imageFile = req.file;        

        await cloudinary.uploader.upload(imageFile.path, { public_id: docId, resource_type: 'image' })
        const optimizeUrl = cloudinary.url(docId, {
            fetch_format: 'auto',
            quality: 'auto'
        });
        
        const imageUrl = optimizeUrl
        const doctor = await doctorModel.findById(docId);
        const date = new Date().toLocaleDateString();

        const newBlog = new blogModel({
            docId: docId,
            coverImg: imageUrl,
            title: title,
            summary: summary,
            content: content,
            author: doctor.name,
            date: date
        })

        await newBlog.save();
        res.json({ success: true, message: 'Blog Added' })
    } catch (error) {
        console.log(error.message);
        res.send({ success: false, message: error.message })
    }
}

const getBlogs = async (req, res) => {
    try {
        const blogs = await blogModel.find({});

        res.json({ success: true, blogs })
    } catch (error) {
        console.log(error.message);
        res.send({ success: false, message: error.message })
    }
}

const getBlog = async (req, res) => {
    try {
        const { blogId } = req.body;
        const blog = await blogModel.findById(blogId);

        res.json({ success: true, blog })
    } catch (error) {
        console.log(error.message);
        res.send({ success: false, message: error.message })
    }
}

const getBlogsByDoctor = async (req, res) => {
    try {
        const { docId } = req.body;
        const blogs = await blogModel.find({docId: docId});

        res.json({ success: true, blogs })
    } catch (error) {
        console.log(error.message);
        res.send({ success: false, message: error.message })
    }
}

export {
    changeAvailability, doctorList, addDoctorReview,
    doctorProfile, updateDoctorProfile, getDoctors,
    doctorLogin, appointmentsDoctor, appointmentCancel,
    appointmentCompleted, doctorDashboard, generateToken,
    getFiles, getAppointmentData, createPrescription,
    addBlog, getBlog, getBlogs, getBlogsByDoctor
}
