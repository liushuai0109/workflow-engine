import { useState } from 'react';
import { YoungUserPage } from './components/YoungUserPage';
import { MatureUserPage } from './components/MatureUserPage';
import { AIUserPage } from './components/AIUserPage';
import { Web3UserPage } from './components/Web3UserPage';
import { TopCityUserPage } from './components/TopCityUserPage';
import { OtherCityUserPage } from './components/OtherCityUserPage';

type PageType = 'young' | 'mature' | 'ai' | 'web3' | 'top-city' | 'other-city';

export default function App() {
  const [selectedPage, setSelectedPage] = useState<PageType>('young');

  const pages = {
    young: { component: <YoungUserPage />, label: '30岁以下' },
    mature: { component: <MatureUserPage />, label: '30岁以上' },
    ai: { component: <AIUserPage />, label: '关注AI' },
    web3: { component: <Web3UserPage />, label: '关注Web3' },
    'top-city': { component: <TopCityUserPage />, label: '一线城市' },
    'other-city': { component: <OtherCityUserPage />, label: '其他城市' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Selector */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-base mb-3">选择用户类型</h1>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(pages) as PageType[]).map((pageKey) => (
              <button
                key={pageKey}
                onClick={() => setSelectedPage(pageKey)}
                className={`py-2 px-3 rounded-lg text-xs transition-colors ${
                  selectedPage === pageKey
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pages[pageKey].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {pages[selectedPage].component}
      </div>
    </div>
  );
}