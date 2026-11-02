import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { DocumentProvider } from './context/DocumentContext';
import { ChatProvider } from './context/ChatContext';
import { SettingsProvider } from './context/SettingsContext';
import { AppLayout } from './components/layout/AppLayout';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DocumentProvider>
          <ChatProvider>
            <SettingsProvider>
              <AppLayout />
            </SettingsProvider>
          </ChatProvider>
        </DocumentProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
