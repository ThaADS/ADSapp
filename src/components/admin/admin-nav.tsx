/**
 * Enhanced Admin Navigation Component
 * Comprehensive sidebar navigation for super admin interface with mobile support
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CreditCardIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  TicketIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.ComponentProps<'svg'>>;
  badge?: string;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: HomeIcon,
  },
  {
    name: 'Organizations',
    href: '/admin/organizations',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: UsersIcon,
  },
  {
    name: 'Billing',
    href: '/admin/billing',
    icon: CreditCardIcon,
  },
  {
    name: 'Support Tickets',
    href: '/admin/support',
    icon: TicketIcon,
    badge: '12', // This would be dynamic in real implementation
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: DocumentTextIcon,
  },
  {
    name: 'System Health',
    href: '/admin/health',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Cog6ToothIcon,
  },
];

const quickActions = [
  {
    name: 'Security Alerts',
    href: '/admin/security',
    icon: ExclamationTriangleIcon,
    count: 3,
    urgent: true,
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="sr-only">Open main menu</span>
          {mobileMenuOpen ? (
            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">Super Admin</h1>
                <p className="text-xs text-gray-500">Platform Management</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {/* Quick Actions */}
              {quickActions.length > 0 && (
                <div className="mb-6">
                  <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Quick Actions
                  </div>
                  {quickActions.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        item.urgent
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 flex-shrink-0 h-5 w-5 ${
                          item.urgent ? 'text-red-500' : 'text-gray-400'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                      {item.count && (
                        <span className={`ml-auto inline-block py-0.5 px-2 text-xs rounded-full ${
                          item.urgent
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.count}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {/* Main Navigation */}
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive(item.href)
                        ? 'bg-indigo-100 text-indigo-900 border-r-2 border-indigo-500'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive(item.href) ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                    {item.badge && (
                      <span className="ml-auto inline-block py-0.5 px-2 text-xs rounded-full bg-gray-100 text-gray-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <div>ADSapp Super Admin</div>
              <div className="mt-1">v2.0.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 flex z-40">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-shrink-0 flex items-center px-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">Super Admin</h1>
                  <p className="text-xs text-gray-500">Platform Management</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {/* Quick Actions */}
                {quickActions.length > 0 && (
                  <div className="mb-6">
                    <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Quick Actions
                    </div>
                    {quickActions.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          item.urgent
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon
                          className={`mr-3 flex-shrink-0 h-5 w-5 ${
                            item.urgent ? 'text-red-500' : 'text-gray-400'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                        {item.count && (
                          <span className={`ml-auto inline-block py-0.5 px-2 text-xs rounded-full ${
                            item.urgent
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.count}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Main Navigation */}
                <div className="space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive(item.href)
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon
                        className={`mr-3 flex-shrink-0 h-5 w-5 ${
                          isActive(item.href) ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto inline-block py-0.5 px-2 text-xs rounded-full bg-gray-100 text-gray-800">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}