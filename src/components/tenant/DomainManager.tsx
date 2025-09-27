/**
 * Domain Manager Component
 *
 * Comprehensive domain management interface with:
 * - Domain listing and status
 * - Custom domain addition
 * - Subdomain management
 * - DNS configuration display
 * - Domain verification
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TenantDomain } from '@/middleware/tenant-routing';

interface DomainManagerProps {
  organizationId: string;
  className?: string;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  description: string;
}

export default function DomainManager({
  organizationId,
  className = '',
}: DomainManagerProps) {
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<TenantDomain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, [organizationId]);

  const loadDomains = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/domains');

      if (!response.ok) {
        throw new Error('Failed to load domains');
      }

      const result = await response.json();
      setDomains(result.data || []);
    } catch (error) {
      setError('Failed to load domains');
      console.error('Error loading domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async (domainData: {
    domain?: string;
    subdomain?: string;
    domainType: 'custom' | 'subdomain';
    isPrimary?: boolean;
  }) => {
    try {
      const response = await fetch('/api/tenant/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(domainData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add domain');
      }

      const result = await response.json();
      setDomains(prev => [...prev, result.data.domain]);
      setShowAddDomain(false);

      if (result.data.dnsRecords) {
        setDnsRecords(result.data.dnsRecords);
        setSelectedDomain(result.data.domain);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add domain');
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch(`/api/tenant/domains/${domainId}/verify`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to verify domain');
      }

      const result = await response.json();

      // Update domain in list
      setDomains(prev =>
        prev.map(domain =>
          domain.id === domainId ? result.data.domain : domain
        )
      );

      // Show success/error message
      setError(result.data.verified ? null : result.data.message);
    } catch (error) {
      setError('Failed to verify domain');
    }
  };

  const handleSetPrimaryDomain = async (domainId: string) => {
    try {
      const response = await fetch(`/api/tenant/domains/${domainId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to set primary domain');
      }

      // Reload domains to reflect changes
      loadDomains();
    } catch (error) {
      setError('Failed to set primary domain');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenant/domains/${domainId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete domain');
      }

      setDomains(prev => prev.filter(domain => domain.id !== domainId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete domain');
    }
  };

  const getStatusBadge = (domain: TenantDomain) => {
    if (!domain.is_active) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Inactive</span>;
    }

    if (domain.domain_type === 'subdomain') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>;
    }

    switch (domain.verification_status) {
      case 'verified':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Verified</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  if (isLoading) {
    return (
      <div className={`domain-manager ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`domain-manager ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Domain Management</h2>
          <p className="text-gray-600">Manage custom domains and subdomains for your organization</p>
        </div>
        <button
          onClick={() => setShowAddDomain(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Domain
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Domains List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {domains.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No domains configured</h3>
            <p className="text-gray-600 mb-4">Add a custom domain or subdomain to get started.</p>
            <button
              onClick={() => setShowAddDomain(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Domain
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <DomainRow
                key={domain.id}
                domain={domain}
                onVerify={() => handleVerifyDomain(domain.id)}
                onSetPrimary={() => handleSetPrimaryDomain(domain.id)}
                onDelete={() => handleDeleteDomain(domain.id)}
                onViewDNS={() => {
                  setSelectedDomain(domain);
                  // Load DNS records for this domain
                  fetch(`/api/tenant/domains/${domain.id}`)
                    .then(res => res.json())
                    .then(result => setDnsRecords(result.data.dnsRecords || []));
                }}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddDomain && (
        <AddDomainModal
          onClose={() => setShowAddDomain(false)}
          onAdd={handleAddDomain}
        />
      )}

      {/* DNS Configuration Modal */}
      {selectedDomain && dnsRecords.length > 0 && (
        <DNSConfigModal
          domain={selectedDomain}
          dnsRecords={dnsRecords}
          onClose={() => {
            setSelectedDomain(null);
            setDnsRecords([]);
          }}
        />
      )}
    </div>
  );
}

