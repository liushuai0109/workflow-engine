import { Button } from './ui/button';
import { TrendingUp, Shield, Zap } from 'lucide-react';

interface WelcomePageProps {
  onRegister: () => void;
  onLogin: () => void;
}

export default function WelcomePage({ onRegister, onLogin }: WelcomePageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6">
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="mb-8">
          <TrendingUp className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-4xl mb-2">智投证券</h1>
          <p className="text-blue-100">专业的证券交易平台</p>
        </div>

        <div className="w-full max-w-md space-y-6 mt-12">
          <div className="flex items-start space-x-4 text-left">
            <Shield className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">安全可靠</h3>
              <p className="text-sm text-blue-100">银行级别安全保障，资金安全有保障</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 text-left">
            <Zap className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">快速交易</h3>
              <p className="text-sm text-blue-100">毫秒级响应，把握每一个投资机会</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 text-left">
            <TrendingUp className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">专业服务</h3>
              <p className="text-sm text-blue-100">实时行情，专业分析，助力投资决策</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-8">
        <Button 
          onClick={onRegister}
          className="w-full bg-white text-blue-600 hover:bg-blue-50"
          size="lg"
        >
          立即注册
        </Button>
        <Button 
          onClick={onLogin}
          variant="outline"
          className="w-full border-white text-white hover:bg-white/10"
          size="lg"
        >
          已有账号，立即登录
        </Button>
      </div>

      <p className="text-xs text-blue-200 text-center mt-6">
        注册即表示同意《用户协议》和《隐私政策》
      </p>
    </div>
  );
}
