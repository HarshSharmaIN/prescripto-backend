# Prescripto Healthcare Management System (Backend)

The backend API for the Prescripto Healthcare Management System. This service powers appointment scheduling, prescription management, user authentication, doctor-patient interactions, and payment processing for the Prescripto platform.

## Features

- Secure user authentication (JWT-based)
- Role-based access for doctors and patients
- Appointment booking, management, and history
- Prescription upload, storage, and retrieval
- Real-time notifications (via sockets or polling)
- Integrated payment processing (Razorpay)
- RESTful API design
- Robust error handling and validation
- Environment-based configuration

## Tech Stack

- **Node.js** & **Express.js** – REST API server
- **MongoDB** & **Mongoose** – Database and ODM
- **JWT** – Authentication
- **Razorpay** – Payment integration
- **Multer** – File uploads (prescriptions)
- **Socket.io** – Real-time notifications (if implemented)
- **dotenv** – Environment variable management
- **CORS**, **Helmet**, **Morgan** – Security and logging

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or above recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (local or cloud instance)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/HarshSharmaIN/prescripto-backend.git
   cd prescripto-backend
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory with the following variables:

   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   CLIENT_URL=http://localhost:5173
   ```

   | Variable             | Description                        |
   |----------------------|------------------------------------|
   | PORT                 | Port for the server (default: 5000)|
   | MONGODB_URI          | MongoDB connection string          |
   | JWT_SECRET           | Secret key for JWT authentication  |
   | RAZORPAY_KEY_ID      | Razorpay public key                |
   | RAZORPAY_KEY_SECRET  | Razorpay secret key                |
   | CLIENT_URL           | Frontend URL for CORS              |

4. **Start the server:**
   ```sh
   npm run dev
   ```
   The server will run on `http://localhost:5000` by default.

## API Endpoints

- `POST /api/auth/register` – Register a new user
- `POST /api/auth/login` – User login
- `GET /api/users/me` – Get current user profile
- `POST /api/appointments` – Book an appointment
- `GET /api/appointments` – List appointments
- `POST /api/prescriptions/upload` – Upload prescription file
- `GET /api/prescriptions/:id` – Get prescription details
- `POST /api/payments/create-order` – Create Razorpay order
- ...and more

> See the [API documentation](docs/API.md) for full details.

## Project Structure

```
prescripto-backend/
├── controllers/      # Route controllers
├── middleware/       # Custom middleware (auth, error, etc.)
├── models/           # Mongoose models
├── routes/           # Express route definitions
├── uploads/          # Uploaded prescription files
├── utils/            # Utility functions
├── .env              # Environment variables (not committed)
├── app.js            # Express app setup
├── server.js         # Entry point
├── package.json      # Scripts and dependencies
└── README.md         # Project documentation
```

## Security

- All sensitive endpoints require JWT authentication.
- CORS is enabled and restricted to the frontend domain.
- Input validation and error handling are enforced.

## License

This project is licensed under the MIT License.

---

**Developed by [Harsh Sharma](https://github.com/HarshSharmaIN) and