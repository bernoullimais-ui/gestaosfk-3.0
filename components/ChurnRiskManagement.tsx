import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  MessageCircle, 
  History, 
  TrendingDown, 
  CheckCircle2, 
  XCircle,
  GraduationCap,
  ShieldCheck, 
  UserCheck,
  Zap,
  X,
  Send,
  Loader2,
  MessageSquareText,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { Aluno, Matricula, Presenca, Turma, AcaoRetencao, Usuario, IdentidadeConfig, UnidadeMapping } from '../types';

interface ChurnRiskManagementProps {
  alunos: Aluno[];
  matriculas: Matricula[];
  presencas: Presenca[];
  turmas: Turma[];
  acoesRealizadas: AcaoRetencao[];
  onRegistrarAcao: (acao: AcaoRetencao) => void;
  onSheetAlarmeUpdate?: (lastPresence: Presenca, status?: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
  currentUser: Usuario;
  identidades: IdentidadeConfig[];
  unidadesMapping: UnidadeMapping[];
}

const ChurnRiskManagement: React.FC<ChurnRiskManagementProps> = ({ 
  alunos, 
  matriculas, 
  presencas, 
  turmas, 
  acoesRealizadas, 
  onRegistrarAcao,
  onSheetAlarmeUpdate,
  onRefresh,
  isLoading = false,
  currentUser,
  identidades = [],
  unidadesMapping = []
}) => {
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; alerta: any | null; message: string; identity?: IdentidadeConfig }>({ isOpen: false, alerta: null, message: '' });

  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();
  const slugify = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const getIdentidadeForCurso = (curso: string, unidade: string): IdentidadeConfig => {
    const mapping = unidadesMapping.find(m => normalize(m.nome) === normalize(unidade));
    if (mapping) {
      const ident = identidades.find(i => normalize(i.nome) === normalize(mapping.identidade));
      if (ident) return ident;
    }

    const matchingTurma = turmas.find(t => normalize(t.nome) === normalize(curso) && normalize(t.unidade) === normalize(unidade));
    const identName = matchingTurma?.identidade || "";
    return identidades.find(i => normalize(i.nome) === normalize(identName)) || identidades[0] || { nome: "Padrão", webhookUrl: "", tplLembrete: "", tplFeedback: "", tplRetencao: "", tplMensagem: "", tplReagendar: "" };
  };

