import express from 'express'
import { addBlog, addDoctorReview, appointmentCancel, appointmentCompleted, appointmentsDoctor, createPrescription, doctorDashboard, doctorList, doctorLogin, doctorProfile, generateToken, getAppointmentData, getBlog, getBlogs, getBlogsByDoctor, getDoctors, getFiles, updateDoctorProfile } from '../controllers/doctorController.js'
import authDoctor from '../middlewares/authDoctor.js'
import { cloudinaryUpload } from '../middlewares/multer.js'

const doctorRouter = express.Router()

doctorRouter.get('/list', doctorList)
doctorRouter.post('/recommend-doctors', getDoctors)

doctorRouter.post('/login', doctorLogin)
doctorRouter.post('/appointments', authDoctor, appointmentsDoctor)
doctorRouter.post('/cancel-appointment', authDoctor, appointmentCancel)
doctorRouter.post('/complete-appointment', authDoctor, appointmentCompleted)
doctorRouter.post('/dashboard', authDoctor, doctorDashboard)
doctorRouter.post('/profile', authDoctor, doctorProfile)
doctorRouter.post('/update-profile', authDoctor, updateDoctorProfile)
doctorRouter.post('/token', authDoctor, generateToken)
doctorRouter.post('/get-appointment', authDoctor, getAppointmentData)
doctorRouter.post('/get-files', authDoctor, getFiles)
doctorRouter.post('/create-prescription', authDoctor, createPrescription)
doctorRouter.post('/add-review', addDoctorReview)

doctorRouter.post('/add-blog', cloudinaryUpload.single('image'), authDoctor, addBlog)
doctorRouter.get('/get-blogs', getBlogs)
doctorRouter.post('/get-doctor-blogs', authDoctor, getBlogsByDoctor)
doctorRouter.post('/get-blog', getBlog)

export default doctorRouter