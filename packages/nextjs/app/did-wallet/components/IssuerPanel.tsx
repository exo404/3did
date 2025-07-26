'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PlusIcon, QrCodeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface IssuerPanelProps {
  currentDid: string | null;
  onIssueCredential: (holderDid: string, credentialType: string, claims: Record<string, any>) => Promise<any>;
  onGenerateQR: (credentialType: string) => Promise<string | undefined>;
  loading: boolean;
}

const IssuerPanel: React.FC<IssuerPanelProps> = ({
  currentDid,
  onIssueCredential,
  onGenerateQR,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<'issue' | 'qr'>('issue');
  const [holderDid, setHolderDid] = useState('');
  const [credentialType, setCredentialType] = useState('EducationCredential');
  const [claims, setClaims] = useState<Record<string, any>>({
    name: '',
    degree: '',
    university: '',
    graduationDate: ''
  });
  const [qrCode, setQrCode] = useState<string | null>(null);

  const credentialTypes = [
    { value: 'EducationCredential', label: 'Education Credential', icon: '🎓' },
    { value: 'EmploymentCredential', label: 'Employment Credential', icon: '💼' },
    { value: 'IdentityCredential', label: 'Identity Credential', icon: '🆔' },
    { value: 'HealthCredential', label: 'Health Credential', icon: '🏥' },
    { value: 'LicenseCredential', label: 'License Credential', icon: '📜' },
  ];

  const getFieldsForCredentialType = (type: string) => {
    switch (type) {
      case 'EducationCredential':
        return {
          name: 'Full Name',
          degree: 'Degree',
          university: 'University',
          graduationDate: 'Graduation Date'
        };
      case 'EmploymentCredential':
        return {
          name: 'Employee Name',
          position: 'Position',
          company: 'Company',
          startDate: 'Start Date',
          salary: 'Salary'
        };
      case 'IdentityCredential':
        return {
          name: 'Full Name',
          dateOfBirth: 'Date of Birth',
          nationality: 'Nationality',
          documentNumber: 'Document Number'
        };
      case 'HealthCredential':
        return {
          name: 'Patient Name',
          diagnosis: 'Diagnosis',
          doctor: 'Doctor',
          hospital: 'Hospital',
          date: 'Date'
        };
      case 'LicenseCredential':
        return {
          name: 'License Holder',
          licenseType: 'License Type',
          licenseNumber: 'License Number',
          issuingAuthority: 'Issuing Authority',
          expiryDate: 'Expiry Date'
        };
      default:
        return { name: 'Name', value: 'Value' };
    }
  };

  const handleCredentialTypeChange = (newType: string) => {
    setCredentialType(newType);
    const fields = getFieldsForCredentialType(newType);
    const newClaims: Record<string, any> = {};
    Object.keys(fields).forEach(key => {
      newClaims[key] = '';
    });
    setClaims(newClaims);
  };

  const handleIssueCredential = async () => {
    if (!holderDid.trim()) {
      alert('Please enter holder DID');
      return;
    }

    // Filter out empty claims
    const filteredClaims = Object.entries(claims).reduce((acc, [key, value]) => {
      if (value && value.toString().trim()) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(filteredClaims).length === 0) {
      alert('Please fill in at least one claim');
      return;
    }

    await onIssueCredential(holderDid, credentialType, filteredClaims);
    
    // Reset form
    setHolderDid('');
    setClaims(Object.keys(claims).reduce((acc, key) => ({ ...acc, [key]: '' }), {}));
  };

  const handleGenerateQR = async () => {
    const qr = await onGenerateQR(credentialType);
    if (qr) {
      setQrCode(qr);
    }
  };

  if (!currentDid) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">No DID Selected</h2>
          <p>Please create or select a DID to act as an issuer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            🏛️ Credential Issuer
          </h2>
          <p className="text-sm text-base-content/70">
            Acting as: <span className="font-mono">{currentDid}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <a
          className={`tab ${activeTab === 'issue' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('issue')}
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Issue Credential
        </a>
        <a
          className={`tab ${activeTab === 'qr' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          <QrCodeIcon className="h-4 w-4 mr-2" />
          Generate QR Offer
        </a>
      </div>

      {activeTab === 'issue' && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Issue New Credential</h3>
            
            {/* Holder DID */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Holder DID</span>
              </label>
              <input
                type="text"
                placeholder="did:ethr:sepolia:0x..."
                className="input input-bordered"
                value={holderDid}
                onChange={(e) => setHolderDid(e.target.value)}
              />
            </div>

            {/* Credential Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Credential Type</span>
              </label>
              <select
                className="select select-bordered"
                value={credentialType}
                onChange={(e) => handleCredentialTypeChange(e.target.value)}
              >
                {credentialTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Claims Fields */}
            <div className="space-y-4">
              <h4 className="font-semibold">Credential Claims:</h4>
              {Object.entries(getFieldsForCredentialType(credentialType)).map(([key, label]) => (
                <div key={key} className="form-control">
                  <label className="label">
                    <span className="label-text">{label}</span>
                  </label>
                  <input
                    type={key.includes('Date') ? 'date' : 'text'}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className="input input-bordered"
                    value={claims[key] || ''}
                    onChange={(e) => setClaims(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                onClick={handleIssueCredential}
                disabled={loading || !holderDid.trim()}
              >
                <PlusIcon className="h-5 w-5" />
                Issue Credential
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Generate QR Code Offer</h3>
            <p className="text-sm text-base-content/70">
              Generate a QR code that holders can scan to request this credential type.
            </p>

            {/* Credential Type for QR */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Credential Type</span>
              </label>
              <select
                className="select select-bordered"
                value={credentialType}
                onChange={(e) => setCredentialType(e.target.value)}
              >
                {credentialTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                onClick={handleGenerateQR}
                disabled={loading}
              >
                <QrCodeIcon className="h-5 w-5" />
                Generate QR Code
              </button>
            </div>

            {qrCode && (
              <div className="mt-6 text-center">
                <h4 className="font-semibold mb-4">Credential Offer QR Code</h4>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCode} alt="Credential Offer QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-base-content/70 mt-2">
                  Holders can scan this QR code to request a {credentialType}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IssuerPanel;