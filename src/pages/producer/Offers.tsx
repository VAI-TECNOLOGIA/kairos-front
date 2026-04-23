import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { PageHeader, Modal, Loading, EmptyState, SplitBarVisual } from "@/components/ui";
import { formatBRL, RECIPIENT_LABEL } from "@/lib/utils";
import type { Product, Offer } from "@/types";
import { Tag, Plus, Settings, Copy } from "lucide-react";

const offerSchema = z.object({ productId: z.string(), name: z.string().min(3), priceCents: z.number().int().positive(), type: z.enum(["STANDARD","UPSELL","ORDERBUMP","SUBSCRIPTION"]) });
type OfferForm = z.infer<typeof offerSchema>;

const splitSchema = z.object({ splits: z.array(z.object({ recipientType: z.enum(["PRODUCER","COPRODUCER","AFFILIATE"]), recipientId: z.string().optional(), basisPoints: z.number().min(0.01).max(100), description: z.string().optional() })) });
type SplitForm = z.infer<typeof splitSchema>;

export default function OfferManager() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAffiliate = user?.role === 'AFFILIATE';

  const [openOffer, setOpenOffer] = useState(false);
  const [splitOfferId, setSplitOfferId] = useState<string|null>(null);

  const { data: products } = useQuery({ queryKey:["my-products"], queryFn:()=>api.get("/products").then(r=>r.data) });

  // Queries de afiliados e co-produtores só para PRODUCER/ADMIN
  const { data: affiliatesData } = useQuery({
    queryKey: ["my-affiliates"],
    queryFn : () => api.get("/affiliates/pending?status=APPROVED").then(r => r.data),
    enabled : !isAffiliate,
  });
  const { data: coproducersData } = useQuery({
    queryKey: ["coproducers-list"],
    queryFn : () => api.get("/coproducers").then(r => r.data),
    enabled : !isAffiliate,
  });

  const affiliates  = affiliatesData?.data  || [];
  const coproducers = coproducersData?.data || coproducersData || [];
  const allProducts: Product[] = products?.data || [];

  const { register: ro, handleSubmit: ho, reset: rro, formState:{errors:eo} } = useForm<OfferForm>({ resolver: zodResolver(offerSchema), defaultValues:{type:"STANDARD"} });
  const { register: rs, handleSubmit: hs, control, watch: ws } = useForm<SplitForm>({ resolver: zodResolver(splitSchema), defaultValues:{ splits:[{recipientType:"PRODUCER",basisPoints:95}] } });
  const { fields, append, remove } = useFieldArray({ control, name:"splits" });
  const splitsWatch = ws("splits");
  const totalPct = splitsWatch.reduce((s,x)=>s+(x.basisPoints||0),0);

  const createOffer = useMutation({
    mutationFn: async (d: OfferForm) => {
      const offer = await api.post("/offers", d);
      // Split padrão automático (produtor OU afiliado co-produtor):
      // Plataforma (% configurada pelo admin) + Produtor/CoProdutor (resto)
      // Sem isso, o checkout reclama "split não configurado".
      try {
        const { data: fee } = await api.get('/admin/platform-fee');
        const platformBps = fee.platformBps || 500; // fallback 5%
        const producerBps = 10000 - platformBps;
        await api.post(`/offers/${offer.data.id}/splits`, {
          splits: [
            { recipientType: "PLATFORM", recipientId: "platform", basisPoints: platformBps, description: `Taxa plataforma ${(platformBps / 100).toFixed(2)}%` },
            { recipientType: "PRODUCER", basisPoints: producerBps, description: `Produtor ${(producerBps / 100).toFixed(2)}%` },
          ],
        });
      } catch (err: any) {
        console.warn('[offers] split padrão não configurado:', err?.message);
      }
      return offer;
    },
    onSuccess: () => {
      toast.success("Oferta criada!");
      qc.invalidateQueries({ queryKey: ["my-products"] });
      setOpenOffer(false);
      rro();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao criar oferta'),
  });

  const configSplits = useMutation({
    mutationFn: ({ id, splits }: { id:string; splits:SplitForm["splits"] }) => api.post(`/offers/${id}/splits`, { splits }),
    onSuccess: ()=>{ toast.success("Splits configurados!"); qc.invalidateQueries({queryKey:["my-products"]}); setSplitOfferId(null); }
  });

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/checkout/${slug}`);
    toast.success("Link copiado!");
  };

  return (
    <div>
      <PageHeader
        title="Ofertas & Split Engine"
        sub={isAffiliate ? "Gerencie as ofertas dos seus produtos" : "Configure splits independentes por oferta"}
        actions={<button onClick={()=>setOpenOffer(true)} className="btn-primary btn-sm"><Plus size={14}/> Nova oferta</button>}
      />

      {allProducts.length === 0 ? <EmptyState icon={<Tag size={32}/>} title="Sem produtos" sub="Crie um produto primeiro." /> : (
        <div className="space-y-4">
          {allProducts.map(p => (
            <div key={p.id} className="card">
              <div className="font-semibold text-text mb-3 flex items-center gap-2">{p.name}<span className="badge-gray text-[10px]">{p.type}</span></div>
              {(p.offers||[]).map(o => (
                <div key={o.id} className="bg-bg3 rounded-[7px] p-4 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{o.name}</span>
                      <span className="badge-blue text-[10px]">{o.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-accent">{formatBRL(o.priceCents)}</span>
                      <button onClick={()=>copyLink(o.slug)} className="btn-ghost btn-sm p-1" title="Copiar link"><Copy size={13}/></button>
                      {/* Botão de splits só para PRODUCER/ADMIN */}
                      {!isAffiliate && (
                        <button onClick={()=>setSplitOfferId(o.id)} className="btn-sec btn-sm"><Settings size={13}/> Splits</button>
                      )}
                    </div>
                  </div>
                  {o.splitRules && o.splitRules.length > 0
                    ? <SplitBarVisual rules={o.splitRules} priceCents={o.priceCents} />
                    : <p className="text-xs text-text3">Splits não configurados ainda</p>
                  }
                </div>
              ))}
              {(!p.offers||p.offers.length===0) && <p className="text-sm text-text3">Nenhuma oferta — crie a primeira acima</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal nova oferta */}
      <Modal open={openOffer} onClose={()=>setOpenOffer(false)} title="Nova Oferta"
        footer={<><button className="btn-ghost" onClick={()=>setOpenOffer(false)}>Cancelar</button><button className="btn-primary" onClick={ho(d=>createOffer.mutate(d))}>{createOffer.isPending ? 'Criando...' : 'Criar oferta'}</button></>}>
        <div className="space-y-4">
          <div className="form-group"><label className="label">Produto *</label>
            <select {...ro("productId")} className="input">{allProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div className="form-group"><label className="label">Nome da oferta *</label><input {...ro("name")} className="input" placeholder="Ex: Oferta Normal"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group"><label className="label">Preço (centavos) *</label><input {...ro("priceCents",{valueAsNumber:true})} type="number" className="input" placeholder="9700"/></div>
            <div className="form-group"><label className="label">Tipo</label><select {...ro("type")} className="input"><option value="STANDARD">Padrão</option><option value="UPSELL">Upsell</option><option value="ORDERBUMP">Order Bump</option></select></div>
          </div>
          {isAffiliate && (
            <div className="bg-bg3 rounded-[8px] p-3 text-xs text-text3">
              O split será configurado automaticamente: <strong className="text-text">5% plataforma + 95% para você</strong>.
            </div>
          )}
        </div>
      </Modal>

      {/* Modal splits — só para PRODUCER/ADMIN */}
      {!isAffiliate && (
        <Modal open={!!splitOfferId} onClose={()=>setSplitOfferId(null)} title="Configurar Splits" size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className={`text-sm font-semibold ${totalPct===95?"text-green":"text-red"}`}>
                Sua distribuição: {totalPct}%
                {totalPct===95 ? " ✓" : ` (faltam ${95-totalPct}%)`}
              </span>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={()=>setSplitOfferId(null)}>Cancelar</button>
                <button disabled={totalPct!==95 || configSplits.isPending} className="btn-primary"
                  onClick={hs(d=>configSplits.mutate({id:splitOfferId!,splits:d.splits.map(s=>({...s,basisPoints:Math.round(s.basisPoints*100)}))}))}>
                  {configSplits.isPending ? 'Salvando...' : 'Salvar splits'}
                </button>
              </div>
            </div>
          }>

          <div className="flex items-center justify-between bg-purple/10 border border-purple/30 rounded-[7px] p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple flex-shrink-0" />
              <span className="text-sm font-medium text-text">Plataforma Kairos Way</span>
              <span className="badge-gray text-[10px]">fixo</span>
            </div>
            <span className="text-sm font-bold text-text">5%</span>
          </div>

          <div className="text-xs text-text3 mb-3">Distribua os 95% restantes entre você, produtores e afiliados:</div>
          <div className="space-y-3 mb-4">
            {fields.map((f,i)=>(
              <div key={f.id} className="grid grid-cols-12 gap-2 items-center bg-bg3 p-3 rounded-[7px]">
                <div className="col-span-4">
                  <select {...rs(`splits.${i}.recipientType`)} className="input input-sm">
                    {["PRODUCER","COPRODUCER","AFFILIATE"].map(t=>(
                      <option key={t} value={t}>{RECIPIENT_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4">
                  {splitsWatch[i]?.recipientType === "AFFILIATE" ? (
                    <select {...rs(`splits.${i}.recipientId`)} className="input input-sm">
                      <option value="">Selecione afiliado...</option>
                      {affiliates.map((a:any) => (
                        <option key={a.id} value={a.userId}>{a.user.name} ({a.code})</option>
                      ))}
                    </select>
                  ) : splitsWatch[i]?.recipientType === "COPRODUCER" ? (
                    <select {...rs(`splits.${i}.recipientId`)} className="input input-sm">
                      <option value="">Selecione produtor...</option>
                      {coproducers.map((r:any) => (
                        <option key={r.id} value={r.userId}>{r.user?.name || r.userId?.slice(-8)}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="input input-sm bg-bg2 text-text3 text-xs flex items-center px-2">
                      Você — preenchido automaticamente
                    </div>
                  )}
                </div>
                <div className="col-span-3 flex items-center gap-1">
                  <input {...rs(`splits.${i}.basisPoints`,{valueAsNumber:true})} type="number"
                    className="input input-sm" placeholder="95" min={0.5} max={95} step={0.5}/>
                  <span className="text-xs text-text3 flex-shrink-0">%</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  {fields.length>1 && (
                    <button onClick={()=>remove(i)} className="text-red hover:text-red/70 text-lg leading-none">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>append({recipientType:"COPRODUCER",basisPoints:0})} className="btn-sec btn-sm">
            <Plus size={13}/> Adicionar produtor / afiliado
          </button>
        </Modal>
      )}
    </div>
  );
}