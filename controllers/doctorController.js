import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import { StreamClient } from "@stream-io/node-sdk";
import bucket from "../config/gcp.js";
import PDFDocument from "pdfkit";
import { predictDoctorSpeciality } from "../services/geminiService.js";
import { v2 as cloudinary } from "cloudinary";
import blogModel from "../models/blogModel.js";
import { get } from "https";

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      const data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => resolve(Buffer.concat(data)));
    }).on("error", reject);
  });
}

const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availability changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-email", "-password"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await doctorModel.findOne({ email });

    if (!doctor) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);

    if (isMatch) {
      const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentCompleted = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
      });
      return res.json({ success: true, message: "Appoinment completed" });
    } else {
      return res.json({ success: false, message: "Mark failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        cancelled: true,
      });
      return res.json({ success: true, message: "Appoinment cancelled" });
    } else {
      return res.json({ success: false, message: "Mark failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    let earning = 0;

    appointments.map((item, index) => {
      if (item.isCompleted || item.payment) {
        earning += item.amount;
      }
    });

    let patients = [];

    appointments.map((item, index) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earning,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");

    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available } = req.body;
    await doctorModel.findByIdAndUpdate(docId, { fees, address, available });
    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const generateToken = async (req, res) => {
  try {
    const { docId } = req.body;

    const client = new StreamClient(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );
    const exp = Math.round(new Date().getTime() / 1000) + 30 * 60;
    const issued = Math.floor(Date.now() / 1000) - 60;

    const token = client.generateUserToken({
      user_id: docId,
      exp,
      iat: issued,
    });

    res.json({ token });
  } catch (error) {
    console.log(error.message);
    res.json({ error: "Failed to generate token" });
  }
};

const getAppointmentData = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointment = await appointmentModel.findById(appointmentId);

    res.json({ success: true, appointment });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

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

const months = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const slotDateFormat = (slotDate) => {
  const dateArray = slotDate.split("_");
  return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2];
};

// Helper function to calculate text height for dynamic row sizing
const calculateTextHeight = (doc, text, width, fontSize = 12) => {
  const tempY = doc.y;
  doc.fontSize(fontSize);
  const height = doc.heightOfString(text, { width });
  doc.y = tempY;
  return height;
};

// Helper function to draw table borders
const drawTableBorders = (doc, startX, startY, endX, endY, columnWidths) => {
  // Horizontal lines
  doc.moveTo(startX, startY).lineTo(endX, startY).stroke("#E5E7EB");
  doc.moveTo(startX, endY).lineTo(endX, endY).stroke("#E5E7EB");

  // Vertical lines
  let currentX = startX;
  doc.moveTo(currentX, startY).lineTo(currentX, endY).stroke("#E5E7EB");

  columnWidths.forEach((width) => {
    currentX += width;
    doc.moveTo(currentX, startY).lineTo(currentX, endY).stroke("#E5E7EB");
  });
};

// Helper function to format date
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

// Helper function to safely get nested object properties
const safeGet = (obj, path, defaultValue = "") => {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, obj);
};

const createPrescription = async (req, res) => {
  try {
    const { appointmentId, medicines } = req.body;

    // Validation
    if (!appointmentId || !medicines || !Array.isArray(medicines)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request data. appointmentId and medicines array are required.",
      });
    }

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    // Calculate age more accurately
    const birthDate = new Date(appointment.userData.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    const fileName = `${appointmentId}/${appointment.slotDate}-prescription.pdf`;
    const file = bucket.file(fileName);
    const stream = file.createWriteStream({
      metadata: {
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Create PDF with better margins and layout
    const doc = new PDFDocument({
      margin: 60,
      size: "A4",
      info: {
        Title: `Prescription - ${appointment._id}`,
        Author: safeGet(appointment, "docData.name", "Doctor"),
        Subject: "Medical Prescription",
        Keywords: "prescription, medical, healthcare",
      },
    });

    doc.pipe(stream);

    // Header Section with improved styling
    try {
      const logoBuffer = await fetchImageBuffer(
        "https://prescripto-backend-sigma.vercel.app/logo.png"
      );
      doc.image(logoBuffer, {
        width: 120,
        align: "center",
        x: (doc.page.width - 120) / 2,
      });
    } catch (logoError) {
      console.warn("Logo could not be loaded:", logoError.message);
      // Continue without logo
    }

    doc.moveDown(0.8);

    // Title with better styling
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#1E40AF")
      .text("MEDICAL PRESCRIPTION", { align: "center" });

    doc.moveDown(0.3);

    // Subtitle
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#6B7280")
      .text("Professional Healthcare Services", { align: "center" });

    doc.moveDown(0.8);

    // Prescription info with better layout
    const prescriptionInfoY = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor("#374151");

    doc.text(`Prescription ID: ${appointment._id}`, 60, prescriptionInfoY);
    doc.text(
      `Generated: ${formatDate(new Date())} | ${new Date().toLocaleTimeString(
        "en-GB",
        { hour12: true }
      )}`,
      doc.page.width - 200,
      prescriptionInfoY,
      { width: 140, align: "right" }
    );
    doc.text(
      `Appointment: ${slotDateFormat(appointment.slotDate)} | ${
        appointment.slotTime
      }`,
      60,
      prescriptionInfoY + 12
    );

    doc.moveDown(1.5);

    // Decorative line
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .lineWidth(2)
      .stroke("#2563EB");
    doc.moveDown(1);

    // Patient Information Section with background
    const patientSectionY = doc.y;
    doc
      .rect(60, patientSectionY - 10, doc.page.width - 120, 140)
      .fillColor("#F0FDF4")
      .fill();

    doc
      .fillColor("#059669")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Patient Information", 80, patientSectionY);

    doc.moveDown(0.8);

    // Patient details in two columns
    const leftColX = 80;
    const rightColX = doc.page.width / 2 + 20;
    let currentY = doc.y;

    doc.font("Helvetica").fontSize(11).fillColor("#1F2937");

    // Left column
    doc.text(
      `Name: ${safeGet(appointment, "userData.name", "N/A")}`,
      leftColX,
      currentY
    );
    doc.text(`Age: ${age == NaN ? "N/A" : age} years`, leftColX, currentY + 15);
    doc.text(
      `Gender: ${safeGet(appointment, "userData.gender", "N/A")}`,
      leftColX,
      currentY + 30
    );
    doc.text(
      `Phone: ${safeGet(appointment, "userData.phone", "N/A")}`,
      leftColX,
      currentY + 45
    );

    // Right column
    doc.text(
      `Date of Birth: ${formatDate(appointment.userData.dob)}`,
      rightColX,
      currentY
    );
    doc.text(
      `Email: ${safeGet(appointment, "userData.email", "N/A")}`,
      rightColX,
      currentY + 15
    );

    // Address (full width)
    const address = `${safeGet(
      appointment,
      "userData.address.line1",
      ""
    )}, ${safeGet(appointment, "userData.address.line2", "")}`.replace(
      /^,\s*|,\s*$/g,
      ""
    );
    doc.text(`Address: ${address || "N/A"}`, leftColX, currentY + 75, {
      width: doc.page.width - 160,
      height: 30,
    });

    doc.y = patientSectionY + 150;

    // Medications Section with dynamic table
    doc
      .fillColor("#EA580C")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Prescribed Medications", 60);

    doc.moveDown(0.8);

    // Table setup with responsive widths
    const tableStartY = doc.y;
    const tableStartX = 60;
    const tableWidth = doc.page.width - 120;

    // Column widths (percentages of table width)
    const columnWidths = [
      tableWidth * 0.08, // S.No - 8%
      tableWidth * 0.35, // Medicine Name - 35%
      tableWidth * 0.2, // Dosage - 20%
      tableWidth * 0.15, // Duration - 15%
      tableWidth * 0.22, // Remarks - 22%
    ];

    // Table header with background
    doc
      .rect(tableStartX, tableStartY, tableWidth, 25)
      .fillColor("#F3F4F6")
      .fill();

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151");

    const headers = [
      "S.No",
      "Medicine Name",
      "Dosage",
      "Duration",
      "Instructions",
    ];
    let currentX = tableStartX;

    headers.forEach((header, index) => {
      doc.text(header, currentX + 5, tableStartY + 8, {
        width: columnWidths[index] - 10,
        align: index === 0 ? "center" : "left",
      });
      currentX += columnWidths[index];
    });

    let currentRowY = tableStartY + 25;

    // Table rows with dynamic height
    doc.font("Helvetica").fontSize(10).fillColor("#1F2937");

    medicines.forEach((med, idx) => {
      // Calculate row height based on content
      const medicineNameHeight = calculateTextHeight(
        doc,
        med.name || "",
        columnWidths[1] - 10,
        10
      );
      const remarksHeight = calculateTextHeight(
        doc,
        med.remarks || "-",
        columnWidths[4] - 10,
        10
      );
      const rowHeight = Math.max(
        25,
        medicineNameHeight + 10,
        remarksHeight + 10
      );

      // Check if we need a new page
      if (currentRowY + rowHeight > doc.page.height - 100) {
        doc.addPage();
        currentRowY = 60;
      }

      // Alternate row background
      if (idx % 2 === 1) {
        doc
          .rect(tableStartX, currentRowY, tableWidth, rowHeight)
          .fillColor("#F9FAFB")
          .fill();
      }

      // Draw cell content
      currentX = tableStartX;
      const cellY = currentRowY + (rowHeight - 12) / 2;

      // S.No
      doc.fillColor("#1F2937").text((idx + 1).toString(), currentX + 5, cellY, {
        width: columnWidths[0] - 10,
        align: "center",
      });
      currentX += columnWidths[0];

      // Medicine Name
      doc.text(med.name || "N/A", currentX + 5, cellY, {
        width: columnWidths[1] - 10,
      });
      currentX += columnWidths[1];

      // Dosage
      doc.text(med.dose || "N/A", currentX + 5, cellY, {
        width: columnWidths[2] - 10,
      });
      currentX += columnWidths[2];

      // Duration
      doc.text(med.duration || "N/A", currentX + 5, cellY, {
        width: columnWidths[3] - 10,
      });
      currentX += columnWidths[3];

      // Remarks
      doc.text(med.remarks || "-", currentX + 5, cellY, {
        width: columnWidths[4] - 10,
      });

      // Draw row borders
      drawTableBorders(
        doc,
        tableStartX,
        currentRowY,
        tableStartX + tableWidth,
        currentRowY + rowHeight,
        columnWidths
      );

      currentRowY += rowHeight;
    });

    doc.y = currentRowY + 20;

    // Doctor Information Section
    const doctorSectionY = doc.y;
    doc
      .rect(60, doctorSectionY - 10, doc.page.width - 120, 80)
      .fillColor("#F8FAFC")
      .fill();

    doc
      .fillColor("#7C3AED")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Doctor Information", 80, doctorSectionY);

    doc.moveDown(0.8);

    doc.font("Helvetica").fontSize(11).fillColor("#1F2937");

    currentY = doc.y;
    doc.text(
      `Name: ${safeGet(appointment, "docData.name", "N/A")}`,
      80,
      currentY
    );
    doc.text(
      `Qualification: ${safeGet(appointment, "docData.degree", "N/A")}`,
      80,
      currentY + 15
    );
    doc.text(
      `Specialization: ${safeGet(appointment, "docData.speciality", "N/A")}`,
      80,
      currentY + 30
    );

    doc.y = doctorSectionY + 90;

    // Signature section
    doc.moveDown(1);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#1F2937")
      .text(
        `${safeGet(appointment, "docData.name", "Doctor")}`,
        doc.page.width - 200,
        doc.y,
        {
          width: 140,
          align: "right",
        }
      );

    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor("#6B7280")
      .text("Digital Signature", doc.page.width - 200, doc.y, {
        width: 140,
        align: "right",
      });

    // Footer
    doc.moveDown(2);
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .lineWidth(1)
      .stroke("#E5E7EB");

    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6B7280")
      .text(
        "This prescription is computer-generated and does not require a physical signature.",
        60,
        doc.y,
        {
          align: "center",
          width: doc.page.width - 120,
        }
      );

    doc.moveDown(0.3);
    doc.text(
      "Please follow the prescribed dosage and consult your doctor if you experience any adverse effects.",
      60,
      doc.y,
      {
        align: "center",
        width: doc.page.width - 120,
      }
    );

    doc.end();

    stream.on("finish", async () => {
      console.log(
        `Prescription PDF generated successfully for appointment: ${appointmentId}`
      );
      res.json({
        success: true,
        message: "Prescription saved successfully!",
        fileName: fileName,
        appointmentId: appointmentId,
      });
    });

    stream.on("error", (error) => {
      console.error("Error writing PDF to stream:", error);
      res.status(500).json({
        success: false,
        message: "Error generating PDF file.",
      });
    });
  } catch (error) {
    console.log("Error creating prescription:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating prescription.",
    });
  }
};

const getDoctors = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.json({ success: false, message: "Please provide symptoms" });
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

    const newReview = { userName, date, content, stars };

    await doctorModel.findByIdAndUpdate(docId, {
      $push: { reviews: newReview },
    });
    res.json({ success: true, message: "Review Added" });
  } catch (error) {
    console.log(error.message);
    res.send({ success: false, message: error.message });
  }
};

