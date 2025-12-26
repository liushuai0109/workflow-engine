/**
 * 用户路由工具
 * 根据用户画像返回对应的页面类型
 */

export type UserType = 'young' | 'mature' | 'ai' | 'web3' | 'top-city' | 'other-city';

export interface UserProfile {
  age?: number;              // 年龄
  city?: string;             // 城市
  interests?: string[];      // 兴趣标签
  investAmount?: number;     // 投资金额
}

/**
 * 根据用户画像路由到对应页面
 */
export function routeUserToPage(profile: UserProfile): UserType {
  // 优先级1: 兴趣标签
  if (profile.interests) {
    if (profile.interests.includes('AI') || profile.interests.includes('人工智能')) {
      return 'ai';
    }
    if (profile.interests.includes('Web3') || 
        profile.interests.includes('区块链') || 
        profile.interests.includes('加密货币')) {
      return 'web3';
    }
  }

  // 优先级2: 城市
  const topCities = ['北京', '上海', '广州', '深圳'];
  if (profile.city && topCities.includes(profile.city)) {
    return 'top-city';
  }

  // 优先级3: 年龄
  if (profile.age !== undefined) {
    if (profile.age < 30) {
      return 'young';
    } else if (profile.age >= 30) {
      return 'mature';
    }
  }

  // 默认：其他城市页面
  return 'other-city';
}

/**
 * 示例用法：
 * 
 * const userProfile = {
 *   age: 25,
 *   city: '成都',
 *   interests: ['AI', '科技'],
 *   investAmount: 5000
 * };
 * 
 * const pageType = routeUserToPage(userProfile);
 * // 返回: 'ai'
 */
