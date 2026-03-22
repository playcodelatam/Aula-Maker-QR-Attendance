import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';

interface StudentQRProps {
  studentId: string;
  studentName: string;
}

export const StudentQR: React.FC<StudentQRProps> = ({ studentId, studentName }) => {
  const downloadQR = () => {
    const svg = document.getElementById(`qr-${studentId}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${studentName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="p-4 bg-slate-50 rounded-xl">
        <QRCodeSVG
          id={`qr-${studentId}`}
          value={studentId}
          size={200}
          level="H"
          includeMargin={true}
        />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-900">{studentName}</p>
        <p className="text-xs text-slate-500 font-mono">{studentId}</p>
      </div>
      <button
        onClick={downloadQR}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
      >
        <Download size={16} />
        Descargar QR
      </button>
    </div>
  );
};
