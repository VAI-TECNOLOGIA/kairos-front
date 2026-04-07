import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  name:        z.string().min(3, 'Nome obrigatório'),
  email:       z.string().email('Email inválido'),
  password:    z.string().min(12, 'Mínimo 12 caracteres'),
  companyName: z.string().optional(),
  phone:       z.string().optional(),
  document:    z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (d: FormData) => api.post('/auth/register', d),
    onSuccess: () => {
      toast.success('Cadastro enviado! Aguarde a aprovação do administrador.');
      navigate('/login');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao cadastrar'),
  });

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text">Solicitar Cadastro</h1>
          <p className="text-sm text-text2 mt-1">Após o envio, um administrador irá aprovar seu acesso</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div className="form-group">
              <label className="label">Nome completo *</label>
              <input {...register('name')} className="input" placeholder="Seu nome" />
              {errors.name && <span className="text-xs text-red">{errors.name.message}</span>}
            </div>
            <div className="form-group">
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className="input" placeholder="seu@email.com" />
              {errors.email && <span className="text-xs text-red">{errors.email.message}</span>}
            </div>
            <div className="form-group">
              <label className="label">Senha * (mínimo 12 caracteres)</label>
              <input {...register('password')} type="password" className="input" placeholder="••••••••••••" />
              {errors.password && <span className="text-xs text-red">{errors.password.message}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Empresa</label>
                <input {...register('companyName')} className="input" placeholder="Nome da empresa" />
              </div>
              <div className="form-group">
                <label className="label">Telefone</label>
                <input {...register('phone')} className="input" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="form-group">
              <label className="label">CPF / CNPJ</label>
              <input {...register('document')} className="input" placeholder="00.000.000/0001-00" />
            </div>
            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full justify-center py-3">
              {mutation.isPending ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          </form>
        </div>
        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-text3 hover:text-accent flex items-center justify-center gap-1">
            <ArrowLeft size={13} /> Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
