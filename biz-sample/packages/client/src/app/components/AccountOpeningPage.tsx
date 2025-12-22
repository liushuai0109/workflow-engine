import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

interface AccountOpeningPageProps {
  userId: string;
  onComplete: (accountId: string, name: string, idNumber: string) => void;
  onBack: () => void;
}

export default function AccountOpeningPage({ userId, onComplete, onBack }: AccountOpeningPageProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [bankCard, setBankCard] = useState('');
  const [bankName, setBankName] = useState('');
  const [idFrontUploaded, setIdFrontUploaded] = useState(false);
  const [idBackUploaded, setIdBackUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const banks = [
    '工商银行',
    '建设银行',
    '农业银行',
    '中国银行',
    '交通银行',
    '招商银行',
    '浦发银行',
    '民生银行',
    '兴业银行',
    '中信银行',
  ];

  const handleNext = async () => {
    if (step === 1) {
      if (!name || name.length < 2) {
        toast.error('请输入真实姓名');
        return;
      }
      if (!idNumber || idNumber.length !== 18) {
        toast.error('请输入正确的身份证号');
        return;
      }
      if (!bankCard || bankCard.length < 16) {
        toast.error('请输入正确的银行卡号');
        return;
      }
      if (!bankName) {
        toast.error('请选择开户银行');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!idFrontUploaded || !idBackUploaded) {
        toast.error('请上传身份证正反面照片');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setLoading(true);
      try {
        const account = await api.openAccount(userId, name, idNumber, bankCard, bankName);
        toast.success('开户成功！');
        onComplete(account.accountId, name, idNumber);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '开户失败，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpload = (side: 'front' | 'back') => {
    if (side === 'front') {
      setIdFrontUploaded(true);
      toast.success('身份证正面上传成功');
    } else {
      setIdBackUploaded(true);
      toast.success('身份证反面上传成功');
    }
  };

  const progressValue = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl mb-4">开户认证</h1>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>步骤 {step}/3</span>
            <span>{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg mb-4">基本信息</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">真实姓名</Label>
                <Input
                  id="name"
                  placeholder="请输入真实姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">身份证号</Label>
                <Input
                  id="idNumber"
                  placeholder="请输入18位身份证号"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.toUpperCase().slice(0, 18))}
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankCard">银行卡号</Label>
                <Input
                  id="bankCard"
                  placeholder="请输入银行卡号"
                  value={bankCard}
                  onChange={(e) => setBankCard(e.target.value.replace(/\D/g, '').slice(0, 19))}
                  maxLength={19}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">开户银行</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择开户银行" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg mb-4">身份认证</h2>
            <p className="text-sm text-gray-500 mb-6">请上传身份证正反面照片</p>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="mb-2">身份证人像面</p>
                {idFrontUploaded ? (
                  <div className="text-green-600 text-sm">✓ 已上传</div>
                ) : (
                  <Button 
                    onClick={() => handleUpload('front')}
                    variant="outline"
                    size="sm"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    拍照上传
                  </Button>
                )}
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="mb-2">身份证国徽面</p>
                {idBackUploaded ? (
                  <div className="text-green-600 text-sm">✓ 已上传</div>
                ) : (
                  <Button 
                    onClick={() => handleUpload('back')}
                    variant="outline"
                    size="sm"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    拍照上传
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg mb-4">风险测评</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm mb-4">根据监管要求，开户需完成风险承受能力评估</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">您的年龄范围：</span>
                    <span className="text-sm text-blue-600">30-40岁</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">投资经验：</span>
                    <span className="text-sm text-blue-600">1-3年</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">风险偏好：</span>
                    <span className="text-sm text-blue-600">稳健型</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm">
                  <span className="font-semibold text-blue-800">评估结果：</span>
                  <span className="text-blue-700"> 您适合投资中低风险的证券产品</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleNext}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 mt-8"
        size="lg"
      >
        {loading ? '处理中...' : (step === 3 ? '完成开户' : '下一步')}
      </Button>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">安全提示：</span>
          您的个人信息将被严格加密保护，仅用于身份验证和监管合规
        </p>
      </div>
    </div>
  );
}
