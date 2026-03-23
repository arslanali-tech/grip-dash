import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from './components/ui/toaster';
import { ConfirmDialogHost } from '@/components/ui/confirm-dialog-host';
import { notify } from '@/lib/notify';

// Safety net: if any legacy code still calls alert(...), render a styled toast instead
// of the browser "localhost says" dialog.
if (typeof window !== 'undefined') {
  (window as any).alert = (message?: any) => {
    notify(String(message ?? ''));
  };
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
    <Toaster />
    <ConfirmDialogHost />
  </React.StrictMode>
);
