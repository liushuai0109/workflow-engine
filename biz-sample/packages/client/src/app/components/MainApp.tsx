import { useState } from 'react';
import { Home, TrendingUp, Wallet, User } from 'lucide-react';
import HomePage from './HomePage';
import TradePage from './TradePage';
import AssetsPage from './AssetsPage';
import ProfilePage from './ProfilePage';
import { User as UserType } from '../App';

interface MainAppProps {
  user: UserType;
  setUser: (user: UserType) => void;
  onLogout: () => void;
}

export default function MainApp({ user, setUser, onLogout }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'trade' | 'assets' | 'profile'>('home');

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {activeTab === 'home' && <HomePage user={user} />}
      {activeTab === 'trade' && <TradePage user={user} setUser={setUser} />}
      {activeTab === 'assets' && <AssetsPage user={user} setUser={setUser} />}
      {activeTab === 'profile' && <ProfilePage user={user} onLogout={onLogout} />}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${
              activeTab === 'home' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">首页</span>
          </button>
          <button
            onClick={() => setActiveTab('trade')}
            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${
              activeTab === 'trade' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs">交易</span>
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${
              activeTab === 'assets' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-xs">资产</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${
              activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs">我的</span>
          </button>
        </div>
      </div>
    </div>
  );
}
