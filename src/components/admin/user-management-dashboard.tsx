'use client'

/**
 * Enhanced User Management Dashboard
 * Complete user management with SSO, MFA, session monitoring, and security features
 */

import { useState, useEffect } from 'react'
import {
  Users, Shield, Key, Monitor, UserPlus, Settings,
  AlertTriangle, Activity, Lock, Unlock, Mail, Phone,
  QrCode, RefreshCw, Download, Upload, Eye, EyeOff,
  MapPin, Smartphone, Globe, Clock, Ban, CheckCircle
} from 'lucide-react'

// User Management Dashboard Component
export function UserManagementDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showSecurityModal, setShowSecurityModal] = useState(false)

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'sessions', label: 'Active Sessions', icon: Monitor },
    { id: 'invitations', label: 'Invitations', icon: UserPlus },
    { id: 'security', label: 'Security Events', icon: Shield },
    { id: 'sso', label: 'SSO Settings', icon: Key },
    { id: 'policies', label: 'Policies', icon: Settings }
  ]

  useEffect(() => {
    loadDashboardData()
  }, [activeTab])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load data based on active tab
      switch (activeTab) {
        case 'users':
          await loadUsers()
          break
        case 'sessions':
          await loadSessions()
          break
        case 'invitations':
          await loadInvitations()
          break
        case 'security':
          await loadSecurityEvents()
          break
        case 'sso':
          await loadSSOProviders()
          break
        case 'policies':
          await loadPolicies()
          break
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    // Mock data - replace with actual API calls
    setUsers([
      {
        id: '1',
        email: 'john@example.com',
        fullName: 'John Doe',
        role: 'admin',
        isActive: true,
        lastSeen: new Date(),
        mfaEnabled: true,
        ssoEnabled: false,
        passwordLastChanged: new Date(),
        failedLoginAttempts: 0,
        isLocked: false
      }
    ])
  }

  const loadSessions = async () => {
    setSessions([
      {
        id: '1',
        userId: '1',
        userEmail: 'john@example.com',
        deviceInfo: { deviceName: 'MacBook Pro', browser: 'Chrome', os: 'macOS' },
        location: { city: 'New York', country: 'US' },
        ipAddress: '192.168.1.1',
        isCurrentSession: false,
        lastActivity: new Date(),
        riskScore: 15,
        flags: []
      }
    ])
  }

  const loadInvitations = async () => {
    setInvitations([
      {
        id: '1',
        email: 'jane@example.com',
        role: 'agent',
        status: 'pending',
        invitedBy: 'john@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      }
    ])
  }

  const loadSecurityEvents = async () => {
    // Load security events
  }

  const loadSSOProviders = async () => {
    // Load SSO providers
  }

  const loadPolicies = async () => {
    // Load policies
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage users, sessions, security policies, and authentication settings
          </p>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-100'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'users' && (
            <UsersManagement
              users={users}
              loading={loading}
              onUserSelect={setSelectedUser}
              onRefresh={loadUsers}
            />
          )}
          {activeTab === 'sessions' && (
            <SessionsManagement
              sessions={sessions}
              loading={loading}
              onRefresh={loadSessions}
            />
          )}
          {activeTab === 'invitations' && (
            <InvitationsManagement
              invitations={invitations}
              loading={loading}
              onRefresh={loadInvitations}
            />
          )}
          {activeTab === 'security' && (
            <SecurityEventsManagement loading={loading} />
          )}
          {activeTab === 'sso' && (
            <SSOManagement loading={loading} />
          )}
          {activeTab === 'policies' && (
            <PoliciesManagement loading={loading} />
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={loadUsers}
        />
      )}
    </div>
  )
}

// Dashboard Statistics Component
function DashboardStats() {
  const stats = [
    { name: 'Total Users', value: '156', change: '+12%', icon: Users, color: 'blue' },
    { name: 'Active Sessions', value: '89', change: '+5%', icon: Monitor, color: 'green' },
    { name: 'MFA Enabled', value: '67%', change: '+8%', icon: Shield, color: 'purple' },
    { name: 'Security Alerts', value: '3', change: '-2', icon: AlertTriangle, color: 'red' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Users Management Component
function UsersManagement({ users, loading, onUserSelect, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive) ||
                         (filterStatus === 'locked' && user.isLocked)

    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="p-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Upload className="w-4 h-4 mr-2" />
            Import Users
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export Users
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="locked">Locked</option>
        </select>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Security
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.fullName?.charAt(0) || user.email.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {user.isLocked && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {user.mfaEnabled ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <Shield className="w-3 h-3 mr-1" />
                          MFA
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          No MFA
                        </span>
                      )}
                      {user.ssoEnabled && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          <Key className="w-3 h-3 mr-1" />
                          SSO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onUserSelect(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {user.isLocked ? (
                      <button className="text-green-600 hover:text-green-900">
                        <Unlock className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="text-red-600 hover:text-red-900">
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Sessions Management Component
function SessionsManagement({ sessions, loading, onRefresh }) {
  const [showDetails, setShowDetails] = useState({})

  const toggleDetails = (sessionId) => {
    setShowDetails(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }))
  }

  const terminateSession = async (sessionId) => {
    if (confirm('Are you sure you want to terminate this session?')) {
      // API call to terminate session
      onRefresh()
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Active Sessions</h2>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No active sessions</div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{session.userEmail}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Smartphone className="w-4 h-4" />
                        <span>{session.deviceInfo.deviceName}</span>
                        <span>•</span>
                        <span>{session.deviceInfo.browser}</span>
                        <span>•</span>
                        <MapPin className="w-4 h-4" />
                        <span>{session.location.city}, {session.location.country}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      session.riskScore > 70 ? 'text-red-600' :
                      session.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      Risk Score: {session.riskScore}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last activity: {new Date(session.lastActivity).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleDetails(session.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {showDetails[session.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => terminateSession(session.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {session.flags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.flags.map((flag, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        flag.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        flag.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        flag.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {flag.description}
                    </span>
                  ))}
                </div>
              )}

              {showDetails[session.id] && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Device Details</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">OS:</dt>
                        <dd>{session.deviceInfo.os}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">IP Address:</dt>
                        <dd>{session.ipAddress}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Session Info</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Created:</dt>
                        <dd>{new Date(session.createdAt).toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Current:</dt>
                        <dd>{session.isCurrentSession ? 'Yes' : 'No'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Invitations Management Component
function InvitationsManagement({ invitations, loading, onRefresh }) {
  const [showInviteModal, setShowInviteModal] = useState(false)

  const resendInvitation = async (invitationId) => {
    // API call to resend invitation
    onRefresh()
  }

  const cancelInvitation = async (invitationId) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      // API call to cancel invitation
      onRefresh()
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">User Invitations</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Invitation
          </button>
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invited By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  Loading invitations...
                </td>
              </tr>
            ) : invitations.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No invitations found
                </td>
              </tr>
            ) : (
              invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invitation.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invitation.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                      invitation.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {invitation.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {invitation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invitation.invitedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {invitation.status === 'pending' && (
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => resendInvitation(invitation.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => cancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Security Events Component
function SecurityEventsManagement({ loading }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Events</h2>
      <div className="text-center py-8 text-gray-500">
        Security events monitoring will be displayed here
      </div>
    </div>
  )
}

// SSO Management Component
function SSOManagement({ loading }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">SSO Configuration</h2>
      <div className="text-center py-8 text-gray-500">
        SSO provider configuration will be displayed here
      </div>
    </div>
  )
}

// Policies Management Component
function PoliciesManagement({ loading }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Policies</h2>
      <div className="text-center py-8 text-gray-500">
        Password policies, MFA settings, and session policies will be displayed here
      </div>
    </div>
  )
}

// User Details Modal Component
function UserDetailsModal({ user, onClose, onUpdate }) {
  const [activeSection, setActiveSection] = useState('profile')

  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'activity', label: 'Activity' }
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            User Details: {user.fullName || user.email}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        <div className="flex border-b mb-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 font-medium text-sm ${
                activeSection === section.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="min-h-96">
          {activeSection === 'profile' && <UserProfile user={user} />}
          {activeSection === 'security' && <UserSecurity user={user} />}
          {activeSection === 'sessions' && <UserSessions user={user} />}
          {activeSection === 'activity' && <UserActivity user={user} />}
        </div>
      </div>
    </div>
  )
}

// User Profile Section
function UserProfile({ user }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <p className="mt-1 text-sm text-gray-900">{user.fullName || 'Not provided'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <p className="mt-1">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// User Security Section
function UserSecurity({ user }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">MFA Status</label>
          <p className="mt-1">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              user.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user.mfaEnabled ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enabled
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Disabled
                </>
              )}
            </span>
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Failed Login Attempts</label>
          <p className="mt-1 text-sm text-gray-900">{user.failedLoginAttempts || 0}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password Last Changed</label>
          <p className="mt-1 text-sm text-gray-900">
            {user.passwordLastChanged ? new Date(user.passwordLastChanged).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Account Status</label>
          <p className="mt-1">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              user.isLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {user.isLocked ? (
                <>
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 mr-1" />
                  Unlocked
                </>
              )}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// User Sessions Section
function UserSessions({ user }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Recent user sessions will be displayed here</p>
    </div>
  )
}

// User Activity Section
function UserActivity({ user }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">User activity timeline will be displayed here</p>
    </div>
  )
}