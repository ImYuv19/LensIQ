import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { ChatWorkspace } from '../chat/ChatWorkspace';
import { DocumentViewer } from '../viewer/DocumentViewer';
import { DocumentLibraryModal } from '../documents/DocumentLibraryModal';
import { ChatHistoryModal } from '../history/ChatHistoryModal';
import { SettingsModal } from '../settings/SettingsModal';
import { SpreadsheetExtractionModal } from '../extraction/SpreadsheetExtractionModal';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { AuthModal, AuthMode } from '../auth/AuthModal';
import { LandingPage } from '../landing/LandingPage';
import { useDocuments } from '../../context/DocumentContext';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { activePreviewDoc } = useDocuments();
  const { isAuthenticated } = useAuth();

  // Navigation view: 'app' or 'landing'
  const [currentView, setCurrentView] = useState<'app' | 'landing'>('app');

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Split view state for Document Viewer
  const [isSplitView, setIsSplitView] = useState(true);

  // Modals state
  const [isDocLibraryOpen, setIsDocLibraryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExtractionOpen, setIsExtractionOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    return localStorage.getItem('lensiq_onboarding_completed') !== 'true';
  });
  const [authModalState, setAuthModalState] = useState<{ isOpen: boolean; mode: AuthMode }>({
    isOpen: false,
    mode: 'signin',
  });

  const openAuth = (mode: AuthMode = 'signin') => {
    setAuthModalState({ isOpen: true, mode });
  };

  const closeAuth = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onGetStarted={() => setCurrentView('app')}
          onSignIn={() => openAuth('signin')}
        />
        <AuthModal
          isOpen={authModalState.isOpen}
          onClose={closeAuth}
          initialMode={authModalState.mode}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0C0E] text-[#F3F4F6]">
      {/* Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenDocuments={() => setIsDocLibraryOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExtraction={() => setIsExtractionOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navigation */}
        <TopNav
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenExtraction={() => setIsExtractionOpen(true)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onOpenLanding={() => setCurrentView('landing')}
        />

        {/* Center Workspace Area: Chat & Split Document Viewer */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Main Chat Workspace */}
          <ChatWorkspace onOpenDocumentLibrary={() => setIsDocLibraryOpen(true)} />

          {/* Document Viewer (Split view mode on desktop or overlay) */}
          {activePreviewDoc && (
            <DocumentViewer
              isSplitView={isSplitView}
              onToggleSplitView={() => setIsSplitView(!isSplitView)}
            />
          )}
        </div>
      </div>

      {/* Application Modals */}
      <DocumentLibraryModal
        isOpen={isDocLibraryOpen}
        onClose={() => setIsDocLibraryOpen(false)}
      />

      <ChatHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetOnboarding={() => setIsOnboardingOpen(true)}
      />

      <SpreadsheetExtractionModal
        isOpen={isExtractionOpen}
        onClose={() => setIsExtractionOpen(false)}
      />

      <OnboardingTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      <AuthModal
        isOpen={authModalState.isOpen}
        onClose={closeAuth}
        initialMode={authModalState.mode}
      />
    </div>
  );
};

