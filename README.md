# Prescripto Backend API Documentation

This backend powers the Prescripto Healthcare Management System. It is built with Node.js, Express, and MongoDB, and provides RESTful APIs for user, doctor, and admin functionalities.

---

## Table of Contents

- [Setup](#setup)
- [API Overview](#api-overview)
  - [User Endpoints](#user-endpoints)
  - [Doctor Endpoints](#doctor-endpoints)
  - [Admin Endpoints](#admin-endpoints)
- [Controllers & Methods](#controllers--methods)
  - [User Controller](#user-controller)
  - [Doctor Controller](#doctor-controller)
  - [Admin Controller](#admin-controller)

---

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Configure your `.env` file (see [`backend/.env`](backend/.env)).
3. Start the server:
   ```sh
   npm start
   ```

---

## API Overview

### User Endpoints

| Method | Path                        | Description                        | Auth Required |
|--------|-----------------------------|------------------------------------|--------------|
| POST   | `/api/user/register`        | Register a new user                | No           |
| POST   | `/api/user/login`           | Login with email/password          | No           |
| POST   | `/api/user/google-login`    | Login with Google OAuth            | No           |
| POST   | `/api/user/generate-otp`    | Generate OTP for phone login       | No           |
| POST   | `/api/user/phone-login`     | Login with phone & OTP             | No           |
| POST   | `/api/user/update-details`  | Update user details (phone login)  | No           |
| POST   | `/api/user/update-profile`  | Update user profile                | Yes          |
| POST   | `/api/user/get-profile`     | Get user profile                   | Yes          |
| POST   | `/api/user/book-appointment`| Book an appointment                | Yes          |
| POST   | `/api/user/get-appointment` | Get appointment details            | Yes          |
| POST   | `/api/user/appointments`    | List user appointments             | Yes          |
| POST   | `/api/user/cancel-appointment`| Cancel an appointment            | Yes          |
| POST   | `/api/user/upload-file`     | Upload a file to an appointment    | Yes          |
| POST   | `/api/user/get-files`       | List files for an appointment      | Yes          |
| POST   | `/api/user/delete-file`     | Delete a file from appointment     | Yes          |
| POST   | `/api/user/payment-razorpay`| Initiate Razorpay payment          | Yes          |
| POST   | `/api/user/verify-razorpay` | Verify Razorpay payment            | Yes          |
| POST   | `/api/user/token`           | Generate Stream video token        | Yes          |
| POST   | `/api/user/chat`            | Chat with AI medical assistant     | No           |

### Doctor Endpoints

| Method | Path                           | Description                        | Auth Required |
|--------|--------------------------------|------------------------------------|--------------|
| GET    | `/api/doctor/list`             | List all doctors                   | No           |
| POST   | `/api/doctor/recommend-doctors`| Recommend doctors by symptoms      | No           |
| POST   | `/api/doctor/login`            | Doctor login                       | No           |
| POST   | `/api/doctor/appointments`     | List doctor's appointments         | Yes          |
| POST   | `/api/doctor/cancel-appointment`| Cancel appointment                | Yes          |
| POST   | `/api/doctor/complete-appointment`| Mark appointment as completed    | Yes          |
| POST   | `/api/doctor/dashboard`        | Get doctor's dashboard data        | Yes          |
| POST   | `/api/doctor/profile`          | Get doctor's profile               | Yes          |
| POST   | `/api/doctor/update-profile`   | Update doctor's profile            | Yes          |
| POST   | `/api/doctor/token`            | Generate Stream video token        | Yes          |
| POST   | `/api/doctor/get-appointment`  | Get appointment details            | Yes          |
| POST   | `/api/doctor/get-files`        | List files for an appointment      | Yes          |
| POST   | `/api/doctor/create-prescription`| Create prescription PDF           | Yes          |
| POST   | `/api/doctor/add-review`       | Add review for doctor              | No           |
| POST   | `/api/doctor/add-blog`         | Add a blog post                    | Yes          |
| GET    | `/api/doctor/get-blogs`        | List all blogs                     | No           |
| POST   | `/api/doctor/get-doctor-blogs` | List blogs by doctor               | Yes          |
| POST   | `/api/doctor/get-blog`         | Get blog details                   | No           |

### Admin Endpoints

| Method | Path                              | Description                        | Auth Required |
|--------|-----------------------------------|------------------------------------|--------------|
| POST   | `/api/admin/add-doctor`           | Add a new doctor                   | Yes          |
| POST   | `/api/admin/register`             | Register a new admin               | No           |
| POST   | `/api/admin/login`                | Admin login                        | No           |
| POST   | `/api/admin/change-availability`  | Change doctor availability         | Yes          |
| POST   | `/api/admin/cancel-appointment`   | Cancel appointment                 | Yes          |
| POST   | `/api/admin/all-doctors`          | List all doctors                   | Yes          |
| POST   | `/api/admin/appointments`         | List all appointments              | Yes          |
| POST   | `/api/admin/dashboard`            | Get admin dashboard data           | Yes          |
| POST   | `/api/admin/profile`              | Get admin profile                  | Yes          |
| POST   | `/api/admin/update-profile`       | Update admin profile               | Yes          |

---

## Controllers & Methods

### User Controller

See [`backend/controllers/userController.js`](backend/controllers/userController.js)

- **registerUser**: Register a new user  
  - **POST** `/api/user/register`  
  - Body: `{ name, email, password }`

- **loginUser**: Login with email/password  
  - **POST** `/api/user/login`  
  - Body: `{ email, password }`

- **googleLogin**: Login with Google OAuth  
  - **POST** `/api/user/google-login`  
  - Body: `{ credential }`

- **sendOtp**: Generate OTP for phone login  
  - **POST** `/api/user/generate-otp`  
  - Body: `{ phone }`

- **phoneLogin**: Login with phone & OTP  
  - **POST** `/api/user/phone-login`  
  - Body: `{ phone, otp }`

- **updateDetails**: Update user details (phone login)  
  - **POST** `/api/user/update-details`  
  - Body: `{ userDetails: { phone, name, email } }`

- **updateProfile**: Update user profile  
  - **POST** `/api/user/update-profile`  
  - Headers: `{ token }`  
  - FormData: `{ name, phone, address, dob, gender, image (file) }`

- **getProfile**: Get user profile  
  - **POST** `/api/user/get-profile`  
  - Headers: `{ token }`  
  - Body: `{}`

- **bookAppointment**: Book an appointment  
  - **POST** `/api/user/book-appointment`  
  - Headers: `{ token }`  
  - Body: `{ docId, slotDate, slotTime }`

- **getAppointmentData**: Get appointment details  
  - **POST** `/api/user/get-appointment`  
  - Headers: `{ token }`  
  - Body: `{ appointmentId }`

- **listAppointment**: List user appointments  
  - **POST** `/api/user/appointments`  
  - Headers: `{ token }`  
  - Body: `{}`

- **cancelAppoinment**: Cancel an appointment  
  - **POST** `/api/user/cancel-appointment`  
  - Headers: `{ token }`  
  - Body: `{ appointmentId }`

- **fileUpload**: Upload a file to an appointment  
  - **POST** `/api/user/upload-file`  
  - Headers: `{ token }`  
  - FormData: `{ file, appointmentId }`

- **getFiles**: List files for an appointment  
  - **POST** `/api/user/get-files`  
  - Headers: `{ token }`  
  - Body: `{ appointmentId }`

- **deleteFile**: Delete a file from appointment  
  - **POST** `/api/user/delete-file`  
  - Headers: `{ token }`  
  - Body: `{ fileName }`

- **paymentRazorpay**: Initiate Razorpay payment  
  - **POST** `/api/user/payment-razorpay`  
  - Headers: `{ token }`  
  - Body: `{ appointmentId }`

- **verifyRazorpay**: Verify Razorpay payment  
  - **POST** `/api/user/verify-razorpay`  
  - Headers: `{ token }`  
  - Body: `{ razorpay_order_id }`

- **generateToken**: Generate Stream video token  
  - **POST** `/api/user/token`  
  - Headers: `{ token }`  
  - Body: `{ userId }`

- **chatWithAI**: Chat with AI medical assistant  
  - **POST** `/api/user/chat`  
  - Body: `{ message, userData: { name, age, gender, history, symptoms } }`

---

### Doctor Controller

See [`backend/controllers/doctorController.js`](backend/controllers/doctorController.js)

- **doctorList**: List all doctors  
  - **GET** `/api/doctor/list`

- **getDoctors**: Recommend doctors by symptoms  
  - **POST** `/api/doctor/recommend-doctors`  
  - Body: `{ symptoms }`

- **doctorLogin**: Doctor login  
  - **POST** `/api/doctor/login`  
  - Body: `{ email, password }`

- **appointmentsDoctor**: List doctor's appointments  
  - **POST** `/api/doctor/appointments`  
  - Headers: `{ dToken }`  
  - Body: `{}`

- **appointmentCancel**: Cancel appointment  
  - **POST** `/api/doctor/cancel-appointment`  
  - Headers: `{ dToken }`  
  - Body: `{ appointmentId }`

- **appointmentCompleted**: Mark appointment as completed  
  - **POST** `/api/doctor/complete-appointment`  
  - Headers: `{ dToken }`  
  - Body: `{ appointmentId }`

- **doctorDashboard**: Get doctor's dashboard data  
  - **POST** `/api/doctor/dashboard`  
  - Headers: `{ dToken }`  
  - Body: `{}`

- **doctorProfile**: Get doctor's profile  
  - **POST** `/api/doctor/profile`  
  - Headers: `{ dToken }`  
  - Body: `{}`

- **updateDoctorProfile**: Update doctor's profile  
  - **POST** `/api/doctor/update-profile`  
  - Headers: `{ dToken }`  
  - Body: `{ fees, address, available }`

- **generateToken**: Generate Stream video token  
  - **POST** `/api/doctor/token`  
  - Headers: `{ dToken }`  
  - Body: `{ docId }`

- **getAppointmentData**: Get appointment details  
  - **POST** `/api/doctor/get-appointment`  
  - Headers: `{ dToken }`  
  - Body: `{ appointmentId }`

- **getFiles**: List files for an appointment  
  - **POST** `/api/doctor/get-files`  
  - Headers: `{ dToken }`  
  - Body: `{ appointmentId }`

- **createPrescription**: Create prescription PDF  
  - **POST** `/api/doctor/create-prescription`  
  - Headers: `{ dToken }`  
  - Body: `{ appointmentId, medicines }`

- **addDoctorReview**: Add review for doctor  
  - **POST** `/api/doctor/add-review`  
  - Body: `{ review: { docId, userName, date, content, stars } }`

- **addBlog**: Add a blog post  
  - **POST** `/api/doctor/add-blog`  
  - Headers: `{ dToken }`  
  - FormData: `{ docId, image, title, summary, content }`

- **getBlogs**: List all blogs  
  - **GET** `/api/doctor/get-blogs`

- **getBlogsByDoctor**: List blogs by doctor  
  - **POST** `/api/doctor/get-doctor-blogs`  
  - Headers: `{ dToken }`  
  - Body: `{ docId }`

- **getBlog**: Get blog details  
  - **POST** `/api/doctor/get-blog`  
  - Body: `{ blogId }`

---

### Admin Controller

See [`backend/controllers/adminController.js`](backend/controllers/adminController.js)

- **addDoctor**: Add a new doctor  
  - **POST** `/api/admin/add-doctor`  
  - Headers: `{ aToken }`  
  - FormData: `{ name, email, password, speciality, degree, experience, about, fees, address, image }`

- **adminRegister**: Register a new admin  
  - **POST** `/api/admin/register`  
  - Body: `{ name, email, password }`

- **adminLogin**: Admin login  
  - **POST** `/api/admin/login`  
  - Body: `{ email, password }`

- **changeAvailability**: Change doctor availability  
  - **POST** `/api/admin/change-availability`  
  - Headers: `{ aToken }`  
  - Body: `{ docId }`

- **appointmentCancel**: Cancel appointment  
  - **POST** `/api/admin/cancel-appointment`  
  - Headers: `{ aToken }`  
  - Body: `{ appointmentId }`

- **allDoctors**: List all doctors  
  - **POST** `/api/admin/all-doctors`  
  - Headers: `{ aToken }`  
  - Body: `{}`

- **appointmentsAdmin**: List all appointments  
  - **POST** `/api/admin/appointments`  
  - Headers: `{ aToken }`  
  - Body: `{}`

- **adminDashboard**: Get admin dashboard data  
  - **POST** `/api/admin/dashboard`  
  - Headers: `{ aToken }`  
  - Body: `{}`

- **getProfile**: Get admin profile  
  - **POST** `/api/admin/profile`  
  - Headers: `{ aToken }`  
  - Body: `{}`

- **updateProfile**: Update admin profile  
  - **POST** `/api/admin/update-profile`  
  - Headers: `{ aToken }`  
  - Body: `{ adminId, name, password }`

---

## Notes

- All endpoints that require authentication expect a token in the headers (`token`, `dToken`, or `aToken`).
- File uploads use `multipart/form-data`.
- For more details, see the controller files in [`backend/controllers/`](backend/controllers/).

---

## License

MIT
