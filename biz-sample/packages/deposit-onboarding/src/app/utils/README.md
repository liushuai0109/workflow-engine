# 入金页面导出使用指南

## 方式一：直接导入单个页面组件

```tsx
import { YoungUserPage } from './components/YoungUserPage';
import { AIUserPage } from './components/AIUserPage';

function App() {
  return <YoungUserPage />;
}
```

## 方式二：使用统一导出

```tsx
import { 
  YoungUserPage, 
  MatureUserPage, 
  AIUserPage,
  Web3UserPage,
  TopCityUserPage,
  OtherCityUserPage 
} from './components';

function App() {
  const pageType = getUserType(); // 从后端获取用户类型
  
  switch(pageType) {
    case 'young': return <YoungUserPage />;
    case 'mature': return <MatureUserPage />;
    case 'ai': return <AIUserPage />;
    case 'web3': return <Web3UserPage />;
    case 'top-city': return <TopCityUserPage />;
    case 'other-city': return <OtherCityUserPage />;
  }
}
```

## 方式三：使用路由工具（推荐）

```tsx
import { routeUserToPage } from './utils/userRouter';
import { 
  YoungUserPage, 
  MatureUserPage, 
  AIUserPage,
  Web3UserPage,
  TopCityUserPage,
  OtherCityUserPage 
} from './components';

function DepositLandingPage({ userProfile }) {
  // 根据用户画像自动路由
  const pageType = routeUserToPage(userProfile);
  
  const pageMap = {
    'young': <YoungUserPage />,
    'mature': <MatureUserPage />,
    'ai': <AIUserPage />,
    'web3': <Web3UserPage />,
    'top-city': <TopCityUserPage />,
    'other-city': <OtherCityUserPage />,
  };
  
  return pageMap[pageType];
}

// 使用示例
const userProfile = {
  age: 25,
  city: '深圳',
  interests: ['AI', '科技'],
  investAmount: 5000
};

<DepositLandingPage userProfile={userProfile} />
```

## 方式四：在React Router中使用

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { 
  YoungUserPage, 
  MatureUserPage, 
  AIUserPage,
  Web3UserPage,
  TopCityUserPage,
  OtherCityUserPage 
} from './components';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/deposit/young" element={<YoungUserPage />} />
        <Route path="/deposit/mature" element={<MatureUserPage />} />
        <Route path="/deposit/ai" element={<AIUserPage />} />
        <Route path="/deposit/web3" element={<Web3UserPage />} />
        <Route path="/deposit/top-city" element={<TopCityUserPage />} />
        <Route path="/deposit/other-city" element={<OtherCityUserPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## 方式五：服务端根据用户画像返回不同页面

### 后端示例 (Node.js)

```javascript
app.get('/deposit-page', async (req, res) => {
  const userId = req.user.id;
  const userProfile = await getUserProfile(userId);
  
  // 根据用户画像决定渲染哪个页面
  let pageType = 'other-city'; // 默认
  
  if (userProfile.interests.includes('AI')) {
    pageType = 'ai';
  } else if (userProfile.interests.includes('Web3')) {
    pageType = 'web3';
  } else if (['北京', '上海', '广州', '深圳'].includes(userProfile.city)) {
    pageType = 'top-city';
  } else if (userProfile.age < 30) {
    pageType = 'young';
  } else {
    pageType = 'mature';
  }
  
  // 重定向到对应页面
  res.redirect(`/deposit/${pageType}`);
});
```

## 方式六：A/B测试

```tsx
import { useEffect, useState } from 'react';
import { 
  YoungUserPage, 
  MatureUserPage, 
  AIUserPage 
} from './components';

function ABTestDepositPage() {
  const [variant, setVariant] = useState<string>('');
  
  useEffect(() => {
    // 随机分配或从后端获取A/B测试分组
    const abTestVariant = Math.random() < 0.5 ? 'young' : 'ai';
    setVariant(abTestVariant);
    
    // 上报A/B测试曝光
    trackEvent('deposit_page_view', { variant: abTestVariant });
  }, []);
  
  if (variant === 'young') return <YoungUserPage />;
  if (variant === 'ai') return <AIUserPage />;
  return <MatureUserPage />;
}
```

## 页面对应关系

| 页面组件 | 适用人群 | 特点 |
|---------|---------|------|
| YoungUserPage | 30岁以下 | 低门槛、社交、热门股票 |
| MatureUserPage | 30岁以上 | 稳健、专业、VIP服务 |
| AIUserPage | 关注AI的用户 | AI概念股、智能投顾 |
| Web3UserPage | 关注Web3的用户 | 区块链概念股、加密货币 |
| TopCityUserPage | 北上广深用户 | 高端理财、线下服务 |
| OtherCityUserPage | 其他城市用户 | 普惠金融、低门槛 |

## 用户画像路由规则

优先级从高到低：
1. **兴趣标签**：AI → ai页面，Web3 → web3页面
2. **城市**：北上广深 → top-city页面
3. **年龄**：<30岁 → young页面，≥30岁 → mature页面
4. **默认**：other-city页面

## 导出文件清单

所有页面组件都在 `/src/app/components/` 目录下：

- `YoungUserPage.tsx` - 年轻用户页面
- `MatureUserPage.tsx` - 成熟用户页面
- `AIUserPage.tsx` - AI用户页面
- `Web3UserPage.tsx` - Web3用户页面
- `TopCityUserPage.tsx` - 一线城市用户页面
- `OtherCityUserPage.tsx` - 其他城市用户页面

共用组件：
- `DepositPromoCard.tsx` - 活动卡片组件
- `StepGuide.tsx` - 步骤引导组件
- `BenefitsList.tsx` - 权益列表组件
- `CountdownTimer.tsx` - 倒计时组件
