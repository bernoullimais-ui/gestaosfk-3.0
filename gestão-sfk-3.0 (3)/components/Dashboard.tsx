
import React, { useMemo, useState } from 'react';
import { 
    Users, 
    GraduationCap, 
    Target,
    UserX,
    ArrowRight,
    Activity,
    MessageCircle,
    Zap,
    Loader2,
    CheckCircle2,
    Calendar,
    MapPin,
    BookOpen,
    RefreshCw,
    FileSpreadsheet,
    PieChart,
    Search,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    Contact2,
    ClipboardCheck,
    Tag,
    UserPlus,
    BarChart3,
    AlertTriangle,
    ChevronRight,
    FlaskConical
} from 'lucide-react';
import { Presenca, Usuario, Aluno, Matricula, Turma, ViewType, AulaExperimental, AcaoRetencao, IdentidadeConfig, UnidadeMapping, CancelamentoRecord } from '../types';

const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();
const slugify = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

// Função padronizada para cores por unidade conforme identidade visual SFK
const getUnidadeStyle = (unidade: string) => {
  const u = String(unidade || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.includes('AKA')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (u.includes('BUNNY')) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (u.includes('LICEU')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (u.includes('PEDRINHO')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (u.includes('OFICINA')) return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

interface DashboardProps {
  user: Usuario;
  alunosCount: number;
  turmasCount: number;
  turmas?: Turma[];
  presencas: Presenca[];
  alunos?: Aluno[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
  onUpdateExperimental?: (updated: AulaExperimental) => Promise<void>;
  acoesRetencao?: AcaoRetencao[];
  onNavigate?: (view: ViewType, context?: { date?: string; unidade?: string; turmaId?: string }) => void;
  isLoading?: boolean;
  identidades?: IdentidadeConfig[];
  unidadesMapping?: UnidadeMapping[];
  cancelamentos?: CancelamentoRecord[];
  onSyncCancellations?: () => Promise<void>;
}

const normalizeAggressive = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  alunosCount,
  turmasCount,
  turmas = [],
  presencas, 
  alunos = [],
  matriculas = [],
  experimentais = [],
  onUpdateExperimental,
  acoesRetencao = [],
  onNavigate,
  isLoading = false,
  identidades = [],
  unidadesMapping = [],
  cancelamentos = [],
  onSyncCancellations
}) => {
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; exp: AulaExperimental | null; message: string; identity?: IdentidadeConfig }>({ isOpen: false, exp: null, message: '' });

  const userNivelNorm = useMemo(() => normalize(user.nivel || ''), [user.nivel]);
  const isMaster = userNivelNorm === 'gestor master' || userNivelNorm === 'start';
  const isGestorAdmin = userNivelNorm === 'gestor administrativo' || userNivelNorm === 'gestor';
  const isPrivilegedUser = isMaster || isGestorAdmin;
  const isProfessor = userNivelNorm === 'professor' || userNivelNorm === 'estagiario';

  const profNameNorm = useMemo(() => normalize(user.nome || user.login).replace(/^prof\.?\s*/i, ''), [user]);

  const formatEscolaridade = (exp: AulaExperimental) => {
    let etapa = (exp.etapa || (exp as any).estagioanoescolar || '').trim();
    let turma = (exp.turmaEscolar || (exp as any).turma || '').toString().replace(/turma\s*/gi, '').trim();

    if (!etapa) return "";

    etapa = etapa.toUpperCase()
      .replace('EDUCACAO INFANTIL', 'EI')
      .replace('ENSINO FUNDAMENTAL', 'EF')
      .replace('ENSINO MEDIO', 'EM');

    let result = etapa;
    
    const invalidClasses = ['NAO SEI', 'NÃO SEI', '', 'TURMA'];
    if (turma && !invalidClasses.includes(turma.toUpperCase())) {
      const lastChar = etapa.split(' ').pop();
      if (lastChar !== turma.toUpperCase()) {
        result = `${etapa} ${turma.toUpperCase()}`;
      }
    }
    
    return result;
  };

  // Lógica de cálculo de risco para o Alerta do Dashboard - Restrito a Master/Admin
  const alertasRetencaoPendentes = useMemo(() => {
    if (!isPrivilegedUser) return 0;

    const groups: Record<string, { presencas: Presenca[], alunoName: string, unidade: string, curso: string }> = {};
    presencas.forEach(p => {
      const alunoName = (p as any)._estudantePlanilha || p.alunoId;
      const cursoName = (p as any)._turmaPlanilha || p.turmaId;
      const key = `${slugify(alunoName)}|${slugify(p.unidade)}|${slugify(cursoName)}`;
      if (!groups[key]) groups[key] = { presencas: [], alunoName: alunoName, unidade: p.unidade, curso: cursoName };
      groups[key].presencas.push(p);
    });

    let countPendente = 0;
    for (const key in groups) {
      const group = groups[key];
      const sortedPresencas = [...group.presencas].sort((a, b) => b.data.localeCompare(a.data));
      const ultimas3 = sortedPresencas.slice(0, 3);
      const tresFaltas = ultimas3.length >= 3 && ultimas3.every(p => slugify(p.status) === 'ausente');
      const ultimas9 = sortedPresencas.slice(0, 9);
      let taxa = 0; 
      if (ultimas9.length >= 9) taxa = Math.round((ultimas9.filter(p => slugify(p.status) === 'ausente').length / 9) * 100);
      
      if (tresFaltas || (ultimas9.length >= 9 && taxa >= 50)) {
        const lastPresence = sortedPresencas[0];
        const alertaId = `risk|${key}|${lastPresence.data}`;
        const jaTratado = acoesRetencao.some(a => a.alertaId === alertaId) || slugify(lastPresence.alarme) === 'enviado';
        
        if (!jaTratado) countPendente++;
      }
    }
    return countPendente;
  }, [presencas, acoesRetencao, isPrivilegedUser]);

  const getIdentidadeForExp = (exp: AulaExperimental): IdentidadeConfig => {
    const unitNorm = normalize(exp.unidade);
    const mapping = unidadesMapping.find(m => {
      const mNameNorm = normalize(m.nome);
      return unitNorm.includes(mNameNorm) || mNameNorm.includes(unitNorm);
    });
    if (mapping) {
      const ident = identidades.find(i => normalize(i.nome) === normalize(mapping.identidade));
      if (ident) return ident;
    }
    const matchingTurma = turmas.find(t => normalize(t.nome) === normalize(exp.curso) && normalize(t.unidade) === unitNorm);
    const identName = matchingTurma?.identidade || "";
    return identidades.find(i => normalize(i.nome) === normalize(identName)) || identidades[0] || { nome: "Padrão", webhookUrl: "", tplLembrete: "", tplFeedback: "", tplRetencao: "", tplMensagem: "", tplReagendar: "" };
  };

  const statsData = useMemo(() => {
    const userUnitNorm = normalize(user.unidade);
    const isGlobal = isMaster || userUnitNorm === 'todas';
    const currentYear = new Date().getFullYear();

    if (isProfessor) {
      const minhasTurmasBase = turmas.filter(t => {
        const tProf = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return tProf.includes(profNameNorm) || profNameNorm.includes(tProf);
      });

      const minhasMatriculasAtivas = matriculas.filter(m => minhasTurmasBase.some(t => t.id === m.turmaId));
      const minhasTurmasAtivas = minhasTurmasBase.filter(t => minhasMatriculasAtivas.some(m => m.turmaId === t.id));
      const meusAlunosAtivosIds = new Set(minhasMatriculasAtivas.map(m => m.alunoId));

      const minhasExpNoAno = experimentais.filter(exp => {
        const d = new Date(exp.aula);
        if (d.getFullYear() !== currentYear) return false;
        return minhasTurmasBase.some(t => normalize(t.nome).includes(normalize(exp.curso)) && normalize(t.unidade) === normalize(exp.unidade));
      });
      const convertidosCount = minhasExpNoAno.filter(e => e.convertido).length;
      const taxaConversao = minhasExpNoAno.length > 0 ? Math.round((convertidosCount / minhasExpNoAno.length) * 100) : 0;

      let cancelamentosNoAno = 0;
      let totalMatriculasNoAno = minhasMatriculasAtivas.length;

      alunos.forEach(aluno => {
        const canceladosProfessor = (aluno.cursosCanceladosDetalhes || []).filter(c => {
          const dCanc = c.dataCancelamento ? new Date(c.dataCancelamento) : null;
          if (!dCanc || dCanc.getFullYear() !== currentYear) return false;
          return minhasTurmasBase.some(t => normalize(t.nome) === normalize(c.nome) && normalize(t.unidade) === normalize(c.unidade));
        });
        cancelamentosNoAno += canceladosProfessor.length;
      });

      totalMatriculasNoAno += cancelamentosNoAno;
      const taxaCancelamento = totalMatriculasNoAno > 0 ? Math.round((cancelamentosNoAno / totalMatriculasNoAno) * 100) : 0;

      // Cálculo de Assiduidade do Professor (Registro em dia)
      const minhasPresencas = presencas.filter(p => {
        const pTurma = turmas.find(t => t.id === p.turmaId || normalize(t.nome) === normalize(p.turmaId));
        if (!pTurma) return false;
        const tProf = normalize(pTurma.professor).replace(/^prof\.?\s*/i, '');
        return tProf.includes(profNameNorm) || profNameNorm.includes(tProf);
      });

      // Agrupar por data e turma para não contar cada aluno individualmente, mas sim cada chamada feita
      const chamadasUnicas = new Set<string>();
      let chamadasNoDia = 0;
      let totalChamadas = 0;

      minhasPresencas.forEach(p => {
        const key = `${p.data}|${p.turmaId}`;
        if (!chamadasUnicas.has(key)) {
          chamadasUnicas.add(key);
          totalChamadas++;

          if (p.timestampInclusao) {
            // Limpa possíveis vírgulas ou caracteres extras do timestamp (ex: "06/02/2026, 13:48:20")
            const datePart = p.timestampInclusao.split(' ')[0].replace(',', '').trim();
            const parts = datePart.split('/');
            if (parts.length === 3) {
              // Garante que o ano tenha 4 dígitos
              let ano = parts[2];
              if (ano.length === 2) {
                const yearNum = parseInt(ano);
                ano = yearNum > 70 ? "19" + ano : "20" + ano;
              }
              const dateInclusao = `${ano}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; // YYYY-MM-DD
              if (dateInclusao === p.data) {
                chamadasNoDia++;
              }
            } else {
              // Fallback para formato ISO se o split por '/' falhar
              const isoMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (isoMatch && isoMatch[0] === p.data) {
                chamadasNoDia++;
              }
            }
          }
        }
      });

      const assiduidadeProfessor = totalChamadas > 0 ? Math.round((chamadasNoDia / totalChamadas) * 100) : 0;

      const ocupacaoDetalhamento = minhasTurmasBase.map(t => {
        const count = minhasMatriculasAtivas.filter(m => m.turmaId === t.id).length;
        const cap = t.capacidade || 20;
        return { nome: t.nome, count, cap, pct: cap > 0 ? Math.round((count / cap) * 100) : 0 };
      }).sort((a,b) => b.pct - a.pct);

      return {
        meusAlunosAtivos: meusAlunosAtivosIds.size,
        minhasTurmasAtivas: minhasTurmasAtivas.length,
        taxaConversao,
        taxaCancelamento,
        assiduidadeProfessor,
        ocupacaoDetalhamento
      };
    } else {
      const scopeMatriculas = isGlobal ? matriculas : matriculas.filter(m => normalize(m.unidade).includes(userUnitNorm) || userUnitNorm.includes(normalize(m.unidade)));
      const activeCoursesIds = new Set(scopeMatriculas.map(m => m.turmaId));
      let totalPct = 0;
      activeCoursesIds.forEach(tId => {
          const tObj = turmas.find(t => t.id === tId);
          const capacity = tObj?.capacidade || 20;
          const count = scopeMatriculas.filter(m => m.turmaId === tId).length;
          if (capacity > 0) totalPct += (count / capacity) * 100;
      });
      return { 
        totalCadastrados: isGlobal ? alunos.length : alunos.filter(a => normalize(a.unidade).includes(userUnitNorm)).length, 
        alunosAtivos: new Set(scopeMatriculas.map(m => m.alunoId)).size, 
        matriculasAtivas: scopeMatriculas.length, 
        turmasAtivas: activeCoursesIds.size, 
        ocupacaoMedia: activeCoursesIds.size > 0 ? Math.round(totalPct / activeCoursesIds.size) : 0 
      };
    }
  }, [isMaster, isProfessor, profNameNorm, user.unidade, matriculas, alunos, turmas, experimentais]);

  // Lógica de leads pendentes - Restrito a Master/Admin
  const leadsParaConversao = useMemo(() => {
    if (!isPrivilegedUser) return [];
    const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
    return experimentais.filter(exp => {
      if (exp.convertido) return false;
      const dAula = new Date(exp.aula); dAula.setHours(12, 0, 0, 0); 
      return (exp.status === 'Presente' && !exp.followUpSent && dAula <= hoje) || (exp.status === 'Ausente' && !exp.reagendarEnviado && dAula <= hoje);
    }).sort((a, b) => new Date(b.aula).getTime() - new Date(a.aula).getTime());
  }, [experimentais, isPrivilegedUser]);

  const alertasFrequenciaPendentes = useMemo(() => {
    if (!isProfessor) return [];
    
    const minhasTurmas = turmas.filter(t => {
      const tProf = normalize(t.professor).replace(/^prof\.?\s*/i, '');
      return tProf.includes(profNameNorm) || profNameNorm.includes(tProf);
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    ontem.setHours(23, 59, 59, 999); // Garantir que o loop inclua o dia de ontem completo

    const alertas: { data: string; unidade: string; turma: string; turmaId: string }[] = [];

    const diasSemanaMap: Record<string, number> = {
      'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6,
      'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6
    };

    minhasTurmas.forEach(t => {
      if (!t.dataInicio) return;
      
      // Extrair dias da semana do horário (ex: "Seg/Qua 15h" ou "Sex 12h30")
      const horarioNorm = normalize(t.horario);
      const diasDaTurma: number[] = [];
      
      // Simplificado: se o termo existe no horário, adiciona o dia correspondente
      Object.keys(diasSemanaMap).forEach(dia => {
        if (horarioNorm.includes(dia)) {
          const val = diasSemanaMap[dia];
          if (!diasDaTurma.includes(val)) diasDaTurma.push(val);
        }
      });

      if (diasDaTurma.length === 0) return;

      let dataRef = new Date(t.dataInicio + 'T12:00:00');
      // Limitar a busca para não ser infinita ou muito pesada
      const dataLimite = new Date(hoje);
      dataLimite.setMonth(dataLimite.getMonth() - 2); 
      if (dataRef < dataLimite) dataRef = dataLimite;

      while (dataRef <= ontem) {
        const diaSemana = dataRef.getDay();
        if (diasDaTurma.includes(diaSemana)) {
          // Formatação manual para evitar problemas de fuso horário com toISOString
          const year = dataRef.getFullYear();
          const month = String(dataRef.getMonth() + 1).padStart(2, '0');
          const day = String(dataRef.getDate()).padStart(2, '0');
          const dataStr = `${year}-${month}-${day}`;
          
          // Verificar se houve registro para esta turma nesta data
          const houveRegistro = presencas.some(p => 
            p.data === dataStr && 
            (p.turmaId === t.id || normalize(p.turmaId) === normalize(t.nome))
          );

          if (!houveRegistro) {
            alertas.push({
              data: dataStr,
              unidade: t.unidade,
              turma: t.nome,
              turmaId: t.id
            });
          }
        }
        dataRef.setDate(dataRef.getDate() + 1);
      }
    });

    return alertas.sort((a, b) => b.data.localeCompare(a.data));
  }, [isProfessor, turmas, presencas, profNameNorm]);

  const alertasExperimentaisPendentes = useMemo(() => {
    if (!isProfessor) return [];
    
    const minhasTurmas = turmas.filter(t => {
      const tProf = normalize(t.professor).replace(/^prof\.?\s*/i, '');
      return tProf.includes(profNameNorm) || profNameNorm.includes(tProf);
    });

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    return experimentais.filter(exp => {
      if (normalize(exp.status) !== 'pendente') return false;
      
      const dAula = new Date(exp.aula + 'T12:00:00');
      if (dAula > hoje) return false;

      // Verificar se a modalidade e unidade batem com as turmas do professor
      return minhasTurmas.some(t => {
        const uMatch = normalize(t.unidade) === normalize(exp.unidade);
        const tNomeNorm = normalize(t.nome);
        const expCursoNorm = normalize(exp.curso);
        // Match flexível: o curso está contido no nome da turma ou vice-versa
        const cMatch = tNomeNorm.includes(expCursoNorm) || expCursoNorm.includes(tNomeNorm);
        return uMatch && cMatch;
      });
    }).sort((a, b) => b.aula.localeCompare(a.aula));
  }, [isProfessor, turmas, experimentais, profNameNorm]);

  const pendingCancellationsToSync = useMemo(() => {
    if (!isPrivilegedUser || !cancelamentos || !alunos) return [];
    return cancelamentos.filter(cancel => {
      if (!cancel || (!cancel.estudante && !cancel.email)) return false;
      
      const match = alunos.find(a => {
        if (!a || a.statusMatricula !== 'Ativo') return false;
        
        const nameOrEmailMatch = (a.email && cancel.email && normalizeAggressive(a.email) === normalizeAggressive(cancel.email)) ||
                                 (normalizeAggressive(a.nome).includes(normalizeAggressive(cancel.estudante)) || normalizeAggressive(cancel.estudante).includes(normalizeAggressive(a.nome)));
        
        if (!nameOrEmailMatch) return false;

        // Check if any of the student's active matriculas match the cancelled plan
        const studentMatriculas = (matriculas || []).filter(m => m.alunoId === a.id);
        const planMatch = studentMatriculas.some(m => {
          const t = (turmas || []).find(turma => turma.id === m.turmaId);
          const tNome = t ? t.nome : m.turmaId;
          return normalizeAggressive(tNome).includes(normalizeAggressive(cancel.plano)) || normalizeAggressive(cancel.plano).includes(normalizeAggressive(tNome));
        }) || normalizeAggressive(a.plano).includes(normalizeAggressive(cancel.plano)) || normalizeAggressive(cancel.plano).includes(normalizeAggressive(a.plano)) || !cancel.plano;

        return planMatch;
      });
      return !!match;
    });
  }, [isPrivilegedUser, cancelamentos, alunos, matriculas, turmas]);

  const openComposeModal = (exp: AulaExperimental) => {
    const identity = getIdentidadeForExp(exp);
    const template = exp.status === 'Ausente' ? identity.tplReagendar : identity.tplFeedback;
    let msg = template || (exp.status === 'Ausente' ? "Oi {{responsavel}}, {{estudante}} não veio. Reagendar?" : "Oi {{responsavel}}, como foi a aula de {{estudante}}?");
    
    // Suporte a tags variadas e case-insensitive
    const responsavelNome = exp.responsavel1?.split(' ')[0] || "";
    const estudanteNome = exp.estudante.split(' ')[0] || "";

    msg = msg.replace(/{{responsavel}}/gi, responsavelNome)
             .replace(/{{paimae}}/gi, responsavelNome)
             .replace(/{{mae}}/gi, responsavelNome)
             .replace(/{{pai}}/gi, responsavelNome)
             .replace(/{{estudante}}/gi, estudanteNome)
             .replace(/{{aluno}}/gi, estudanteNome)
             .replace(/{{curso}}/gi, exp.curso)
             .replace(/{{unidade}}/gi, exp.unidade)
             .replace(/{{data}}/gi, formatDate(exp.aula));

    setMessageModal({ isOpen: true, exp, message: msg, identity });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y.substring(2)}`;
  };

  const handleSendMessage = async () => {
    if (!messageModal.exp || !messageModal.identity) return;
    setIsSending(true);
    const fone = messageModal.exp.whatsapp1?.replace(/\D/g, '');
    try {
      if (messageModal.identity.webhookUrl && fone) {
        await fetch(messageModal.identity.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": messageModal.message }) });
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
      }
      if (onUpdateExperimental) await onUpdateExperimental({ ...messageModal.exp, [messageModal.exp.status === 'Ausente' ? 'reagendarEnviado' : 'followUpSent']: true });
      setMessageModal({ ...messageModal, isOpen: false });
    } finally { setIsSending(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      {/* Alerta de Retenção Crítica - Apenas para Gestor Master e Administrativo */}
      {isPrivilegedUser && alertasRetencaoPendentes > 0 && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[40px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-100/50 animate-pulse-slow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-rose-500 rounded-[24px] flex items-center justify-center text-white shadow-lg shadow-rose-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight">Gestão de Retenção Crítica</h3>
              <p className="text-rose-600 font-bold text-sm">
                Existem <span className="font-black text-rose-700 underline">{alertasRetencaoPendentes} ações</span> de retenção aguardando atendimento imediato.
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate && onNavigate('churn-risk')}
            className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-rose-200"
          >
            REALIZAR TRATAMENTO <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Painel de Performance</h2><p className="text-slate-500 font-medium">{isProfessor ? `Olá Prof. ${user.nome || user.login}, estas são suas métricas.` : 'Visão administrativa e estratégica.'}</p></div>
      </div>

      {/* Alerta de Cancelamentos Pendentes de Sincronização - Apenas Master */}
      {isPrivilegedUser && pendingCancellationsToSync.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[40px] p-8 space-y-6 shadow-xl shadow-rose-100/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-rose-600 rounded-[24px] flex items-center justify-center text-white shadow-lg shadow-rose-200">
                <UserX className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight">Cancelamentos Pendentes</h3>
                <p className="text-rose-600 font-bold text-sm">
                  Existem {pendingCancellationsToSync.length} registros na aba Cancelamento que ainda estão como Ativos na Base.
                </p>
              </div>
            </div>
            <button 
              onClick={() => onSyncCancellations()}
              disabled={isLoading}
              className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center gap-3 disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar Cancelamentos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingCancellationsToSync.slice(0, 6).map((cancel, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-rose-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-800 uppercase truncate pr-2">{cancel.estudante}</p>
                  <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase">Pendente</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                  <BookOpen className="w-3 h-3" /> {cancel.plano}
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                  <Calendar className="w-3 h-3" /> Fim: {cancel.dataFim}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de Frequência Pendente - Para Professor */}
      {isProfessor && alertasFrequenciaPendentes.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-100 rounded-[40px] p-8 space-y-6 shadow-xl shadow-amber-100/50">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500 rounded-[24px] flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Frequências Pendentes</h3>
              <p className="text-amber-600 font-bold text-sm">
                Identificamos aulas sem registro de presença. Por favor, regularize o quanto antes.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertasFrequenciaPendentes.slice(0, 6).map((alerta, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-amber-100 flex items-center justify-between group hover:border-amber-300 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-black text-slate-700">{formatDate(alerta.data)}</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{alerta.turma}</p>
                  <p className="text-[9px] font-bold text-amber-600 uppercase">{alerta.unidade}</p>
                </div>
                <button 
                  onClick={() => onNavigate && onNavigate('frequencia', { date: alerta.data, unidade: alerta.unidade, turmaId: alerta.turmaId })}
                  className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
            {alertasFrequenciaPendentes.length > 6 && (
              <div className="col-span-full text-center py-2">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">E mais {alertasFrequenciaPendentes.length - 6} registros pendentes...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerta de Experimental Pendente - Para Professor */}
      {isProfessor && alertasExperimentaisPendentes.length > 0 && (
        <div className="bg-indigo-50 border-2 border-indigo-100 rounded-[40px] p-8 space-y-6 shadow-xl shadow-indigo-100/50">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <FlaskConical className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Experimentais sem Registro</h3>
              <p className="text-indigo-600 font-bold text-sm">
                Existem aulas experimentais concluídas que ainda não tiveram a participação registrada.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertasExperimentaisPendentes.slice(0, 6).map((exp, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-indigo-100 flex items-center justify-between group hover:border-indigo-300 transition-all">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    <span className="text-xs font-black text-slate-700">{formatDate(exp.aula)}</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-800 uppercase truncate tracking-tight">{exp.estudante}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{exp.curso}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1">
                      <Tag className="w-2 h-2" /> {exp.unidade}
                    </div>
                    {(() => {
                      const escolaridade = formatEscolaridade(exp);
                      return escolaridade ? (
                        <div className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                          <GraduationCap className="w-2 h-2" /> {escolaridade}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate && onNavigate('experimental', { date: exp.aula })}
                  className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isProfessor ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100"><Users className="w-7 h-7" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meus Alunos</p><p className="text-4xl font-black text-slate-900 leading-none">{statsData.meusAlunosAtivos}</p></div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-100"><GraduationCap className="w-7 h-7" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Minhas Turmas</p><p className="text-4xl font-black text-slate-900 leading-none">{statsData.minhasTurmasAtivas}</p></div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100"><Target className="w-7 h-7" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversão {new Date().getFullYear()}</p><p className="text-4xl font-black text-slate-900 leading-none">{statsData.taxaConversao}%</p></div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100"><ClipboardCheck className="w-7 h-7" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registro em Dia</p><p className="text-4xl font-black text-slate-900 leading-none">{statsData.assiduidadeProfessor}%</p></div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100"><UserX className="w-7 h-7" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">% Cancelamentos</p><p className="text-4xl font-black text-slate-900 leading-none">{statsData.taxaCancelamento}%</p></div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100"><BarChart3 className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ocupação das Turmas</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Detalhamento nominal de vagas vs matrículas.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statsData.ocupacaoDetalhamento?.map((turma, idx) => (
                <div key={idx} className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-700 text-xs uppercase leading-tight max-w-[70%]">{turma.nome}</h4>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{turma.pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${turma.pct}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <span>{turma.count} MATRICULAS</span>
                    <span>{turma.cap} VAGAS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white"><Contact2 className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cadastrados</p><p className="text-3xl font-black text-slate-900 leading-none">{statsData.totalCadastrados}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><Users className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Alunos Ativos</p><p className="text-3xl font-black text-slate-900 leading-none">{statsData.alunosAtivos}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white"><ClipboardCheck className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Matrículas Ativas</p><p className="text-3xl font-black text-slate-900 leading-none">{statsData.matriculasAtivas}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white"><GraduationCap className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Turmas Ativas</p><p className="text-3xl font-black text-slate-900 leading-none">{statsData.turmasAtivas}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><Activity className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ocupação Média</p><p className="text-3xl font-black text-slate-900 leading-none">{statsData.ocupacaoMedia}%</p></div>
          </div>
        </div>
      )}

      {/* Alerta de Conversão de Leads - Apenas para Gestor Master e Administrativo */}
      {isPrivilegedUser && leadsParaConversao.length > 0 && (
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Zap className="w-6 h-6 fill-current" /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Conversão de Leads Pendente</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ações recomendadas para aulas experimentais concluídas.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {leadsParaConversao.map(lead => {
              const isPresente = lead.status === 'Presente';
              const escolaridade = formatEscolaridade(lead);
              return (
                <div key={lead.id} className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:border-blue-100">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xl shadow-sm border border-blue-100">
                      {lead.estudante.charAt(0)}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <h4 className="font-black text-slate-800 uppercase truncate text-lg tracking-tight">{lead.estudante}</h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                          <Calendar className="w-3 h-3 text-blue-500" /> {formatDate(lead.aula)}
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border flex items-center gap-1 shadow-sm ${getUnidadeStyle(lead.unidade)}`}>
                          <Tag className="w-2.5 h-2.5" /> {lead.unidade}
                        </div>
                        {/* Selo de Escolaridade IMEDIATAMENTE após a Unidade */}
                        {escolaridade && (
                          <div className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-tighter border border-blue-100 flex items-center gap-1 shadow-sm">
                            <GraduationCap className="w-2.5 h-2.5" /> {escolaridade}
                          </div>
                        )}
                        <div className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-tighter border border-indigo-100 flex items-center gap-1 shadow-sm">
                          <BookOpen className="w-2.5 h-2.5" /> {lead.curso}
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${isPresente ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {lead.status.toUpperCase()}
                        </div>
                      </div>
                      {lead.observacaoProfessor && (
                        <div className="p-3 bg-white/50 rounded-2xl border border-slate-100 mt-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Feedback do Professor</p>
                          <p className="text-xs font-medium text-slate-600 italic leading-relaxed">"{lead.observacaoProfessor}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => openComposeModal(lead)} 
                    className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 text-white ${
                      isPresente ? 'bg-[#10b981] hover:bg-[#059669]' : 'bg-[#f59e0b] hover:bg-[#d97706]'
                    }`}
                  >
                    {isPresente ? <MessageCircle className="w-5 h-5 fill-current" /> : <RotateCcw className="w-5 h-5" />}
                    {isPresente ? 'Feedback Whatsapp' : 'Propor Reagendamento'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-12 border border-slate-100">
            <h3 className="text-2xl font-black tracking-tight mb-8 uppercase text-slate-800">Disparo de WhatsApp</h3>
            <div className="mb-6 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidade de Canal</p>
              <p className="text-xs font-black text-blue-600 uppercase">{messageModal.identity?.nome || 'Padrão'}</p>
            </div>
            <textarea 
              value={messageModal.message} 
              onChange={(e) => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[32px] h-48 mb-10 font-medium text-sm outline-none resize-none shadow-inner focus:border-blue-500 transition-all" 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isSending} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-4 shadow-xl active:scale-95"
            >
              {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />} ENVIAR WHATSAPP
            </button>
            <button 
              onClick={() => setMessageModal({...messageModal, isOpen: false})} 
              className="w-full mt-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
