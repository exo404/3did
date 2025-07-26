'use client';

import React, { useState } from 'react';
import { VerifiableCredential } from '../types';
import { ShieldCheckIcon, QrCodeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface VerifierPanelProps {
  currentDid: string | null;
  onGenerateQR: (requiredCredentials: string[]) => Promise<string | undefined>;
  onVerifyCredential: (credential: VerifiableCredential) => Promise<boolean>;
  loading: boolean;
}

const VerifierPanel: React.FC<VerifierPanelProps> = ({
  currentDid,
  onGenerateQR,
  onVerifyCredential,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<'verify' | 'request'>('verify');
  const [credentialJson, setCredentialJson] = useState('');
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [selectedCredentialTypes, setSelectedCredentialTypes] = useState<string[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const credentialTypes = [
    { value: 'EducationCredential', label: 'Education Credential', icon: '🎓' },
    { value: 'EmploymentCredential', label: 'Employment Credential', icon: '💼' },
    { value: 'IdentityCredential', label: 'Identity Credential', icon: '🆔' },
    { value: 'HealthCredential', label: 'Health Credential', icon: '🏥' },
    { value: 'LicenseCredential', label: 'License Credential', icon: '📜' },
  ];

  const handleVerifyCredential = async () => {
    try {
      const credential = JSON.parse(credentialJson);
      const result = await onVerifyCredential(credential);
      setVerificationResult(result);
    } catch (error) {
      alert('Invalid JSON format');
      setVerificationResult(false);
    }
  };

  const handleGenerateVerificationQR = async () => {
    if (selectedCredentialTypes.length === 0) {
      alert('Please select at least one credential type');
      return;
    }

    const qr = await onGenerateQR(selectedCredentialTypes);
    if (qr) {
      setQrCode(qr);
    }
  };

  const handleCredentialTypeToggle = (type: string) => {
    setSelectedCredentialTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!currentDid) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">No DID Selected</h2>
          <p>Please create or select a DID to act as a verifier.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            ✅ Credential Verifier
          </h2>
          <p className="text-sm text-base-content/70">
            Acting as: <span className="font-mono">{currentDid}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <a
          className={`tab ${activeTab === 'verify' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          <ShieldCheckIcon className="h-4 w-4 mr-2" />
          Verify Credential
        </a>
        <a
          className={`tab ${activeTab === 'request' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <QrCodeIcon className="h-4 w-4 mr-2" />
          Request Presentation
        </a>
      </div>

      {activeTab === 'verify' && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Verify Credential</h3>
            <p className="text-sm text-base-content/70">
              Paste a verifiable credential JSON to verify its authenticity.
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Credential JSON</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-64"
                placeholder='Paste verifiable credential JSON here...'
                value={credentialJson}
                onChange={(e) => setCredentialJson(e.target.value)}
              />
            </div>

            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                onClick={handleVerifyCredential}
                disabled={loading || !credentialJson.trim()}
              >
                <ShieldCheckIcon className="h-5 w-5" />
                Verify Credential
              </button>
            </div>

            {verificationResult !== null && (
              <div className={`alert ${verificationResult ? 'alert-success' : 'alert-error'} mt-4`}>
                <div className="flex items-center">
                  {verificationResult ? (
                    <>
                      <ShieldCheckIcon className="h-6 w-6" />
                      <span>✅ Credential is valid and verified!</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="h-6 w-6" />
                      <span>❌ Credential verification failed!</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'request' && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Request Credential Presentation</h3>
            <p className="text-sm text-base-content/70">
              Generate a QR code to request specific credentials from holders.
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Required Credential Types</span>
              </label>
              <div className="space-y-2">
                {credentialTypes.map(type => (
                  <label key={type.value} className="cursor-pointer label">
                    <span className="label-text">
                      {type.icon} {type.label}
                    </span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={selectedCredentialTypes.includes(type.value)}
                      onChange={() => handleCredentialTypeToggle(type.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            {selectedCredentialTypes.length > 0 && (
              <div className="alert alert-info">
                <div className="flex flex-col">
                  <span className="font-semibold">Selected Credential Types:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCredentialTypes.map(type => {
                      const typeInfo = credentialTypes.find(t => t.value === type);
                      return (
                        <span key={type} className="badge badge-primary">
                          {typeInfo?.icon} {typeInfo?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                onClick={handleGenerateVerificationQR}
                disabled={loading || selectedCredentialTypes.length === 0}
              >
                <QrCodeIcon className="h-5 w-5" />
                Generate Verification QR
              </button>
            </div>

            {qrCode && (
              <div className="mt-6 text-center">
                <h4 className="font-semibold mb-4">Presentation Request QR Code</h4>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCode} alt="Presentation Request QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-base-content/70 mt-2">
                  Holders can scan this QR code to present their credentials
                </p>
                <div className="text-xs text-base-content/60 mt-2">
                  Requesting: {selectedCredentialTypes.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifierPanel;