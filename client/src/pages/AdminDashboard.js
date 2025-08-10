import React from 'react';
import { BarChart3 } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          System-wide statistics and administration
        </p>
      </div>
      
      <div className="card">
        <div className="card-body text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Admin Panel</h3>
          <p className="mt-1 text-sm text-gray-500">
            Super admin functionality coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;