import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  User, 
  Settings, 
  Shield, 
  FileText, 
  HelpCircle, 
  Share2,
  ChevronRight,
  Bell,
  CreditCard,
  LogOut
} from 'lucide-react';
import { User as UserType } from '../App';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';

interface ProfilePageProps {
  user: UserType;
  onLogout: () => void;
}

export default function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [inviteCode] = useState('INVEST' + Math.random().toString(36).substr(2, 6).toUpperCase());

  const handleShare = (platform: string) => {
    toast.success(`分享到${platform}成功！`);
    setShareDialogOpen(false);
  };

  const menuItems = [
    {
      icon: User,
      label: '个人信息',
      onClick: () => toast.info('个人信息页面'),
    },
    {
      icon: CreditCard,
      label: '银行卡管理',
      onClick: () => toast.info('银行卡管理页面'),
    },
    {
      icon: Bell,
      label: '消息通知',
      onClick: () => toast.info('消息通知页面'),
    },
    {
      icon: Settings,
      label: '设置',
      onClick: () => toast.info('设置页面'),
    },
    {
      icon: Shield,
      label: '安全中心',
      onClick: () => toast.info('安全中心页面'),
    },
    {
      icon: FileText,
      label: '协议与条款',
      onClick: () => toast.info('协议与条款页面'),
    },
    {
      icon: HelpCircle,
      label: '帮助与反馈',
      onClick: () => toast.info('帮助与反馈页面'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 pb-12">
        <h1 className="text-xl mb-6">我的</h1>
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-semibold mb-1">{user.name || '投资者'}</p>
            <p className="text-sm text-blue-100">{user.phone}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-6">
        {/* Account Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">账户状态</p>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-semibold">
                  {user.accountStatus === 'opened' ? '已开户' : '未开户'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">认证等级</p>
              <p className="font-semibold text-blue-600">L2</p>
            </div>
          </div>
        </Card>

        {/* Invite Friends */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogTrigger asChild>
            <Card className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-orange-900">邀请好友</p>
                    <p className="text-sm text-orange-700">双方均可获得奖励</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-orange-600" />
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>邀请好友</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">您的邀请码</p>
                <p className="text-2xl font-bold text-blue-600 mb-3">{inviteCode}</p>
                <p className="text-xs text-gray-500">好友使用此邀请码注册，双方各得100元交易金</p>
              </div>

              <div className="space-y-2">
                <Label>邀请链接</Label>
                <div className="flex space-x-2">
                  <Input
                    value={`https://app.zhitou.com/invite/${inviteCode}`}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://app.zhitou.com/invite/${inviteCode}`);
                      toast.success('链接已复制');
                    }}
                  >
                    复制
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4">
                <button
                  onClick={() => handleShare('微信')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm">微信</span>
                </button>
                <button
                  onClick={() => handleShare('朋友圈')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm">朋友圈</span>
                </button>
                <button
                  onClick={() => handleShare('QQ')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm">QQ</span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Menu Items */}
        <Card className="overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index}>
                <button
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {index < menuItems.length - 1 && (
                  <div className="border-b border-gray-100 mx-4" />
                )}
              </div>
            );
          })}
        </Card>

        {/* Logout Button */}
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          size="lg"
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>

        <div className="text-center text-sm text-gray-400 py-4">
          <p>智投证券 v1.0.0</p>
          <p className="mt-1">© 2024 All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}