// Domain Row Component
function DomainRow({
  domain,
  onVerify,
  onSetPrimary,
  onDelete,
  onViewDNS,
  getStatusBadge,
}: {
  domain: TenantDomain;
  onVerify: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
  onViewDNS: () => void;
  getStatusBadge: (domain: TenantDomain) => React.ReactNode;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">{domain.domain}</h3>
            {getStatusBadge(domain)}
            {domain.is_primary && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Primary
              </span>
            )}
          </div>

          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600">
              Type: <span className="font-medium capitalize">{domain.domain_type}</span>
            </p>
            {domain.domain_type === 'custom' && (
              <p className="text-sm text-gray-600">
                SSL Status: <span className="font-medium capitalize">{domain.ssl_status}</span>
              </p>
            )}
            <p className="text-sm text-gray-600">
              Created: {new Date(domain.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {domain.domain_type === 'custom' && domain.verification_status !== 'verified' && (
            <button
              onClick={onVerify}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800"
            >
              Verify
            </button>
          )}

          {domain.domain_type === 'custom' && (
            <button
              onClick={onViewDNS}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              DNS Settings
            </button>
          )}

          {!domain.is_primary && domain.verification_status === 'verified' && (
            <button
              onClick={onSetPrimary}
              className="px-3 py-1.5 text-sm text-green-600 hover:text-green-800"
            >
              Set Primary
            </button>
          )}

          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Domain Modal Component
function AddDomainModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [domainType, setDomainType] = useState<'custom' | 'subdomain'>('subdomain');
  const [domain, setDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    try {
      const data = {
        domainType,
        isPrimary,
        ...(domainType === 'custom' ? { domain } : { subdomain }),
      };

      await onAdd(data);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to add domain']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Add Domain</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <ul className="text-red-700 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Domain Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Domain Type</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="domainType"
                  value="subdomain"
                  checked={domainType === 'subdomain'}
                  onChange={(e) => setDomainType(e.target.value as 'subdomain')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium">Subdomain</div>
                  <div className="text-xs text-gray-500">Use a subdomain (e.g., yourname.adsapp.com)</div>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="domainType"
                  value="custom"
                  checked={domainType === 'custom'}
                  onChange={(e) => setDomainType(e.target.value as 'custom')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium">Custom Domain</div>
                  <div className="text-xs text-gray-500">Use your own domain (e.g., inbox.yourcompany.com)</div>
                </div>
              </label>
            </div>
          </div>

          {/* Domain Input */}
          {domainType === 'custom' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Name
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="inbox.yourcompany.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subdomain
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="yourcompany"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <span className="px-3 py-2 bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">
                  .adsapp.com
                </span>
              </div>
            </div>
          )}

          {/* Primary Domain Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPrimary" className="text-sm font-medium text-gray-700">
              Set as primary domain
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// DNS Configuration Modal Component
function DNSConfigModal({
  domain,
  dnsRecords,
  onClose,
}: {
  domain: TenantDomain;
  dnsRecords: DNSRecord[];
  onClose: () => void;
}) {
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const copyToClipboard = (text: string, recordId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordId);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">DNS Configuration</h3>
            <p className="text-gray-600">Configure these DNS records with your domain provider</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Domain: {domain.domain}</h4>
          <p className="text-blue-800 text-sm">
            Add the following DNS records to your domain provider's control panel to verify and activate your domain.
          </p>
        </div>

        <div className="space-y-4">
          {dnsRecords.map((record, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{record.type} Record</h4>
                <span className="text-xs text-gray-500">{record.description}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                      {record.name}
                    </code>
                    <button
                      onClick={() => copyToClipboard(record.name, `${index}-name`)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {copiedRecord === `${index}-name` ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm font-mono break-all">
                      {record.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(record.value, `${index}-value`)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {copiedRecord === `${index}-value` ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">Important Notes</h4>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• DNS changes can take up to 48 hours to propagate globally</li>
            <li>• Make sure to add all required records for proper functionality</li>
            <li>• After adding records, click "Verify" on the domain to check configuration</li>
          </ul>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}