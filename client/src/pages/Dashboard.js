import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  TrendingUp,
  Clock,
  User,
  Activity
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/attendance/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" className="h-64" />;
  }

  const StatCard = ({ title, value, icon: Icon, color = 'primary' }) => (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-md bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.full_name}. Here's what's happening with your attendance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Attendance"
          value={stats?.totalAttendance || 0}
          icon={Calendar}
          color="primary"
        />
        <StatCard
          title="Enrolled Courses"
          value={stats?.attendanceByCourse?.length || 0}
          icon={BookOpen}
          color="green"
        />
        <StatCard
          title="Recent Activity"
          value={stats?.recentAttendance?.length || 0}
          icon={Activity}
          color="yellow"
        />
        <StatCard
          title="This Week"
          value={stats?.recentAttendance?.filter(a => {
            const date = new Date(a.check_in_time);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date > weekAgo;
          }).length || 0}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="card-body">
          {stats?.recentAttendance?.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {stats.recentAttendance.slice(0, 5).map((activity, activityIdx) => (
                  <li key={activityIdx}>
                    <div className="relative pb-8">
                      {activityIdx !== stats.recentAttendance.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center ring-8 ring-white">
                            <Calendar className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              Checked in to <span className="font-medium text-gray-900">{activity.course_name}</span>
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time dateTime={activity.check_in_time}>
                              {new Date(activity.check_in_time).toLocaleDateString()}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by scanning a QR code to mark your attendance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Course Overview */}
      {stats?.attendanceByCourse?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Course Overview</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {stats.attendanceByCourse.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{course.course_name}</h4>
                    <p className="text-sm text-gray-500">
                      {course.attendance_count} attendances
                      {course.max_attendance > 0 && ` / ${course.max_attendance} max`}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{
                          width: course.max_attendance > 0 
                            ? `${Math.min((course.attendance_count / course.max_attendance) * 100, 100)}%`
                            : '0%'
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {course.max_attendance > 0 
                        ? `${Math.round((course.attendance_count / course.max_attendance) * 100)}%`
                        : 'N/A'
                      }
                    </span>
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

export default Dashboard;