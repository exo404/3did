import QRCode from 'qrcode';
import { QRCodeData } from '../types';

export class QRCodeGenerator {
  // Generate QR code for credential offer
  static async generateCredentialOfferQR(
    issuerDid: string,
    credentialType: string,
    callbackUrl: string
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'credential_offer',
      data: {
        issuer: issuerDid,
        credentialType,
        timestamp: new Date().toISOString(),
      },
      callback_url: callbackUrl,
    };

    return await QRCode.toDataURL(JSON.stringify(qrData));
  }

  // Generate QR code for presentation request
  static async generatePresentationRequestQR(
    verifierDid: string,
    requiredCredentials: string[],
    callbackUrl: string,
    challenge?: string
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'presentation_request',
      data: {
        verifier: verifierDid,
        requiredCredentials,
        challenge,
        timestamp: new Date().toISOString(),
      },
      callback_url: callbackUrl,
    };

    return await QRCode.toDataURL(JSON.stringify(qrData));
  }

  // Generate QR code for verification request
  static async generateVerificationRequestQR(
    verifierDid: string,
    serviceEndpoint: string,
    requiredProofs: string[]
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'verification_request',
      data: {
        verifier: verifierDid,
        requiredProofs,
        timestamp: new Date().toISOString(),
      },
      callback_url: serviceEndpoint,
    };

    return await QRCode.toDataURL(JSON.stringify(qrData));
  }

  // Parse QR code data
  static parseQRCodeData(qrString: string): QRCodeData | null {
    try {
      const data = JSON.parse(qrString);
      if (data.type && data.data && data.callback_url) {
        return data as QRCodeData;
      }
      return null;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
  }

  // Generate QR code as SVG
  static async generateQRCodeSVG(data: string): Promise<string> {
    return await QRCode.toString(data, { type: 'svg' });
  }

  // Generate QR code as terminal string (for CLI testing)
  static async generateQRCodeTerminal(data: string): Promise<string> {
    return await QRCode.toString(data, { type: 'terminal' });
  }
}