import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Eye, EyeOff, Lock, Mail, User, Phone, CheckCircle, Link2 } from 'lucide-react';

const schema = z.object({
  name    : z.string().min(2, 'Nome obrigatório'),
  email   : z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  phone   : z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AffiliateRegisterPage() {
  const [success, setSuccess]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/affiliates/register', data);
      setSuccess(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative z-10 animate-slide-up">
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green" />
            </div>
            <h2 className="text-lg font-bold text-text mb-2">Cadastro enviado!</h2>
            <p className="text-sm text-text2 mb-6">
              Seu cadastro está em análise. Você receberá acesso assim que um produtor aprovar sua solicitação.
            </p>
            <Link to="/login" className="btn-primary w-full justify-center">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-purple/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/20">
            <Link2 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">Quero ser afiliado</h1>
          <p className="text-sm text-text2 mt-1">Promova produtos e ganhe comissões</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-group">
              <label className="label">Nome completo</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input {...register('name')} className="input pl-9" placeholder="Seu nome completo" />
              </div>
              {errors.name && <span className="text-xs text-red">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input {...register('email')} type="email" className="input pl-9" placeholder="seu@email.com" />
              </div>
              {errors.email && <span className="text-xs text-red">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <span className="text-xs text-red">{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Telefone <span className="text-text3">(opcional)</span></label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input {...register('phone')} className="input pl-9" placeholder="(11) 99999-9999" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : 'Enviar cadastro'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text3 mt-4">
          Já tem conta?{' '}
          <Link to="/login" className="text-accent hover:underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}