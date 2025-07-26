'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { XMarkIcon, QrCodeIcon } from '@heroicons/react/24/outline';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        setIsScanning(true);
        setError(null);

        // Create scanner instance
        scannerRef.current = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          false
        );

        // Start scanning
        scannerRef.current.render(
          (decodedText) => {
            // Success callback
            onScan(decodedText);
            cleanup();
          },
          (error) => {
            // Error callback - only log if it's not a common scanning error
            if (!error.includes('NotFoundException')) {
              console.warn('QR Scanner error:', error);
            }
          }
        );
      } catch (err) {
        console.error('Failed to start QR scanner:', err);
        setError('Failed to start camera. Please ensure camera permissions are granted.');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      cleanup();
    };
  }, [onScan]);

  const cleanup = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error clearing scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <QrCodeIcon className="h-6 w-6" />
            Scan QR Code
          </h3>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <div className="text-error mb-4">
                <QrCodeIcon className="h-16 w-16 mx-auto" />
              </div>
              <p className="text-error font-semibold mb-2">Scanner Error</p>
              <p className="text-sm text-base-content/70 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary btn-sm"
              >
                Refresh Page
              </button>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="w-full"></div>
              
              {isScanning && (
                <div className="text-center mt-4">
                  <p className="text-sm text-base-content/70">
                    Position the QR code within the frame to scan
                  </p>
                  <div className="flex justify-center mt-2">
                    <div className="loading loading-dots loading-sm"></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t bg-base-200 rounded-b-lg">
          <div className="text-xs text-base-content/70">
            <p className="mb-1">📱 Point your camera at a QR code</p>
            <p className="mb-1">🔒 Camera access is required for scanning</p>
            <p>💡 Make sure the QR code is well-lit and clearly visible</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;