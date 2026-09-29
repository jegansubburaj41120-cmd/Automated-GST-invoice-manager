import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-wrapper">
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
