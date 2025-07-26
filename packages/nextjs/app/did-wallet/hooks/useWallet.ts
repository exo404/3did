'use client';

import { useState, useEffect, useCallback } from 'react';
import { edgeAgentService } from '../services/EdgeAgentService';
import { DIDIdentity, VerifiableCredential, NotificationItem, WalletState } from '../types';
import toast from 'react-hot-toast';

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    currentDid: null,
    dids: [],
    credentials: [],
    notifications: [],
    isConnected: false,
  });

  const [loading, setLoading] = useState(false);

  // Initialize wallet
  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      // Check if edge agent is running
      const healthCheck = await edgeAgentService.healthCheck();
      if (!healthCheck.success) {
        toast.error('Edge Agent is not running');
        return;
      }

      // Load DIDs
      const didsResponse = await edgeAgentService.getDIDs();
      if (didsResponse.success && didsResponse.data) {
        const didIdentities: DIDIdentity[] = didsResponse.data.dids.map(did => ({
          did,
          createdAt: new Date(),
          status: 'active' as const,
        }));

        setState(prev => ({
          ...prev,
          dids: didIdentities,
          currentDid: didIdentities.length > 0 ? didIdentities[0].did : null,
          isConnected: true,
        }));

        // Load credentials for the first DID
        if (didIdentities.length > 0) {
          await loadCredentials(didIdentities[0].did);
          await loadNotifications(didIdentities[0].did);
        }
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      toast.error('Failed to initialize wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new DID
  const createDID = useCallback(async () => {
    setLoading(true);
    try {
      const response = await edgeAgentService.createDID();
      if (response.success && response.data) {
        const newDid: DIDIdentity = {
          did: response.data.did,
          createdAt: new Date(),
          status: 'active',
        };

        setState(prev => ({
          ...prev,
          dids: [...prev.dids, newDid],
          currentDid: prev.currentDid || newDid.did,
        }));

        toast.success('DID created successfully');
        return newDid.did;
      } else {
        toast.error(response.error || 'Failed to create DID');
      }
    } catch (error) {
      console.error('Failed to create DID:', error);
      toast.error('Failed to create DID');
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch current DID
  const switchDID = useCallback(async (did: string) => {
    setState(prev => ({ ...prev, currentDid: did }));
    await loadCredentials(did);
    await loadNotifications(did);
  }, []);

  // Load credentials for a DID
  const loadCredentials = useCallback(async (did: string) => {
    try {
      const response = await edgeAgentService.getCredentials(did);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          credentials: response.data!.credentials,
        }));
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  }, []);

  // Load notifications for a DID
  const loadNotifications = useCallback(async (did: string) => {
    try {
      const response = await edgeAgentService.getNotifications(did);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          notifications: response.data!.notifications,
        }));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  // Issue credential
  const issueCredential = useCallback(async (holderDid: string, credentialType: string, claims: Record<string, any>) => {
    if (!state.currentDid) {
      toast.error('No DID selected');
      return;
    }

    setLoading(true);
    try {
      const response = await edgeAgentService.issueCredential({
        issuerDid: state.currentDid,
        holderDid,
        credentialType,
        claims,
      });

      if (response.success) {
        toast.success('Credential issued successfully');
        return response.data?.credential;
      } else {
        toast.error(response.error || 'Failed to issue credential');
      }
    } catch (error) {
      console.error('Failed to issue credential:', error);
      toast.error('Failed to issue credential');
    } finally {
      setLoading(false);
    }
  }, [state.currentDid]);

  // Verify credential
  const verifyCredential = useCallback(async (credential: VerifiableCredential) => {
    setLoading(true);
    try {
      const response = await edgeAgentService.verifyCredential(credential);
      if (response.success && response.data) {
        const isValid = response.data.valid;
        toast.success(isValid ? 'Credential is valid' : 'Credential is invalid');
        return isValid;
      } else {
        toast.error(response.error || 'Failed to verify credential');
        return false;
      }
    } catch (error) {
      console.error('Failed to verify credential:', error);
      toast.error('Failed to verify credential');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Revoke credential
  const revokeCredential = useCallback(async (credentialId: string) => {
    setLoading(true);
    try {
      const response = await edgeAgentService.revokeCredential(credentialId);
      if (response.success) {
        toast.success('Credential revoked successfully');
        // Reload credentials
        if (state.currentDid) {
          await loadCredentials(state.currentDid);
        }
      } else {
        toast.error(response.error || 'Failed to revoke credential');
      }
    } catch (error) {
      console.error('Failed to revoke credential:', error);
      toast.error('Failed to revoke credential');
    } finally {
      setLoading(false);
    }
  }, [state.currentDid, loadCredentials]);

  // Generate QR code for credential offer
  const generateCredentialOfferQR = useCallback(async (credentialType: string) => {
    if (!state.currentDid) {
      toast.error('No DID selected');
      return;
    }

    try {
      const response = await edgeAgentService.generateCredentialOfferQR(
        state.currentDid,
        credentialType,
        `${window.location.origin}/did-wallet/callback`
      );

      if (response.success && response.data) {
        return response.data.qrCode;
      } else {
        toast.error(response.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    }
  }, [state.currentDid]);

  // Generate QR code for presentation request
  const generatePresentationRequestQR = useCallback(async (requiredCredentials: string[]) => {
    if (!state.currentDid) {
      toast.error('No DID selected');
      return;
    }

    try {
      const response = await edgeAgentService.generatePresentationRequestQR(
        state.currentDid,
        requiredCredentials,
        `${window.location.origin}/did-wallet/callback`
      );

      if (response.success && response.data) {
        return response.data.qrCode;
      } else {
        toast.error(response.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    }
  }, [state.currentDid]);

  // Process QR code
  const processQRCode = useCallback(async (qrData: string) => {
    if (!state.currentDid) {
      toast.error('No DID selected');
      return;
    }

    setLoading(true);
    try {
      const response = await edgeAgentService.processQRCode(qrData, state.currentDid);
      if (response.success && response.data) {
        toast.success(response.data.message);
        // Reload credentials and notifications
        await loadCredentials(state.currentDid);
        await loadNotifications(state.currentDid);
      } else {
        toast.error(response.error || 'Failed to process QR code');
      }
    } catch (error) {
      console.error('Failed to process QR code:', error);
      toast.error('Failed to process QR code');
    } finally {
      setLoading(false);
    }
  }, [state.currentDid, loadCredentials, loadNotifications]);

  // Process notification
  const processNotification = useCallback(async (messageId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const response = await edgeAgentService.processNotification(messageId, action);
      if (response.success) {
        toast.success(`Notification ${action}d successfully`);
        // Reload notifications
        if (state.currentDid) {
          await loadNotifications(state.currentDid);
        }
      } else {
        toast.error(response.error || 'Failed to process notification');
      }
    } catch (error) {
      console.error('Failed to process notification:', error);
      toast.error('Failed to process notification');
    } finally {
      setLoading(false);
    }
  }, [state.currentDid, loadNotifications]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (state.currentDid) {
      await loadCredentials(state.currentDid);
      await loadNotifications(state.currentDid);
    }
  }, [state.currentDid, loadCredentials, loadNotifications]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    loading,
    createDID,
    switchDID,
    issueCredential,
    verifyCredential,
    revokeCredential,
    generateCredentialOfferQR,
    generatePresentationRequestQR,
    processQRCode,
    processNotification,
    refresh,
    initialize,
  };
};