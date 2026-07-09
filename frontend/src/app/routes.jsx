import { createBrowserRouter } from 'react-router';
import { LandingPage } from './components/landing-page';
import { MainApp } from './components/main-app';
import { SignupPage } from './components/signup';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <MainApp />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/app',
    element: <MainApp />,
  },
  {
    path: '/app/*',
    element: <MainApp />,
  },
  {
    path: '*',
    element: <LandingPage />,
  },
]);
