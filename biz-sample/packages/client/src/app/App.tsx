import { useState } from 'react';
import { Toaster } from './components/ui/sonner';
import WelcomePage from './components/WelcomePage';
import RegisterPage from './components/RegisterPage';
import AccountOpeningPage from './components/AccountOpeningPage';
import MainApp from './components/MainApp';

export type User = {
  id: string;
  userId: string;
  accountId?: string;
  phone: string;
  name?: string;
  idNumber?: string;
  accountStatus: 'registered' | 'opened' | 'verified';
  balance: number;
};

export type Stock = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

export type Position = {
  stockCode: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
};

export type Transaction = {
  id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdraw';
  stockCode?: string;
  stockName?: string;
  quantity?: number;
  price?: number;
  amount: number;
  time: Date;
  status: 'completed' | 'pending' | 'failed';
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<'welcome' | 'register' | 'opening' | 'main'>('welcome');
  const [user, setUser] = useState<User | null>(null);

  const handleRegister = (userId: string, phone: string) => {
    const newUser: User = {
      id: userId,
      userId: userId,
      phone,
      accountStatus: 'registered',
      balance: 0,
    };
    setUser(newUser);
    setCurrentPage('opening');
  };

  const handleAccountOpening = (accountId: string, name: string, idNumber: string) => {
    if (user) {
      setUser({
        ...user,
        accountId,
        name,
        idNumber,
        accountStatus: 'opened',
      });
      setCurrentPage('main');
    }
  };

  const handleLogin = () => {
    // 模拟登录已有账户
    const mockUser: User = {
      id: 'existing_user',
      userId: 'existing_user',
      accountId: 'ACC001',
      phone: '138****8888',
      name: '张三',
      idNumber: '110***********1234',
      accountStatus: 'opened',
      balance: 50000,
    };
    setUser(mockUser);
    setCurrentPage('main');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPage === 'welcome' && (
        <WelcomePage 
          onRegister={() => setCurrentPage('register')}
          onLogin={handleLogin}
        />
      )}
      {currentPage === 'register' && (
        <RegisterPage 
          onRegister={handleRegister}
          onBack={() => setCurrentPage('welcome')}
        />
      )}
      {currentPage === 'opening' && user && (
        <AccountOpeningPage
          userId={user.userId}
          onComplete={handleAccountOpening}
          onBack={() => setCurrentPage('welcome')}
        />
      )}
      {currentPage === 'main' && user && (
        <MainApp 
          user={user}
          setUser={setUser}
          onLogout={() => {
            setUser(null);
            setCurrentPage('welcome');
          }}
        />
      )}
      <Toaster />
    </div>
  );
}
