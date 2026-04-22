import { Outlet } from 'react-router-dom';

export default function BasicLayout() {
  return (
    <div className="layout">
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
} 