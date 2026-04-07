import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { Camera, Save, User } from 'lucide-react';

interface ProfileForm {
  name     : string;
  document : string;
  phone    : string;
  birthDate: string;
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn : () => api.get('/auth/me').then(r => r.data),
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    values: {
      name     : profile?.name      || '',
      document : profile?.document  || '',
      phone    : profile?.phone     || '',
      birthDate: profile?.birthDate?.slice(0, 10) || '',
    },
  });

  // Upload avatar
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/upload/image?folder=avatars', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url as string;
    },
    onSuccess: async (url) => {
      await api.patch('/auth/profile', { avatarUrl: url });
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      // Atualiza store
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, avatarUrl: url } as any, accessToken, refreshToken);
      }
      toast.success('Foto atualizada!');
    },
    onError: () => toast.error('Erro ao enviar foto'),
  });

  // Salvar perfil
  const saveProfile = useMutation({
    mutationFn: (d: ProfileForm) => api.patch('/auth/profile', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Perfil atualizado!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    uploadAvatar.mutate(file);
  };

  const avatarUrl = avatarPreview || profile?.avatarUrl || '';
  const initials  = (profile?.name || user?.name || '?').slice(0, 2).toUpperCase();

  return (
    <div>
      <PageHeader title="Meu Perfil" sub="Suas informações pessoais" />

      <div className="max-w-xl space-y-6">
        {/* Avatar */}
        <div className="card flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-border flex items-center justify-center text-accent text-2xl font-bold">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full flex items-center justify-center shadow-lg hover:bg-accent/80 transition-colors"
            >
              {uploadAvatar.isPending
                ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Camera size={13} className="text-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div>
            <div className="font-semibold text-text">{profile?.name || user?.name}</div>
            <div className="text-sm text-text3">{profile?.email || user?.email}</div>
            <div className="text-xs text-text3 mt-0.5">
              <span className="badge-gray">{profile?.role || user?.role}</span>
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="card">
          <div className="section-title mb-4">Dados pessoais</div>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Nome completo</label>
              <input {...register('name', { required: 'Obrigatório' })} className="input" />
              {errors.name && <span className="text-xs text-red">{errors.name.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">CPF / CNPJ</label>
                <input
                  {...register('document')}
                  className="input"
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="form-group">
                <label className="label">Data de nascimento</label>
                <input
                  {...register('birthDate')}
                  type="date"
                  className="input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">WhatsApp / Telefone</label>
              <input
                {...register('phone')}
                className="input"
                placeholder="(47) 99999-9999"
                inputMode="tel"
              />
            </div>

            <button
              onClick={handleSubmit(d => saveProfile.mutate(d))}
              disabled={saveProfile.isPending}
              className="btn-primary w-full justify-center"
            >
              {saveProfile.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                : <><Save size={14} /> Salvar alterações</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}