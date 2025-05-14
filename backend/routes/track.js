const express = require("express");
const router = express.Router();
const path = require("path");
const QRCode = require("../models/QRCode");
const geoip = require("geoip-lite");
const { recordScan, isQrCodeExpired } = require("../utils/analytics");

// Handle QR code scans
router.get("/:qrCodeId/:trackingId", async (req, res) => {
  console.log("Track route hit with params:", req.params);

  try {
    const { qrCodeId, trackingId } = req.params;
    console.log(
      "Processing scan for QR Code ID:",
      qrCodeId,
      "Tracking ID:",
      trackingId
    );

    const qrCode = await QRCode.findById(qrCodeId);
    console.log("Found QR Code:", qrCode ? "Yes" : "No");

    if (!qrCode) {
      console.log("QR Code not found");
      return res.status(404).send(`
        <html>
          <body style="text-align:center;font-family:Arial;padding:20px;">
            <h2>⚠️ QR Code Not Found</h2>
            <p>This QR code does not exist or has been deleted.</p>
          </body>
        </html>
      `);
    }

    // Check expiration first
    if (isQrCodeExpired(qrCode)) {
      console.log("QR Code expired");
      return res.send(`
        <html>
          <body style="text-align:center;font-family:Arial;padding:20px;">
            <h2>⚠️ QR Code Expired</h2>
            <p>This QR code has expired or reached its maximum scan limit.</p>
          </body>
        </html>
      `);
    }

    // For password protected QR codes, show password form
    if (qrCode.security && qrCode.security.isPasswordProtected) {
      console.log("QR Code is password protected");
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
                  console.error('Password verification error:', error);
                  document.getElementById('error').style.display = 'block';
                }
              }
            </script>
          </body>
        </html>
      `);
    }

    // Get IP and location info
    let ip = req.ip || req.connection.remoteAddress;
    // Remove IPv6 prefix if present
    ip = ip.replace(/^::ffff:/, "");

    console.log("Client IP:", ip);

    // Get location data from IP
    const geo = geoip.lookup(ip);
    console.log("Geolocation data:", geo);

    const locationData = {
      country: geo ? geo.country : "Unknown",
      city: geo ? geo.city : "Unknown",
    };

    console.log("Location data:", locationData);

    // If not password protected, record scan and redirect
    console.log("Recording scan for non-password protected QR code");

    try {
      const scanData = {
        userAgent: req.headers["user-agent"],
        ip: ip,
        referer: req.headers.referer,
        trackingId,
        country: locationData.country,
        city: locationData.city,
      };

      console.log("Scan data:", scanData);

      const updatedQrCode = await recordScan(qrCodeId, scanData);

      if (!updatedQrCode) {
        console.log("Failed to record scan - recordScan returned null");
        // Continue with redirect even if scan recording fails
      } else {
        console.log(
          "Scan recorded successfully. New scan count:",
          updatedQrCode.analytics.scanCount
        );
      }
    } catch (scanError) {
      console.error("Error recording scan:", scanError);
      // Continue with redirect even if scan recording fails
    }

    // Redirect to destination URL
    console.log("Redirecting to:", qrCode.text);
    res.redirect(qrCode.text);
  } catch (error) {
    console.error("Error handling QR scan:", error);
    res.status(500).send(`
      <html>
        <body style="text-align:center;font-family:Arial;padding:20px;">
          <h2>⚠️ Error</h2>
          <p>An error occurred while processing this QR code. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

module.exports = router;
