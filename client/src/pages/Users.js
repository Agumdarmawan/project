import React from 'react';
import { Users as UsersIcon } from 'lucide-react';

const Users = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage user accounts and permissions
        </p>
      </div>
      
      <div className="card">
        <div className="card-body text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Users Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            User management functionality coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Users;