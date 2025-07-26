'use client';

import React from 'react';
import { NotificationItem } from '../types';
import { BellIcon, CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface NotificationsListProps {
  notifications: NotificationItem[];
  onProcess: (messageId: string, action: 'approve' | 'reject') => Promise<void>;
  loading: boolean;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  onProcess,
  loading
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'credential_request':
        return '📜';
      case 'presentation_request':
        return '🔍';
      case 'verification_result':
        return '✅';
      default:
        return '📢';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'processed':
        return <span className="badge badge-success">Processed</span>;
      case 'rejected':
        return <span className="badge badge-error">Rejected</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const pendingNotifications = notifications.filter(n => n.status === 'pending');
  const processedNotifications = notifications.filter(n => n.status !== 'pending');

  if (notifications.length === 0) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body text-center">
          <BellIcon className="h-16 w-16 mx-auto text-base-content/50" />
          <h2 className="card-title justify-center">No Notifications</h2>
          <p>You don't have any notifications at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Notifications */}
      {pendingNotifications.length > 0 && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <BellIcon className="h-6 w-6" />
              Pending Notifications ({pendingNotifications.length})
            </h2>
            
            <div className="space-y-4">
              {pendingNotifications.map((notification) => (
                <div key={notification.id} className="card bg-base-100 shadow border-l-4 border-warning">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                          <h3 className="font-semibold text-lg">{notification.title}</h3>
                          {getStatusBadge(notification.status)}
                        </div>
                        <p className="text-base-content/80">{notification.description}</p>
                        <div className="mt-2 text-sm text-base-content/70">
                          <p>From: {notification.from}</p>
                          <p>Time: {formatDate(notification.timestamp)}</p>
                        </div>
                        
                        {/* Notification Data */}
                        {notification.data && (
                          <div className="mt-3">
                            <h4 className="font-semibold mb-2">Details:</h4>
                            <div className="bg-base-200 p-3 rounded-lg">
                              <pre className="text-sm overflow-x-auto">
                                {JSON.stringify(notification.data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions for pending notifications */}
                    <div className="card-actions justify-end mt-4">
                      <button
                        className="btn btn-sm btn-error btn-outline"
                        onClick={() => onProcess(notification.id, 'reject')}
                        disabled={loading}
                      >
                        <XMarkIcon className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => onProcess(notification.id, 'approve')}
                        disabled={loading}
                      >
                        <CheckIcon className="h-4 w-4" />
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {processedNotifications.length > 0 && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <ClockIcon className="h-6 w-6" />
              Recent Activity ({processedNotifications.length})
            </h2>
            
            <div className="space-y-3">
              {processedNotifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body py-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-base-content/70">
                            {formatDate(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(notification.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsList;