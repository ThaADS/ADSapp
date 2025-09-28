'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TagIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  EyeIcon,
  ShareIcon,
  Bars3Icon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

// Contact interface
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  avatar?: string;
  company?: string;
  position?: string;
  location?: string;
  website?: string;
  metadata?: Record<string, unknown>;
  tags: string[];
  status: 'active' | 'inactive' | 'blocked';
  isStarred: boolean;
  lastContact: string;
  addedDate: string;
  totalMessages: number;
  customFields: Record<string, unknown>;
  notes: string;
  source: 'manual' | 'import' | 'whatsapp' | 'api';
  assignedTo?: string;
}

// Filter options
interface FilterOptions {
  search: string;
  status: string;
  tags: string[];
  dateRange: string;
  source: string;
  assignedTo: string;
  isStarred: boolean | null;
}

// Sample contacts data
const SAMPLE_CONTACTS: Contact[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '+1234567890',
    company: 'Tech Corp',
    position: 'CEO',
    location: 'New York, NY',
    website: 'https://techcorp.com',
    tags: ['vip', 'potential-client'],
    status: 'active',
    isStarred: true,
    lastContact: '2024-01-25',
    addedDate: '2024-01-15',
    totalMessages: 24,
    customFields: { budget: '$50,000', interest: 'Enterprise' },
    notes: 'Interested in enterprise solution. Follow up next week.',
    source: 'whatsapp',
    assignedTo: 'Alice Johnson'
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.j@business.com',
    phone: '+1987654321',
    company: 'Business Solutions',
    position: 'Marketing Director',
    location: 'Los Angeles, CA',
    tags: ['marketing', 'active-lead'],
    status: 'active',
    isStarred: false,
    lastContact: '2024-01-24',
    addedDate: '2024-01-10',
    totalMessages: 12,
    customFields: { budget: '$25,000', interest: 'Marketing Tools' },
    notes: 'Needs marketing automation features.',
    source: 'manual',
    assignedTo: 'Bob Wilson'
  },
  {
    id: '3',
    firstName: 'Mike',
    lastName: 'Chen',
    phone: '+1555123456',
    company: 'Startup Inc',
    position: 'Founder',
    location: 'San Francisco, CA',
    tags: ['startup', 'tech'],
    status: 'inactive',
    isStarred: false,
    lastContact: '2024-01-20',
    addedDate: '2024-01-05',
    totalMessages: 8,
    customFields: { budget: '$10,000', interest: 'Basic Plan' },
    notes: 'Small startup, price sensitive.',
    source: 'import',
    assignedTo: 'Charlie Brown'
  }
];

// Available tags
const AVAILABLE_TAGS = [
  { id: 'vip', label: 'VIP', color: 'bg-purple-100 text-purple-800' },
  { id: 'potential-client', label: 'Potential Client', color: 'bg-blue-100 text-blue-800' },
  { id: 'active-lead', label: 'Active Lead', color: 'bg-green-100 text-green-800' },
  { id: 'marketing', label: 'Marketing', color: 'bg-orange-100 text-orange-800' },
  { id: 'startup', label: 'Startup', color: 'bg-pink-100 text-pink-800' },
  { id: 'tech', label: 'Tech', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'enterprise', label: 'Enterprise', color: 'bg-gray-100 text-gray-800' }
];

// Team members for assignment
const TEAM_MEMBERS = [
  { id: 'alice', name: 'Alice Johnson' },
  { id: 'bob', name: 'Bob Wilson' },
  { id: 'charlie', name: 'Charlie Brown' },
  { id: 'diana', name: 'Diana Prince' }
];

interface ContactManagerProps {
  organizationId: string;
}

export default function ContactManager({ organizationId }: ContactManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>(SAMPLE_CONTACTS);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    tags: [],
    dateRange: 'all',
    source: 'all',
    assignedTo: 'all',
    isStarred: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter contacts based on current filters
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = !searchTerm ||
        contact.firstName.toLowerCase().includes(searchTerm) ||
        contact.lastName.toLowerCase().includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm) ||
        contact.phone.includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm);

      // Status filter
      const matchesStatus = filters.status === 'all' || contact.status === filters.status;

      // Tags filter
      const matchesTags = filters.tags.length === 0 ||
        filters.tags.some(tag => contact.tags.includes(tag));

      // Starred filter
      const matchesStarred = filters.isStarred === null || contact.isStarred === filters.isStarred;

      // Source filter
      const matchesSource = filters.source === 'all' || contact.source === filters.source;

      // Assigned to filter
      const matchesAssignment = filters.assignedTo === 'all' || contact.assignedTo === filters.assignedTo;

      // Date range filter (simplified)
      const matchesDateRange = filters.dateRange === 'all'; // Implement date logic as needed

      return matchesSearch && matchesStatus && matchesTags && matchesStarred &&
             matchesSource && matchesAssignment && matchesDateRange;
    });
  }, [contacts, filters]);

  // Handle contact selection
  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  }, []);

  // Select all contacts
  const toggleSelectAll = useCallback(() => {
    setSelectedContacts(prev =>
      prev.length === filteredContacts.length
        ? []
        : filteredContacts.map(c => c.id)
    );
  }, [filteredContacts]);

  // Star/Unstar contact
  const toggleStar = useCallback((contactId: string) => {
    setContacts(prev => prev.map(contact =>
      contact.id === contactId
        ? { ...contact, isStarred: !contact.isStarred }
        : contact
    ));
  }, []);

  // Delete contacts
  const deleteContacts = useCallback((contactIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${contactIds.length} contact(s)?`)) {
      setContacts(prev => prev.filter(contact => !contactIds.includes(contact.id)));
      setSelectedContacts([]);
    }
  }, []);

  // Export contacts
  const exportContacts = useCallback((format: 'csv' | 'excel') => {
    // Simulate export functionality
    const contactsToExport = selectedContacts.length > 0
      ? contacts.filter(c => selectedContacts.includes(c.id))
      : filteredContacts;

    
    // In real implementation, generate and download file
    alert(`Exported ${contactsToExport.length} contacts as ${format.toUpperCase()}`);
  }, [contacts, selectedContacts, filteredContacts]);

  // Import contacts
  const handleImport = useCallback((file: File) => {
    // Simulate import functionality
    
    // In real implementation, parse file and add contacts
    setShowImportModal(false);
    alert('Contacts imported successfully!');
  }, []);

  // Contact card component for grid view
  const ContactCard: React.FC<{ contact: Contact }> = ({ contact }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            title={`Select contact ${contact.firstName} ${contact.lastName}`}
            checked={selectedContacts.includes(contact.id)}
            onChange={() => toggleContactSelection(contact.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {contact.avatar ? (
              <img src={contact.avatar} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {contact.firstName[0]}{contact.lastName[0]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => toggleStar(contact.id)}
            className="text-gray-400 hover:text-yellow-500"
            aria-label="Star contact"
          >
            {contact.isStarred ? (
              <StarIconSolid className="w-4 h-4 text-yellow-500" />
            ) : (
              <StarIcon className="w-4 h-4" />
            )}
          </button>
          <button type="button" className="text-gray-400 hover:text-gray-600" aria-label="More options">
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="font-medium text-gray-900">
          {contact.firstName} {contact.lastName}
        </h3>
        {contact.position && contact.company && (
          <p className="text-sm text-gray-600">
            {contact.position} at {contact.company}
          </p>
        )}
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-3">
        {contact.phone && (
          <div className="flex items-center">
            <PhoneIcon className="w-4 h-4 mr-2" />
            {contact.phone}
          </div>
        )}
        {contact.email && (
          <div className="flex items-center">
            <EnvelopeIcon className="w-4 h-4 mr-2" />
            {contact.email}
          </div>
        )}
        {contact.location && (
          <div className="flex items-center">
            <MapPinIcon className="w-4 h-4 mr-2" />
            {contact.location}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {contact.tags.slice(0, 3).map(tagId => {
          const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
          return tag ? (
            <span key={tagId} className={`px-2 py-1 text-xs rounded-full ${tag.color}`}>
              {tag.label}
            </span>
          ) : null;
        })}
        {contact.tags.length > 3 && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
            +{contact.tags.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{contact.totalMessages} messages</span>
        <span>Last: {contact.lastContact}</span>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <span className="text-sm text-gray-500">
                {filteredContacts.length} of {contacts.length} contacts
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                  aria-label="Table view"
                >
                  <TableCellsIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                  aria-label="Grid view"
                >
                  <Bars3Icon className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                Import
              </button>

              <button
                type="button"
                onClick={() => exportContacts('csv')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingContact(null);
                  setShowContactModal(true);
                }}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <UserPlusIcon className="w-4 h-4 mr-2" />
                Add Contact
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>

            {selectedContacts.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedContacts.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => deleteContacts(selectedContacts)}
                  className="text-red-600 hover:text-red-700"
                  aria-label="Delete selected contacts"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    title="Filter by contact status"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    title="Filter by contact source"
                    value={filters.source}
                    onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Sources</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="manual">Manual</option>
                    <option value="import">Import</option>
                    <option value="api">API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <select
                    title="Filter by assigned team member"
                    value={filters.assignedTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Team Members</option>
                    {TEAM_MEMBERS.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.slice(0, 4).map(tag => (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            tags: prev.tags.includes(tag.id)
                              ? prev.tags.filter(t => t !== tag.id)
                              : [...prev.tags, tag.id]
                          }));
                        }}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          filters.tags.includes(tag.id)
                            ? tag.color
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.isStarred === true}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        isStarred: e.target.checked ? true : null
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Starred only</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setFilters({
                    search: '',
                    status: 'all',
                    tags: [],
                    dateRange: 'all',
                    source: 'all',
                    assignedTo: 'all',
                    isStarred: null
                  })}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? (
          /* Table View */
          <div className="h-full overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      title="Select all contacts"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        title={`Select ${contact.firstName} ${contact.lastName}`}
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                          {contact.avatar ? (
                            <img src={contact.avatar} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <span className="text-xs font-medium text-gray-600">
                              {contact.firstName[0]}{contact.lastName[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </span>
                            {contact.isStarred && (
                              <StarIconSolid className="w-4 h-4 text-yellow-500 ml-1" />
                            )}
                          </div>
                          {contact.position && (
                            <div className="text-sm text-gray-500">{contact.position}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {contact.company || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{contact.phone}</div>
                      {contact.email && (
                        <div className="text-sm text-gray-500">{contact.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 2).map(tagId => {
                          const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
                          return tag ? (
                            <span key={tagId} className={`px-2 py-1 text-xs rounded-full ${tag.color}`}>
                              {tag.label}
                            </span>
                          ) : null;
                        })}
                        {contact.tags.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{contact.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contact.status === 'active' ? 'bg-green-100 text-green-800' :
                        contact.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {contact.lastContact}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleStar(contact.id)}
                          className="text-gray-400 hover:text-yellow-500"
                          aria-label="Star contact"
                        >
                          {contact.isStarred ? (
                            <StarIconSolid className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <StarIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingContact(contact);
                            setShowContactModal(true);
                          }}
                          className="text-gray-400 hover:text-blue-600"
                          aria-label="Edit contact"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteContacts([contact.id])}
                          className="text-gray-400 hover:text-red-600"
                          aria-label="Delete contact"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredContacts.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                <p className="text-gray-500 mb-4">
                  {filters.search || filters.status !== 'all' || filters.tags.length > 0
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first contact'
                  }
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setShowContactModal(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Add Contact
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Grid View */
          <div className="p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>

            {filteredContacts.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                <p className="text-gray-500 mb-4">
                  {filters.search || filters.status !== 'all' || filters.tags.length > 0
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first contact'
                  }
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setShowContactModal(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Add Contact
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Import Contacts</h2>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close import modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    title="Select CSV or Excel file to import contacts"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImport(file);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Required Columns</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• first_name (required)</li>
                    <li>• last_name (required)</li>
                    <li>• phone (required)</li>
                    <li>• email (optional)</li>
                    <li>• company (optional)</li>
                    <li>• position (optional)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal (Add/Edit) - Simplified placeholder */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close contact modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600">Contact form would be implemented here...</p>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Save logic would go here
                  setShowContactModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {editingContact ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}