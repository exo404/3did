'use client';

import React from 'react';
import { VerifiableCredential } from '../types';
import { DocumentTextIcon, ShieldCheckIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CredentialsListProps {
  credentials: VerifiableCredential[];
  onVerify: (credential: VerifiableCredential) => Promise<boolean>;
  onRevoke: (credentialId: string) => Promise<void>;
  loading: boolean;
}

const CredentialsList: React.FC<CredentialsListProps> = ({
  credentials,
  onVerify,
  onRevoke,
  loading
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'revoked':
        return <span className="badge badge-error">Revoked</span>;
      case 'expired':
        return <span className="badge badge-warning">Expired</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (credentials.length === 0) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body text-center">
          <DocumentTextIcon className="h-16 w-16 mx-auto text-base-content/50" />
          <h2 className="card-title justify-center">No Credentials</h2>
          <p>You don't have any verifiable credentials yet.</p>
          <p className="text-sm text-base-content/70">
            Scan a QR code from an issuer to receive your first credential.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <DocumentTextIcon className="h-6 w-6" />
          My Credentials ({credentials.length})
        </h2>
        
        <div className="space-y-4">
          {credentials.map((credential) => (
            <div key={credential.id} className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {credential.type.filter(t => t !== 'VerifiableCredential').join(', ')}
                    </h3>
                    <p className="text-sm text-base-content/70 font-mono">
                      ID: {credential.id}
                    </p>
                    <p className="text-sm text-base-content/70">
                      Issued by: {credential.issuer}
                    </p>
                    <p className="text-sm text-base-content/70">
                      Issued: {formatDate(credential.issuanceDate)}
                    </p>
                    {credential.expirationDate && (
                      <p className="text-sm text-base-content/70">
                        Expires: {formatDate(credential.expirationDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(credential.status)}
                  </div>
                </div>

                {/* Credential Subject */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Credential Details:</h4>
                  <div className="bg-base-200 p-3 rounded-lg">
                    {Object.entries(credential.credentialSubject).map(([key, value]) => (
                      key !== 'id' && (
                        <div key={key} className="flex justify-between py-1">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <span>{String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onVerify(credential)}
                    disabled={loading}
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    Verify
                  </button>
                  
                  {credential.status === 'active' && (
                    <button
                      className="btn btn-sm btn-error btn-outline"
                      onClick={() => onRevoke(credential.id)}
                      disabled={loading}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CredentialsList;