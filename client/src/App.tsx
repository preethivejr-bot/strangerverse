import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { LandingView } from './views/LandingView';
import { VoiceChatView } from './views/VoiceChatView';
import { TextChatView } from './views/TextChatView';
import { JunctionsView } from './views/JunctionsView';
import { JunctionRoomView } from './views/JunctionRoomView';
import { MultiplayerGamesView } from './views/MultiplayerGamesView';
import { OwnerControlCenterView } from './views/OwnerControlCenterView';
import { ProfileView } from './views/ProfileView';
import { authService } from './services/auth';
import { User } from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeJunctionId, setActiveJunctionId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleJoinJunction = (districtId: string) => {
    setActiveJunctionId(districtId);
    setActiveTab('junction-room');
  };

  const handleLeaveJunction = () => {
    setActiveJunctionId(null);
    setActiveTab('junctions');
  };

  const handleLogout = async () => {
    await authService.logout();
    if (activeTab === 'owner') {
      setActiveTab('home');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100 selection:bg-stranger-purple selection:text-white">
      
      {/* Top Navigation */}
      <Header
        user={currentUser}
        activeTab={activeTab === 'junction-room' ? 'junctions' : activeTab}
        setActiveTab={(tab) => {
          if (activeJunctionId && tab !== 'junctions') {
            setActiveJunctionId(null);
          }
          setActiveTab(tab);
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <LandingView
            user={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceChatView
            user={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'text' && (
          <TextChatView
            user={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'junctions' && (
          <JunctionsView
            user={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            onJoinJunction={handleJoinJunction}
          />
        )}

        {activeTab === 'junction-room' && activeJunctionId && (
          <JunctionRoomView
            districtId={activeJunctionId}
            user={currentUser}
            onLeave={handleLeaveJunction}
          />
        )}

        {activeTab === 'games' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MultiplayerGamesView
              districtId="global_arena"
              user={currentUser}
              participants={currentUser ? [{ userId: currentUser.id, username: currentUser.displayName }] : []}
              activeGameState={null}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'owner' && (
          <OwnerControlCenterView
            user={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Google Login Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          // Modal will auto-close
        }}
      />
    </div>
  );
};

export default App;
