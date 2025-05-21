import express from 'express'

import {cloudinaryUpload} from '../middlewares/multer.js'
import authAdmin from '../middlewares/authAdmin.js'

import { changeAvailability } from '../controllers/doctorController.js'
import { addDoctor, adminDashboard, adminLogin, adminRegister, allDoctors, appointmentCancel, appointmentsAdmin, getProfile, updateProfile } from '../controllers/adminController.js'

const adminRouter = express.Router()

adminRouter.post('/add-doctor', cloudinaryUpload.single('image'), authAdmin, addDoctor)
adminRouter.post('/register', adminRegister)
adminRouter.post('/login', adminLogin)
adminRouter.post('/change-availability', authAdmin, changeAvailability)
adminRouter.post('/cancel-appointment', authAdmin, appointmentCancel)

adminRouter.post('/all-doctors', authAdmin, allDoctors)
adminRouter.post('/appointments', authAdmin, appointmentsAdmin)
adminRouter.post('/dashboard', authAdmin, adminDashboard)
adminRouter.post('/profile', authAdmin, getProfile)
adminRouter.post('/update-profile', authAdmin, updateProfile)

export default adminRouter