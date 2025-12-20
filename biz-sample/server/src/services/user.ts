import { v4 as uuidv4 } from 'uuid';

interface User {
  userId: string;
  phone: string;
  password: string;
  createdAt: string;
}

// 内存存储
const users: Map<string, User> = new Map();

interface CreateUserParams {
  phone: string;
  password: string;
}

class UserService {
  async create(params: CreateUserParams): Promise<User> {
    // 检查手机号是否已存在
    for (const user of users.values()) {
      if (user.phone === params.phone) {
        throw { code: 'DUPLICATE_PHONE', message: '手机号已存在' };
      }
    }

    const user: User = {
      userId: uuidv4(),
      phone: params.phone,
      password: params.password, // 实际应用中应该加密
      createdAt: new Date().toISOString(),
    };

    users.set(user.userId, user);
    return user;
  }

  async findById(userId: string): Promise<User | undefined> {
    return users.get(userId);
  }

  async findByPhone(phone: string): Promise<User | undefined> {
    for (const user of users.values()) {
      if (user.phone === phone) {
        return user;
      }
    }
    return undefined;
  }
}

export const userService = new UserService();