  const riskAnalysis = useMemo(() => {
    const groups: Record<string, { presencas: Presenca[], alunoName: string, unidade: string, curso: string }> = {};
    presencas.forEach(p => {
      const alunoName = (p as any)._estudantePlanilha || p.alunoId;
      const cursoName = (p as any)._turmaPlanilha || p.turmaId;
      const key = `${slugify(alunoName)}|${slugify(p.unidade)}|${slugify(cursoName)}`;
      if (!groups[key]) groups[key] = { presencas: [], alunoName: alunoName, unidade: p.unidade, curso: cursoName };
      groups[key].presencas.push(p);
    });
    const alertas = [];
    for (const key in groups) {
      const group = groups[key];
      const sortedPresencas = [...group.presencas].sort((a, b) => b.data.localeCompare(a.data));
      const ultimas3 = sortedPresencas.slice(0, 3);
      const tresFaltas = ultimas3.length >= 3 && ultimas3.every(p => slugify(p.status) === 'ausente');
      const ultimas9 = sortedPresencas.slice(0, 9);
      let taxa = 0; if (ultimas9.length >= 9) taxa = Math.round((ultimas9.filter(p => slugify(p.status) === 'ausente').length / 9) * 100);
      if (tresFaltas || (ultimas9.length >= 9 && taxa >= 50)) {
        const lastPresence = sortedPresencas[0];
        const alertaId = `risk|${key}|${lastPresence.data}`;
        const alarmeStatus = slugify(lastPresence.alarme);
        const jaTratado = acoesRealizadas.some(a => a.alertaId === alertaId) || alarmeStatus === 'enviado' || alarmeStatus === 'descartado';
        
        if (!jaTratado) {
          alertas.push({ 
            id: alertaId, 
            aluno: alunos.find(a => slugify(a.nome) === slugify(group.alunoName)) || { nome: group.alunoName, unidade: group.unidade }, 
            cursoNome: group.curso, 
            unidade: group.unidade, 
            riskDetails: { tresFaltas, taxa }, 
            lastPresence: lastPresence,
            acaoTratada: jaTratado
          });
        }
      }
    }
    return alertas.sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome));
  }, [alunos, presencas, acoesRealizadas]);

  const openComposeModal = (alerta: any) => {
    const identity = getIdentidadeForCurso(alerta.cursoNome, alerta.unidade);
    let msg = identity.tplRetencao || "Olá {{responsavel}}, notamos que {{estudante}} faltou. Está tudo bem?";
    msg = msg.replace(/{{responsavel}}/gi, (alerta.aluno.responsavel1 || alerta.aluno.nome).split(' ')[0])
             .replace(/{{estudante}}/gi, alerta.aluno.nome.split(' ')[0])
             .replace(/{{aluno}}/gi, alerta.aluno.nome.split(' ')[0])
             .replace(/{{unidade}}/gi, alerta.unidade)
             .replace(/{{curso}}/gi, alerta.cursoNome);
    setMessageModal({ isOpen: true, alerta, message: msg, identity });
  };

  const handleSendMessage = async () => {
    if (!messageModal.alerta || !messageModal.identity) return;
    setIsSending(true);
    const fone = (messageModal.alerta.aluno.whatsapp1 || '').replace(/\D/g, '');
    try {
      if (messageModal.identity.webhookUrl && fone) {
        const payload = { 
          url: messageModal.identity.webhookUrl,
          data: { 
            "data.contact.Phone[0]": `55${fone}`,
            "message": messageModal.message
          }
        };

        const proxyResponse = await fetch('/api/proxy-webhook', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });

        if (!proxyResponse.ok) {
          const contentType = proxyResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const proxyError = await proxyResponse.json();
            throw new Error(proxyError.error || "Erro ao enviar mensagem via WhatsApp");
          } else {
            const errorText = await proxyResponse.text();
            console.error("Proxy error (non-JSON):", errorText);
            throw new Error(`Erro no servidor (Status ${proxyResponse.status}).`);
          }
        }
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
      }
      onRegistrarAcao({ alertaId: messageModal.alerta.id, dataAcao: new Date().toLocaleString(), usuarioLogin: currentUser.login, unidade: currentUser.unidade });
      if (onSheetAlarmeUpdate && messageModal.alerta.lastPresence) await onSheetAlarmeUpdate(messageModal.alerta.lastPresence);
      setMessageModal({ ...messageModal, isOpen: false });
    } catch (e: any) {
      alert(`Erro ao enviar: ${e.message}`);
    } finally { setIsSending(false); }
  };

  const handleDiscardAlerta = async (alerta: any) => {
    if (onSheetAlarmeUpdate && alerta.lastPresence) {
      await onSheetAlarmeUpdate(alerta.lastPresence, 'Descartado');
      onRegistrarAcao({ 
        alertaId: alerta.id, 
        dataAcao: new Date().toLocaleString(), 
        usuarioLogin: currentUser.login, 
        unidade: currentUser.unidade 
      });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <AlertTriangle className="text-red-500" /> Gestão de Retenção
        </h2>
        {onRefresh && (
          <button 
            onClick={() => onRefresh()}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar Planilha
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6">
        {riskAnalysis.map(alerta => (
          <div key={alerta.id} className={`bg-white p-8 rounded-[40px] border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${alerta.acaoTratada ? 'opacity-50' : 'border-l-8 border-l-red-500'}`}>
            <div className="flex items-center gap-6 flex-1">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white ${alerta.riskDetails.tresFaltas ? 'bg-red-500' : 'bg-amber-500'}`}>{alerta.aluno.nome.charAt(0)}</div>
              <div><h3 className="text-xl font-black text-slate-900 uppercase">{alerta.aluno.nome}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alerta.unidade} • {alerta.cursoNome}</p></div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={() => !alerta.acaoTratada && openComposeModal(alerta)} 
                disabled={alerta.acaoTratada} 
                className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-xs transition-all shadow-lg ${alerta.acaoTratada ? 'bg-slate-100 text-slate-400' : 'bg-indigo-950 text-white hover:bg-indigo-900'}`}
              >
                {alerta.acaoTratada ? 'ATENDIDO' : 'ACIONAR RETENÇÃO'}
              </button>
              {!alerta.acaoTratada && (
                <button 
                  onClick={() => handleDiscardAlerta(alerta)}
                  className="w-full sm:w-auto px-6 py-5 rounded-2xl font-black text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all uppercase tracking-widest"
                >
                  Descartar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10">
            <h3 className="text-xl font-black mb-6 uppercase">Retenção: {messageModal.identity?.nome}</h3>
            <textarea value={messageModal.message} onChange={e => setMessageModal({...messageModal, message: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] h-40 mb-8 font-medium text-sm outline-none resize-none shadow-inner" />
            <button onClick={handleSendMessage} disabled={isSending} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-4">{isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />} CONFIRMAR DISPARO</button>
            <button onClick={() => setMessageModal({...messageModal, isOpen: false})} className="w-full mt-4 text-[10px] font-black text-slate-400 uppercase">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurnRiskManagement;