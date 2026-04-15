// src/components/Navigation.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const operationsItems = [
  {
    name: 'Live Orders',
    path: '/',
    section: null,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

const promotionsItems = [
  {
    name: 'Campaigns',
    path: '/discounts',
    section: 'campaigns',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    name: 'Budget Tracker',
    path: '/discounts',
    section: 'budget',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Cap Monitor',
    path: '/discounts',
    section: 'caps',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Impact Analysis',
    path: '/discounts',
    section: 'impact',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const SectionLabel = ({ label }: { label: string }) => (
  <div className="mb-1 mt-4 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider first:mt-0">
    {label}
  </div>
);

const Navigation = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSection = searchParams.get('section');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isItemActive = (item: { path: string; section: string | null }) => {
    if (item.path === '/' && !item.section) {
      return pathname === '/';
    }
    if (item.section) {
      return pathname === item.path && currentSection === item.section;
    }
    return pathname === item.path;
  };

  const renderNavItem = (item: { name: string; path: string; section: string | null; icon: React.ReactNode }) => {
    const isActive = isItemActive(item);
    const href = item.section ? `${item.path}?section=${item.section}` : item.path;
    return (
      <li key={`${item.path}-${item.section}`}>
        <Link
          href={href}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-2.5 rounded-md transition-colors ${
            isActive
              ? 'bg-[#6359ff] text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title={isCollapsed ? item.name : ''}
        >
          <span className={isCollapsed ? '' : 'mr-3'}>{item.icon}</span>
          {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
          {!isCollapsed && isActive && (
            <span className="ml-auto w-2 h-2 rounded-full bg-white" />
          )}
        </Link>
      </li>
    );
  };

  return (
    <div
      className={`bg-white text-gray-800 h-screen flex flex-col overflow-hidden transition-all duration-300 border-r border-gray-200 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-md p-1">
            <div className="w-7 h-7 flex items-center justify-center">
              <div className="w-6 h-6 bg-[#6359ff] rounded-sm"></div>
            </div>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900">commercetools</h1>
              <p className="text-xs text-gray-500">Promotions Analytics</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {!isCollapsed && <SectionLabel label="Operations" />}
        <ul className="space-y-0.5 mb-2">
          {operationsItems.map(renderNavItem)}
        </ul>

        {!isCollapsed && <SectionLabel label="Promotions Hub" />}
        <ul className="space-y-0.5">
          {promotionsItems.map(renderNavItem)}
        </ul>
      </nav>

      {/* User section */}
      <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <div className="w-10 h-10 rounded-full bg-[#00b8d9] flex items-center justify-center text-white font-bold">
            AD
          </div>
        ) : (
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#00b8d9] flex items-center justify-center text-white font-bold">
              AD
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">admin@commercetools.com</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigation;
