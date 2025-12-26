// 导出所有用户类型页面
export { YoungUserPage } from './YoungUserPage';
export { MatureUserPage } from './MatureUserPage';
export { AIUserPage } from './AIUserPage';
export { Web3UserPage } from './Web3UserPage';
export { TopCityUserPage } from './TopCityUserPage';
export { OtherCityUserPage } from './OtherCityUserPage';

// 导出共用组件
export { DepositPromoCard } from './DepositPromoCard';
export { StepGuide } from './StepGuide';
export { BenefitsList } from './BenefitsList';
export { CountdownTimer } from './CountdownTimer';

// 用户类型枚举
export enum UserType {
  YOUNG = 'young',           // 30岁以下
  MATURE = 'mature',         // 30岁以上
  AI = 'ai',                 // 关注AI
  WEB3 = 'web3',            // 关注Web3
  TOP_CITY = 'top-city',    // 一线城市
  OTHER_CITY = 'other-city' // 其他城市
}

// 页面组件映射
export const PAGE_COMPONENTS = {
  [UserType.YOUNG]: 'YoungUserPage',
  [UserType.MATURE]: 'MatureUserPage',
  [UserType.AI]: 'AIUserPage',
  [UserType.WEB3]: 'Web3UserPage',
  [UserType.TOP_CITY]: 'TopCityUserPage',
  [UserType.OTHER_CITY]: 'OtherCityUserPage',
} as const;
