'use client';

import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { UserRole, RoleAction } from '../types';
import { 
  IdentificationIcon, 
  QrCodeIcon, 
  BellIcon, 
  DocumentTextIcon,
  ShieldCheckIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import CredentialsList from './CredentialsList';
import NotificationsList from './NotificationsList';
import QRScanner from './QRScanner';
import IssuerPanel from './IssuerPanel';
import VerifierPanel from './VerifierPanel';

const WalletDashboard: React.FC = () => {
  const wallet = useWallet();
  const [currentRole, setCurrentRole] = useState<UserRole>('holder');
  const [showQRScanner, setShowQRScanner] = useState(false);

  const roleActions: RoleAction[] = [
    {
      role: 'holder',
      label: 'Holder',
      description: 'Manage your credentials',
      icon: '👤',
      action: () => setCurrentRole('holder'),
    },
    {
      role: 'issuer',
      label: 'Issuer',
      description: 'Issue credentials',
      icon: '🏛️',
      action: () => setCurrentRole('issuer'),
    },
    {
      role: 'verifier',
      label: 'Verifier',
      description: 'Verify credentials',
      icon: '✅',
      action: () => setCurrentRole('verifier'),
    },
  ];

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting to Edge Agent...</h2>
          <p className="text-base-content/70">
            Make sure the Edge Agent is running on port 3001
          </p>
          <button 
            className="btn btn-primary mt-4"
            onClick={wallet.initialize}
            disabled={wallet.loading}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200 shadow-lg">
        <div className="flex-1">
          <h1 className="text-xl font-bold">DID Wallet</h1>
        </div>
        <div className="flex-none gap-2">
          {/* DID Selector */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost">
              <IdentificationIcon className="h-5 w-5" />
              {wallet.currentDid ? 
                `DID: ${wallet.currentDid.slice(-8)}...` : 
                'No DID'
              }
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-80">
              {wallet.dids.map((did) => (
                <li key={did.did}>
                  <a 
                    onClick={() => wallet.switchDID(did.did)}
                    className={wallet.currentDid === did.did ? 'active' : ''}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{did.did}</span>
                      <span className="text-xs opacity-70">
                        Created: {did.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </a>
                </li>
              ))}
              <li>
                <a onClick={wallet.createDID} disabled={wallet.loading}>
                  <PlusIcon className="h-4 w-4" />
                  Create New DID
                </a>
              </li>
            </ul>
          </div>

          {/* Notifications */}
          <div className="indicator">
            <span className="indicator-item badge badge-secondary">
              {wallet.notifications.filter(n => n.status === 'pending').length}
            </span>
            <button className="btn btn-ghost">
              <BellIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Refresh */}
          <button 
            className="btn btn-ghost"
            onClick={wallet.refresh}
            disabled={wallet.loading}
          >
            <ArrowPathIcon className={`h-5 w-5 ${wallet.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Selector */}
      <div className="tabs tabs-boxed justify-center p-4">
        {roleActions.map((action) => (
          <a
            key={action.role}
            className={`tab tab-lg ${currentRole === action.role ? 'tab-active' : ''}`}
            onClick={action.action}
          >
            <span className="mr-2">{action.icon}</span>
            {action.label}
          </a>
        ))}
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        {currentRole === 'holder' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    <QrCodeIcon className="h-6 w-6" />
                    Scan QR Code
                  </h2>
                  <p>Scan a QR code to receive credentials or respond to verification requests</p>
                  <div className="card-actions justify-end">
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowQRScanner(true)}
                    >
                      Scan
                    </button>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    <DocumentTextIcon className="h-6 w-6" />
                    My Credentials
                  </h2>
                  <p>View and manage your verifiable credentials</p>
                  <div className="card-actions justify-end">
                    <span className="badge badge-primary">{wallet.credentials.length}</span>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    <BellIcon className="h-6 w-6" />
                    Notifications
                  </h2>
                  <p>Handle credential requests and verification requests</p>
                  <div className="card-actions justify-end">
                    <span className="badge badge-secondary">
                      {wallet.notifications.filter(n => n.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials List */}
            <CredentialsList 
              credentials={wallet.credentials}
              onVerify={wallet.verifyCredential}
              onRevoke={wallet.revokeCredential}
              loading={wallet.loading}
            />

            {/* Notifications List */}
            <NotificationsList 
              notifications={wallet.notifications}
              onProcess={wallet.processNotification}
              loading={wallet.loading}
            />
          </div>
        )}

        {currentRole === 'issuer' && (
          <IssuerPanel 
            currentDid={wallet.currentDid}
            onIssueCredential={wallet.issueCredential}
            onGenerateQR={wallet.generateCredentialOfferQR}
            loading={wallet.loading}
          />
        )}

        {currentRole === 'verifier' && (
          <VerifierPanel 
            currentDid={wallet.currentDid}
            onGenerateQR={wallet.generatePresentationRequestQR}
            onVerifyCredential={wallet.verifyCredential}
            loading={wallet.loading}
          />
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner 
          onScan={async (data) => {
            await wallet.processQRCode(data);
            setShowQRScanner(false);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};

export default WalletDashboard;