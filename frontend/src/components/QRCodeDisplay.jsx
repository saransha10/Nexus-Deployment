import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

function QRCodeDisplay({ value, size = 200, showText = true }) {
  const [showCode, setShowCode] = useState(false);

  const downloadQR = () => {
    const svg = document.getElementById(`qr-${value}`);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size * 2;
      canvas.height = size * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, size / 2, size / 2, size, size);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `ticket-${value}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="qr-code-display">
      <div className="qr-code-wrapper">
        <QRCodeSVG 
          id={`qr-${value}`}
          value={value}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>
      
      {showText && (
        <div className="qr-actions">
          <button 
            onClick={() => setShowCode(!showCode)} 
            className="btn-toggle"
            type="button"
          >
            {showCode ? '🔒 Hide' : '👁️ Show'} Code
          </button>
          <button 
            onClick={downloadQR} 
            className="btn-download"
            type="button"
          >
            📥 Download
          </button>
        </div>
      )}
      
      {showCode && (
        <p className="qr-text">{value}</p>
      )}

      <style>{`
        .qr-code-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          margin: 1rem 0;
        }

        .qr-code-wrapper {
          padding: 1rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .qr-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .qr-text {
          font-family: monospace;
          font-size: 0.85rem;
          color: #666;
          margin: 0.5rem 0 0 0;
          padding: 0.5rem 1rem;
          background: #f5f5f5;
          border-radius: 6px;
          word-break: break-all;
        }

        .btn-toggle, .btn-download {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn-toggle {
          background: #f5f5f5;
          color: #333;
        }

        .btn-toggle:hover {
          background: #e0e0e0;
        }

        .btn-download {
          background: #1976d2;
          color: white;
        }

        .btn-download:hover {
          background: #1565c0;
        }
      `}</style>
    </div>
  );
}

export default QRCodeDisplay;
