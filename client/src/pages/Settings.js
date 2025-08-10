import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure system settings and preferences
        </p>
      </div>
      
      <div className="card">
        <div className="card-body text-center py-12">
          <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">System Settings</h3>
          <p className="mt-1 text-sm text-gray-500">
            Settings configuration coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;