const addBlog = async (req, res) => {
  try {
    const { docId, content, title, summary } = req.body;
    const imageFile = req.file;

    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: "image",
    });
    const imageUrl = imageUpload.secure_url;

    const doctor = await doctorModel.findById(docId);
    const date = new Date().toLocaleDateString();

    const newBlog = new blogModel({
      docId: docId,
      coverImg: imageUrl,
      title: title,
      summary: summary,
      content: content,
      author: doctor.name,
      date: date,
    });

    await newBlog.save();
    res.json({ success: true, message: "Blog Added" });
  } catch (error) {
    console.log(error.message);
    res.send({ success: false, message: error.message });
  }
};

const getBlogs = async (req, res) => {
  try {
    const blogs = await blogModel.find({});

    res.json({ success: true, blogs });
  } catch (error) {
    console.log(error.message);
    res.send({ success: false, message: error.message });
  }
};

const getBlog = async (req, res) => {
  try {
    const { blogId } = req.body;
    const blog = await blogModel.findById(blogId);

    res.json({ success: true, blog });
  } catch (error) {
    console.log(error.message);
    res.send({ success: false, message: error.message });
  }
};

const getBlogsByDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const blogs = await blogModel.find({ docId: docId });

    res.json({ success: true, blogs });
  } catch (error) {
    console.log(error.message);
    res.send({ success: false, message: error.message });
  }
};

export {
  changeAvailability,
  doctorList,
  addDoctorReview,
  doctorProfile,
  updateDoctorProfile,
  getDoctors,
  doctorLogin,
  appointmentsDoctor,
  appointmentCancel,
  appointmentCompleted,
  doctorDashboard,
  generateToken,
  getFiles,
  getAppointmentData,
  createPrescription,
  addBlog,
  getBlog,
  getBlogs,
  getBlogsByDoctor,
};
