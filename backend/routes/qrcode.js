/**
 * Routes for QR code generation and management
 */

const express = require("express");
const router = express.Router();
const QRCodeModel = require("../models/QRCode");
const QRCode = require("qrcode");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const Jimp = require("jimp"); // Changed from require("jimp").default
const mongoose = require("mongoose");
const qrTypeFormatter = require("../utils/qrTypeFormatter");
const { createTrackingUrl } = require("../utils/analytics");

// Configure file upload for logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/logos");
    fs.ensureDirSync(uploadDir); // Create directory if it doesn't exist
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "logo-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg/;
    const ext = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) {
      return cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and SVG files are allowed"));
    }
  },
});

// Get all QR codes for a user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const qrCodes = await QRCodeModel.find({ userId }).sort({ createdAt: -1 });
    res.json(qrCodes);
  } catch (error) {
    console.error("Error getting QR codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific QR code
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const qrCode = await QRCodeModel.findOne({ _id: id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json(qrCode);
  } catch (error) {
    console.error("Error getting QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new QR code
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      text, // This is the original destination URL
      qrType = "url",
      customization = {},
      security = {},
      tags = [],
    } = req.body;

    // Process security options
    const processedSecurity = {
      password: security.isPasswordProtected ? security.password : "",
      isPasswordProtected: Boolean(security.isPasswordProtected),
      expiresAt: security.expiresAt || null,
      maxScans: parseInt(security.maxScans) || 0,
    };

    // Generate tracking URL before creating QR code
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const temporaryId = new mongoose.Types.ObjectId(); // Generate a temporary ID for the QR code record
    const trackingUrl = createTrackingUrl(baseUrl, temporaryId.toString()); // Use temporaryId for tracking

    // Generate QR code image with tracking URL and logo/customizations
    const finalQrImage = await generateQRCodeWithLogo(trackingUrl, customization);

    // Create and save the QR code with all required fields
    const qrCode = new QRCodeModel({
      _id: temporaryId, // Use the same temporaryId for the database record
      userId,
      text, // Store the original URL in the 'text' field for redirection
      qrImage: finalQrImage, // Store the generated QR code (pointing to trackingUrl)
      qrType,
      security: processedSecurity,
      customization,
      tags,
    });

    await qrCode.save();
    res.status(201).json(qrCode);
  } catch (error) {
    console.error("Error creating QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upload logo for QR code
router.post(
  "/upload-logo",
  authMiddleware,
  upload.single("logo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No logo file uploaded" });
      }

      // Return the path to the uploaded logo
      const logoPath = `/uploads/logos/${req.file.filename}`;
      res.json({ logoPath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Format content based on QR type
router.post("/format-content", authMiddleware, async (req, res) => {
  try {
    const { qrType, data } = req.body;

    let formattedContent = "";

    switch (qrType) {
      case "vcard":
        formattedContent = qrTypeFormatter.formatVCard(data);
        break;
      case "wifi":
        formattedContent = qrTypeFormatter.formatWifi(data);
        break;
      case "email":
        formattedContent = qrTypeFormatter.formatEmail(data);
        break;
      case "sms":
        formattedContent = qrTypeFormatter.formatSMS(data);
        break;
      case "geo":
        formattedContent = qrTypeFormatter.formatGeo(data);
        break;
      case "event":
        formattedContent = qrTypeFormatter.formatEvent(data);
        break;
      default:
        formattedContent = data.text || "";
    }

    res.json({ formattedContent });
  } catch (error) {
    console.error("Error formatting content:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a QR code
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    // Prevent updating userId
    delete updateData.userId;

    const qrCode = await QRCodeModel.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json(qrCode);
  } catch (error) {
    console.error("Error updating QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a QR code
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const qrCode = await QRCodeModel.findOneAndDelete({ _id: id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json({ message: "QR code deleted successfully" });
  } catch (error) {
    console.error("Error deleting QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to calculate optimal QR version
function calculateOptimalVersion(contentLength, hasLogo) {
  let version = 2;
  while (version <= 40) {
    const effectiveLength = hasLogo
      ? Math.ceil(contentLength * 1.3)
      : contentLength;
    if (version * version * 4 >= effectiveLength) {
      return version;
    }
    version++;
  }
  return 40;
}

// Helper function to generate QR code with logo
async function generateQRCodeWithLogo(trackingUrl, customization) {
  try {
    // Generate QR code as a Buffer
    const qrCodeBuffer = await QRCode.toBuffer(trackingUrl, {
      errorCorrectionLevel: "H",
      margin: customization?.margin || 4,
      color: {
        dark: customization?.color || "#000000",
        light: customization?.backgroundColor || "#FFFFFF",
      },
      width: 1024,
    });
    // Create Jimp image from QR code buffer
    const qrImage = await Jimp.read(qrCodeBuffer); // Changed from new Jimp()

    // Add logo if present
    if (customization?.logo) {
      const logoPath = path.join(__dirname, "..", customization.logo);
      const logo = await Jimp.read(logoPath); // Changed from new Jimp()

      // Resize logo to 30% of QR code size
      const logoSize = qrImage.getWidth() * 0.3;
      logo.resize(logoSize, logoSize);

      // Calculate position to center the logo
      const xPos = (qrImage.getWidth() - logo.getWidth()) / 2;
      const yPos = (qrImage.getHeight() - logo.getHeight()) / 2;

      // Composite logo onto QR code
      qrImage.composite(logo, xPos, yPos, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: 1,
        opacityDest: 1,
      });
    }

    // Convert to base64
    const mimeType = Jimp.MIME_PNG;
    const base64 = await qrImage.getBase64Async(mimeType);
    return base64;
  } catch (error) {
    console.error("Error generating QR code with logo:", error);
    throw error;
  }
}

// Bulk operations - create multiple QR codes
router.post("/bulk", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { qrCodes } = req.body;

    if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
      return res.status(400).json({ error: "No QR codes provided" });
    }
    const processedQRCodes = await Promise.all(
      qrCodes.map(async (qr) => {
        try {
          const temporaryId = new mongoose.Types.ObjectId();
          const baseUrl = `${req.protocol}://${req.get("host")}`;
          const trackingUrl = createTrackingUrl(baseUrl, temporaryId);

          // Generate QR code using the same logic as single QR code creation
          const finalQrImage = await generateQRCodeWithLogo(trackingUrl, qr.customization);

          const qrCode = new QRCodeModel({
            _id: temporaryId,
            userId,
            text: qr.text,
            qrImage: finalQrImage,
            qrType: qr.qrType || "url",
            security: {
              password: qr.security?.isPasswordProtected ? qr.security.password : "",
              isPasswordProtected: Boolean(qr.security?.isPasswordProtected),
              expiresAt: qr.security?.expiresAt || null,
              maxScans: parseInt(qr.security?.maxScans) || 0,
            },
            customization: qr.customization,
            tags: qr.tags || [],
          });

          await qrCode.save();
          return qrCode;
        } catch (error) {
          console.error("Error processing QR code in bulk:", error);
          return null;
        }
      })
    );

    // Filter out any null results from failed QR code creations
    const successfulQRCodes = processedQRCodes.filter((qr) => qr !== null);

    res.status(201).json(successfulQRCodes);
  } catch (error) {
    console.error("Error in bulk QR code creation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
