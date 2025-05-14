const express = require("express");
const router = express.Router();
const path = require("path");
const QRCode = require("../models/QRCode");
const { recordScan, isQrCodeExpired } = require("../utils/analytics");

// Handle QR code scans
router.get("/:qrCodeId/:trackingId", async (req, res) => {
  try {
    const { qrCodeId, trackingId } = req.params;
    const qrCode = await QRCode.findById(qrCodeId);

    if (!qrCode) {
      return res.status(404).send("QR code not found");
    }

    // Check for expiration first
    if (isQrCodeExpired(qrCode)) {
      return res.send(`
                <html>
                    <body style="text-align:center;font-family:Arial;padding:20px;">
                        <h2>⚠️ QR Code Expired</h2>
                        <p>This QR code has expired or reached its maximum scan limit.</p>
                    </body>
                </html>
            `);
    }

    // For password protected QR codes, show password form with destination encoded in hidden field
    if (qrCode.security && qrCode.security.isPasswordProtected) {
      return res.send(`
                <html>
                    <head>
                        <title>Password Protected QR Code</title>
                        <style>
                            body { font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; text-align: center; }
                            form { margin-top: 20px; }
                            input[type="password"] { padding: 8px; margin: 10px; width: 200px; }
                            button { padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
                            .error { color: #dc3545; margin-top: 10px; display: none; }
                        </style>
                    </head>
                    <body>
                        <h2>🔒 Password Protected Content</h2>
                        <p>This QR code is password protected. Please enter the password to continue.</p>
                        <form id="passwordForm" onsubmit="verifyPassword(event)">
                            <input type="password" id="password" placeholder="Enter password" required>
                            <input type="hidden" id="qrCodeId" value="${qrCodeId}">
                            <input type="hidden" id="trackingId" value="${trackingId}">
                            <br>
                            <button type="submit">Submit</button>
                        </form>
                        <p id="error" class="error">Invalid password. Please try again.</p>
                        <script>
                            async function verifyPassword(e) {
                                e.preventDefault();
                                const password = document.getElementById('password').value;
                                const qrCodeId = document.getElementById('qrCodeId').value;
                                try {
                                    const response = await fetch('/api/analytics/verify-password/' + qrCodeId, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ password })
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                        window.location.href = data.redirectUrl || data.qrCode.text;
                                    } else if (data.expired) {
                                        document.body.innerHTML = '<h2>⚠️ QR Code Expired</h2><p>' + data.message + '</p>';
                                    } else {
                                        document.getElementById('error').style.display = 'block';
                                    }
                                } catch (error) {
                                    document.getElementById('error').style.display = 'block';
                                }
                            }
                        </script>
                    </body>
                </html>
            `);
    }

    // If not password protected, record scan and redirect
    await recordScan(qrCodeId, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      referer: req.headers.referer,
      trackingId,
    });

    // Redirect to the QR code's URL
    res.redirect(qrCode.text);
  } catch (error) {
    console.error("Error handling QR scan:", error);
    res.status(500).send("An error occurred");
  }
});

module.exports = router;
