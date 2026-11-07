import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
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

// Wrapper component to provide params to JunctionRoomView
const JunctionRoomWrapper: React.FC<{
  user: User | null;
}> = ({ user }) => {
  const { districtId } = useParams<{ districtId: string }>();
  const navigate = useNavigate();

  if (!districtId) {
    return <Navigate to="/junctions" replace />;
  }

  return (
    <JunctionRoomView
      districtId={districtId}
      user={user}
      onLeave={() => navigate('/junctions')}
    />
  );
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authService.subscribe((u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Handle backward-compatible hash redirects (e.g. /#voice -> /voice)
  useEffect(() => {
    if (window.location.hash) {
      const raw = window.location.hash.replace('#', '').replace('/', '').trim().toLowerCase();
      const validRoutes: Record<string, string> = {
        voice: '/voice',
        text: '/text',
        junctions: '/junctions',
        games: '/games',
        profile: '/profile',
        owner: '/owner',
      };
      if (validRoutes[raw]) {
        navigate(validRoutes[raw], { replace: true });
      }
    }
  }, [navigate]);

  // Derive active tab for Header highlight from the current URL path
  const getActiveTab = (): string => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path.startsWith('/voice')) return 'voice';
    if (path.startsWith('/text')) return 'text';
    if (path.startsWith('/junctions')) return 'junctions';
    if (path.startsWith('/games')) return 'games';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/owner')) return 'owner';
    return 'home';
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'home' || tab === '/') {
      navigate('/');
    } else if (tab.startsWith('/')) {
      navigate(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    if (location.pathname.startsWith('/owner')) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100 selection:bg-stranger-purple selection:text-white">
      {/* Top Navigation */}
      <Header
        user={currentUser}
        activeTab={getActiveTab()}
        setActiveTab={handleNavigateTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area with Clean Routing */}
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <LandingView
                user={currentUser}
                onNavigate={handleNavigateTab}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            }
          />
          <Route
            path="/voice"
            element={
              <VoiceChatView
                user={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            }
          />
          <Route
            path="/text"
            element={
              <TextChatView
                user={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            }
          />
          <Route
            path="/junctions"
            element={
              <JunctionsView
                user={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
                onJoinJunction={(districtId) => navigate(`/junctions/${districtId}`)}
              />
            }
          />
          <Route
            path="/junctions/:districtId"
            element={<JunctionRoomWrapper user={currentUser} />}
          />
          <Route
            path="/games"
            element={
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <MultiplayerGamesView
                  districtId="global_arena"
                  user={currentUser}
                  participants={currentUser ? [{ userId: currentUser.id, username: currentUser.displayName }] : []}
                  activeGameState={null}
                />
              </div>
            }
          />
          <Route
            path="/profile"
            element={
              <ProfileView
                user={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
                onNavigate={handleNavigateTab}
              />
            }
          />
          <Route
            path="/owner"
            element={
              <OwnerControlCenterView
                user={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            }
          />
          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
