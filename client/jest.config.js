module.exports = {
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 预设配置
  preset: 'ts-jest',
  
  // 模块文件扩展名
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'vue'],
  
  // 转换配置
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'preserve',
          target: 'esnext',
          module: 'esnext',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
    '^.+\\.jsx?$': 'babel-jest',
  },
  
  // 模块名映射（支持 @/ 别名）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // 需要转换的文件
  transformIgnorePatterns: [
    'node_modules/(?!(bpmn-js|@bpmn-io|bpmn-js-properties-panel)/)',
  ],
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // 测试文件所在目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  
  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,vue}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  
  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html']
  
}

