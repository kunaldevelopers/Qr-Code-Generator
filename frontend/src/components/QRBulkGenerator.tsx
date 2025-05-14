import { useState } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { toast } from "react-hot-toast";
import styles from "./QRBulkGenerator.module.css";
import { ApiClient, AUTH_API } from "../config/authConfig";

interface QRBulkGeneratorProps {
  onComplete: () => void;
}

export function QRBulkGenerator({ onComplete }: QRBulkGeneratorProps) {
  const [inputText, setInputText] = useState("");
  const [qrType, setQrType] = useState("url");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [generating, setGenerating] = useState(false);
  const [customization, setCustomization] = useState({
    color: "#000000",
    backgroundColor: "#ffffff",
    margin: 4,
  });

  const handleCustomizationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setCustomization({
      ...customization,
      [name]: value,
    });
  };

  const handleGenerate = async () => {
    try {
      if (!inputText.trim()) {
        toast.error("Please enter at least one item");
        return;
      }

      setGenerating(true);
      const lines = inputText.split("\n").filter((line) => line.trim());

      if (lines.length === 0) {
        toast.error("No valid entries found");
        setGenerating(false);
        return;
      }

      // Prepare data for bulk generation
      const qrCodeData = lines.map((line) => {
        const text = `${prefix}${line.trim()}${suffix}`;
        return {
          text,
          qrType,
          customization,
        };
      });

      // Call backend API to generate QR codes in bulk
      const response = await ApiClient.post(AUTH_API.BULK_QR, {
        qrCodes: qrCodeData,
      });

      // Download as ZIP if successful
      if (response && response.length > 0) {
        await downloadAsZip(response);
        toast.success(`Generated ${response.length} QR codes successfully!`);
        onComplete();
      } else {
        toast.error("Failed to generate QR codes");
      }
    } catch (error) {
      console.error("Error generating bulk QR codes:", error);
      toast.error("Error generating QR codes");
    } finally {
      setGenerating(false);
    }
  };

  const downloadAsZip = async (qrCodes: any[]) => {
    try {
      const zip = new JSZip();

      // Add each QR code to the ZIP file
      qrCodes.forEach((qr, index) => {
        // Convert base64 image data to blob
        const base64Data = qr.qrImage.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/png" });

        // Use the original text as filename (sanitized)
        let filename = qr.text.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        if (filename.length > 30) {
          filename = filename.substring(0, 30);
        }

        zip.file(`qr_${index + 1}_${filename}.png`, blob);
      });

      // Generate and download the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(
        zipBlob,
        `qr_codes_bulk_${new Date().toISOString().slice(0, 10)}.zip`
      );
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      toast.error("Failed to create download package");
    }
  };

  return (
    <div className={styles.bulkGeneratorContainer}>
      <h3 className={styles.title}>Bulk QR Code Generator</h3>
      <p className={styles.description}>
        Enter each item on a new line. QR codes will be generated for each line.
      </p>

      <div className={styles.inputGroup}>
        <label>QR Code Type:</label>
        <select
          value={qrType}
          onChange={(e) => setQrType(e.target.value)}
          className={styles.select}
        >
          <option value="url">URL</option>
          <option value="text">Plain Text</option>
          <option value="phone">Phone Number</option>
        </select>
      </div>

      <div className={styles.customizationGrid}>
        <div className={styles.inputGroup}>
          <label>QR Color:</label>
          <input
            type="color"
            name="color"
            value={customization.color}
            onChange={handleCustomizationChange}
            className={styles.colorInput}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Background Color:</label>
          <input
            type="color"
            name="backgroundColor"
            value={customization.backgroundColor}
            onChange={handleCustomizationChange}
            className={styles.colorInput}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Margin:</label>
          <input
            type="number"
            name="margin"
            min="0"
            max="10"
            value={customization.margin}
            onChange={handleCustomizationChange}
            className={styles.numberInput}
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label>Prefix (Optional):</label>
        <input
          type="text"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="Add text before each item"
          className={styles.textInput}
        />
      </div>

      <div className={styles.inputGroup}>
        <label>Suffix (Optional):</label>
        <input
          type="text"
          value={suffix}
          onChange={(e) => setSuffix(e.target.value)}
          placeholder="Add text after each item"
          className={styles.textInput}
        />
      </div>

      <div className={styles.inputGroup}>
        <label>Enter Items (One per line):</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="example.com&#10;another-site.com&#10;123456"
          rows={10}
          className={styles.textarea}
        ></textarea>
      </div>

      <div className={styles.buttonContainer}>
        <button
          onClick={handleGenerate}
          disabled={generating || !inputText.trim()}
          className={styles.generateButton}
        >
          {generating ? "Generating..." : "Generate QR Codes"}
        </button>
      </div>
    </div>
  );
}
