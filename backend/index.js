require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const QRCode = require("./models/QRCode");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/auth");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Auth Routes
app.use("/api/auth", authRoutes);

// Protected Routes
app.post("/api/qrcodes", authMiddleware, async (req, res) => {
  try {
    const { text, qrImage } = req.body;
    const userId = req.user.userId; // Get userId from auth middleware

    const qrCode = new QRCode({
      userId,
      text,
      qrImage,
    });
    await qrCode.save();
    res.status(201).json(qrCode);
  } catch (error) {
    res.status(500).json({ error: "Error creating QR code" });
  }
});

app.get("/api/qrcodes", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from auth middleware
    const qrCodes = await QRCode.find({ userId }).sort({
      createdAt: -1,
    });
    res.json(qrCodes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching QR codes" });
  }
});

app.delete("/api/qrcodes/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Only allow deletion if the QR code belongs to the authenticated user
    const qrCode = await QRCode.findOne({ _id: req.params.id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    await QRCode.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error deleting QR code" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
