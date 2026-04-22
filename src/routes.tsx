import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Login from './pages/login';
import BasicLayout from './layouts/BasicLayout';
import AuthGuard from './components/AuthGuard';

// 懒加载 Chat 页面 (包含 markdown, katex, html2canvas 等重依赖)
const Chat = lazy(() => import('./pages/chat'));
// 懒加载首页，减少初始包体积
const HomePage = lazy(() => import('./pages/home'));

// 加载中组件
function PageLoader() {
  return (
    <div className="fixed inset-0 bg-[#ededed] dark:bg-background flex items-center justify-center">
      <div className="w-8 h-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <BasicLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<PageLoader />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'group/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Chat />
          </Suspense>
        ),
      },
      {
        path: 'chat/:characterId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Chat />
          </Suspense>
        ),
      },
    ],
  },
]); 