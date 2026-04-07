import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { PageHeader, Modal, Loading, EmptyState, SplitBarVisual } from "@/components/ui";
import { formatBRL, RECIPIENT_LABEL } from "@/lib/utils";
import type { Product, Offer } from "@/types";
import { Tag, Plus, Settings, Copy } from "lucide-react";

const offerSchema = z.object({ productId: z.string(), name: z.string().min(3), priceCents: z.number().int().positive(), type: z.enum(["STANDARD","UPSELL","ORDERBUMP","SUBSCRIPTION"]) });
type OfferForm = z.infer<typeof offerSchema>;

const splitSchema = z.object({ splits: z.array(z.object({ recipientType: z.enum(["PLATFORM","PRODUCER","COPRODUCER","AFFILIATE"]), recipientId: z.string().optional(), basisPoints: z.number().int().min(1), description: z.string().optional() })) });
type SplitForm = z.infer<typeof splitSchema>;

export default function OfferManager() {
  const qc = useQueryClient();
  const [openOffer, setOpenOffer] = useState(false);
  const [splitOfferId, setSplitOfferId] = useState<string|null>(null);

  const { data: products } = useQuery({ queryKey:["my-products"], queryFn:()=>api.get("/products").then(r=>r.data) });
  const allProducts: Product[] = products?.data || [];

  const { register: ro, handleSubmit: ho, reset: rro, formState:{errors:eo} } = useForm<OfferForm>({ resolver: zodResolver(offerSchema), defaultValues:{type:"STANDARD"} });
  const { register: rs, handleSubmit: hs, control, watch: ws } = useForm<SplitForm>({ resolver: zodResolver(splitSchema), defaultValues:{ splits:[{recipientType:"PLATFORM",basisPoints:500},{recipientType:"PRODUCER",basisPoints:9500}] } });
  const { fields, append, remove } = useFieldArray({ control, name:"splits" });
  const splitsWatch = ws("splits");
  const totalBps = splitsWatch.reduce((s,x)=>s+(x.basisPoints||0),0);

  const createOffer = useMutation({
    mutationFn: (d: OfferForm) => api.post("/offers", d),
    onSuccess: ()=>{ toast.success("Oferta criada!"); qc.invalidateQueries({queryKey:["my-products"]}); setOpenOffer(false); rro(); }
  });

  const configSplits = useMutation({
    mutationFn: ({ id, splits }: { id:string; splits:SplitForm["splits"] }) => api.post(`/offers/${id}/splits`, { splits }),
    onSuccess: ()=>{ toast.success("Splits configurados!"); setSplitOfferId(null); }
  });

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/checkout/${slug}`);
    toast.success("Link copiado!");
  };

  return (
    <div>
      <PageHeader title="Ofertas & Split Engine" sub="Configure splits independentes por oferta" actions={<button onClick={()=>setOpenOffer(true)} className="btn-primary btn-sm"><Plus size={14}/> Nova oferta</button>} />

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
                      <button onClick={()=>setSplitOfferId(o.id)} className="btn-sec btn-sm"><Settings size={13}/> Splits</button>
                    </div>
                  </div>
                  {o.splitRules && o.splitRules.length > 0 ? <SplitBarVisual rules={o.splitRules} priceCents={o.priceCents} /> : <p className="text-xs text-text3">Splits não configurados ainda</p>}
                </div>
              ))}
              {(!p.offers||p.offers.length===0) && <p className="text-sm text-text3">Nenhuma oferta — crie a primeira acima</p>}
            </div>
          ))}
        </div>
      )}

      {/* New offer modal */}
      <Modal open={openOffer} onClose={()=>setOpenOffer(false)} title="Nova Oferta"
        footer={<><button className="btn-ghost" onClick={()=>setOpenOffer(false)}>Cancelar</button><button className="btn-primary" onClick={ho(d=>createOffer.mutate(d))}>Criar oferta</button></>}>
        <div className="space-y-4">
          <div className="form-group"><label className="label">Produto *</label>
            <select {...ro("productId")} className="input">{allProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div className="form-group"><label className="label">Nome da oferta *</label><input {...ro("name")} className="input" placeholder="Ex: Oferta Normal"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group"><label className="label">Preço (centavos) *</label><input {...ro("priceCents",{valueAsNumber:true})} type="number" className="input" placeholder="9700"/></div>
            <div className="form-group"><label className="label">Tipo</label><select {...ro("type")} className="input"><option value="STANDARD">Padrão</option><option value="UPSELL">Upsell</option><option value="ORDERBUMP">Order Bump</option></select></div>
          </div>
        </div>
      </Modal>

      {/* Split config modal */}
      <Modal open={!!splitOfferId} onClose={()=>setSplitOfferId(null)} title="Configurar Splits" size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className={`text-sm font-semibold ${totalBps===10000?"text-green":"text-red"}`}>Total: {totalBps/100}% {totalBps===10000?"✓":"(deve ser 100%)"}</span>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={()=>setSplitOfferId(null)}>Cancelar</button>
              <button disabled={totalBps!==10000} className="btn-primary" onClick={hs(d=>configSplits.mutate({id:splitOfferId!,splits:d.splits}))}>Salvar splits</button>
            </div>
          </div>
        }>
        <div className="space-y-3 mb-4">
          {fields.map((f,i)=>(
            <div key={f.id} className="grid grid-cols-12 gap-2 items-center bg-bg3 p-3 rounded-[7px]">
              <div className="col-span-4">
                <select {...rs(`splits.${i}.recipientType`)} className="input input-sm">
                  {["PLATFORM","PRODUCER","COPRODUCER","AFFILIATE"].map(t=><option key={t} value={t}>{RECIPIENT_LABEL[t]}</option>)}
                </select>
              </div>
              <div className="col-span-4"><input {...rs(`splits.${i}.recipientId`)} className="input input-sm" placeholder="ID do usuário (opcional)"/></div>
              <div className="col-span-3 flex items-center gap-1">
                <input {...rs(`splits.${i}.basisPoints`,{valueAsNumber:true})} type="number" className="input input-sm" placeholder="2000"/>
                <span className="text-xs text-text3 flex-shrink-0">{((splitsWatch[i]?.basisPoints||0)/100).toFixed(1)}%</span>
              </div>
              <div className="col-span-1 flex justify-end">
                {fields.length>1&&<button onClick={()=>remove(i)} className="text-red hover:text-red/70 text-lg leading-none">×</button>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={()=>append({recipientType:"COPRODUCER",basisPoints:0})} className="btn-sec btn-sm"><Plus size={13}/> Adicionar</button>
      </Modal>
    </div>
  );
}