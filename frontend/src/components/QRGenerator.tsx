import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AUTH_API, ApiClient } from "../config/authConfig";

interface QRCodeHistory {
  _id: string;
  text: string;
  qrImage: string;
  createdAt: string;
}

export function QRGenerator() {
  const [text, setText] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [history, setHistory] = useState<QRCodeHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchHistory() {
      if (user?.userId) {
        try {
          setIsFetching(true);
          const data = await ApiClient.get(AUTH_API.QR_CODES);
          setHistory(data);
        } catch (error) {
          toast.error("Failed to load QR code history");
          console.error(error);
        } finally {
          setIsFetching(false);
        }
      }
    }
    fetchHistory();
  }, [user]);

  const generateQR = async () => {
    try {
      if (!text) {
        return toast.error("Please enter some text or URL");
      }
      setIsLoading(true);
      const url = await QRCode.toDataURL(text);
      setQrImage(url);

      // Save to backend
      if (user?.userId) {
        await ApiClient.post(AUTH_API.QR_CODES, {
          text,
          qrImage: url,
        });

        // Refresh history
        const data = await ApiClient.get(AUTH_API.QR_CODES);
        setHistory(data);
      }

      toast.success("QR Code generated successfully!");
    } catch (err) {
      toast.error("Error generating QR code");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrImage) {
      return toast.error("Generate a QR code first");
    }
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = "qrcode.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code downloaded!");
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("Logged out successfully!");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  return (
    <div className="container main-container">
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row mb-4">
            <div className="col">
              <h2 className="card-title">QR Code Generator</h2>
            </div>
            <div className="col-auto">
              <div className="user-info">
                <span className="me-2">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-secondary btn-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text or URL"
              disabled={isLoading}
            />
          </div>

          <div className="d-grid mb-3">
            <button
              onClick={generateQR}
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Generating..." : "Generate QR Code"}
            </button>
          </div>

          {qrImage && (
            <div className="qr-container">
              <img src={qrImage} alt="Generated QR Code" className="qr-image" />
              <div className="d-grid">
                <button
                  onClick={downloadQR}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Download QR Code
                </button>
              </div>
            </div>
          )}

          {isFetching ? (
            <div className="text-center text-muted mt-4">
              Loading history...
            </div>
          ) : history.length > 0 ? (
            <div className="history-container">
              <h3 className="mb-3">History</h3>
              <div className="row row-cols-1 row-cols-md-2 g-4">
                {history.map((item) => (
                  <div key={item._id} className="col">
                    <div className="history-item">
                      <p className="mb-2">{item.text}</p>
                      <img
                        src={item.qrImage}
                        alt="Historical QR Code"
                        className="history-qr-image mb-2"
                      />
                      <p className="text-muted small mb-0">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
