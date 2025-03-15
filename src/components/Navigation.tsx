// src/components/Navigation.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Define navigation items
const navItems = [
  { 
    name: 'Live Orders View', 
    path: '/', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ) 
  },
  { 
    name: 'Discounts Viewer', 
    path: '/discounts', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) 
  }
];

const Navigation = () => {
  const pathname = usePathname();

  return (
    <div className="w-64 min-w-64 bg-black text-white h-screen flex flex-col overflow-hidden flex-shrink-0">
      {/* Logo header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-md p-2">
            <div className="w-7 h-7 flex items-center justify-center">
              <div className="w-6 h-6 bg-[#6359ff] rounded-sm"></div>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">commercetools</h1>
            <p className="text-xs text-gray-400">Order Analytics</p>
          </div>
        </div>
      </div>
      
      {/* Navigation links */}
      <nav className="flex-1 py-6 px-3">
        <div className="mb-2 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
          Dashboard Views
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  className={`flex items-center px-3 py-3 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-ct-violet text-white' 
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-white"/>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User section */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-ct-teal flex items-center justify-center text-black font-bold">
            AD
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-gray-400">admin@commercetools.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;