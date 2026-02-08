
import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Calendar, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  User, 
  Search, 
  Activity, 
  X, 
  Check, 
  BarChart, 
  LayoutGrid, 
  List, 
  MessageCircle, 
  Briefcase, 
  Target, 
  Zap, 
  TrendingUp, 
  Filter,
  FileText,
  Info,
  History,
  XCircle,
  FlaskConical,
  ArrowRight,
  TrendingDown,
  MessageSquare,
  BookOpen,
  DollarSign,
  Wallet,
  FileSpreadsheet,
  Coins,
  PieChart as PieIcon,
  TrendingUp as TrendingUpIcon,
  UserCheck,
  Mail,
  ArrowUpRight,
  BarChart3,
  Percent,
  ClipboardPaste,
  Clock,
  ArrowUpCircle,
  MinusCircle,
  MoveUpRight,
  MoveDownRight,
  RefreshCw as RefreshIcon
} from 'lucide-react';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { Aluno, Turma, Presenca, Matricula, AulaExperimental, Usuario, CursoCancelado } from '../types';

interface RelatoriosProps {
  alunos: Aluno[];
  turmas: Turma[];
  presencas: Presenca[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
  currentUser: Usuario;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const INICIO_AULAS_2026 = new Date(2026, 1, 2, 12, 0, 0); 

const Relatorios: React.FC<RelatoriosProps> = ({ alunos, turmas, presencas, matriculas = [], experimentais = [], currentUser }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'bi' | 'secretaria' | 'financeiro'>('geral');
  const [biSubTab, setBiSubTab] = useState<'frequencia' | 'conversao' | 'fluxo'>('frequencia');
  const [viewFinanceiro, setViewFinanceiro] = useState<'detalhado' | 'resumido'>('detalhado');
  const [biConvPeriodo, setBiConvPeriodo] = useState<'mensal' | 'anual' | 'total'>('total');
  const [biSelectedMonth, setBiSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Filtros BI Fluxo
  const [biFluxoInicio, setBiFluxoInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [biFluxoFim, setBiFluxoFim] = useState(() => new Date().toISOString().split('T')[0]);

  // Filtros Frequência
  const [filtroTurmaUnica, setFiltroTurmaUnica] = useState(''); 
  const [filtroAluno, setFiltroAluno] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Filtros Secretaria (Contatos)
  const [secretariaStatusFilter, setSecretariaStatusFilter] = useState<'todos' | 'ativos' | 'cancelados'>('todos');
  const [filtroCursosMulti, setFiltroCursosMulti] = useState<string[]>([]);
  const [isCourseFilterOpen, setIsCourseFilterOpen] = useState(false);
  const [searchContato, setSearchContato] = useState('');

  // Filtros Financeiro
  const [filtroMesFin, setFiltroMesFin] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filtroProfsMulti, setFiltroProfsMulti] = useState<string[]>([]);
  const [isProfFilterOpen, setIsProfFilterOpen] = useState(false);

  const isMaster = currentUser.nivel === 'Gestor Master';

  const sortedAlunos = useMemo(() => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome)), [alunos]);
  const sortedTurmas = useMemo(() => [...turmas].sort((a, b) => a.nome.localeCompare(b.nome)), [turmas]);

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).toString().trim().toLowerCase();
      
      // 1. Limpeza de ruídos como timestamps e frases relativas após vírgula
      if (s.includes(',')) s = s.split(',')[0].trim();

      // 2. ISO format YYYY-MM-DD
      const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]), 12, 0, 0);
      }

      const monthsMap: Record<string, number> = {
        'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
      };
      
      // 3. Formato extenso: "01 de fev. de 2026"
      if (s.includes(' de ')) {
        const cleanS = s.replace(/\./g, '');
        const parts = cleanS.split(/\s+/);
        const day = parseInt(parts[0]);
        const monthPart = parts.find(p => monthsMap[p.substring(0, 3)] !== undefined);
        const yearPart = parts.find(p => /^\d{4}$/.test(p));
        
        if (!isNaN(day) && monthPart && yearPart) {
           return new Date(parseInt(yearPart), monthsMap[monthPart.substring(0, 3)], day, 12, 0, 0);
        }
      }

      // 4. Formato tradicional DD/MM/YYYY
      const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dateMatch) {
        let y = parseInt(dateMatch[3]);
        if (y < 100) y += (y < 50 ? 2000 : 1900);
        return new Date(y, parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]), 12, 0, 0);
      }

      // 5. Fallback para Date padrão
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) { 
        d.setHours(12, 0, 0, 0); 
        return d; 
      }
    } catch(e) { return null; }
    return null;
  };

  const extractObservation = (obs: string | undefined, type: 'aula' | 'aluno') => {
    if (!obs) return '--';
    if (type === 'aula') {
      const match = obs.match(/\[Aula: (.*?)\]/);
      return match ? match[1] : (obs.includes('[Aluno:') ? '--' : obs);
    } else {
      const match = obs.match(/\[Aluno: (.*?)\]/);
      return match ? match[1] : (obs.includes('[Aula:') ? '--' : obs);
    }
  };

  // BI FLUXO DATA
  const biFluxoData = useMemo(() => {
    const start = parseToDate(biFluxoInicio);
    const end = parseToDate(biFluxoFim);
    if (!start || !end) return { resumo: {}, turmas: [] };

    // Set comparison timestamps
    const startTime = start.getTime();
    const endTime = end.getTime() + (24 * 60 * 60 * 1000) - 1; // End of day

    const turmasStats: Record<string, any> = {};
    sortedTurmas.forEach(t => {
      turmasStats[t.id] = { nome: t.nome, professor: t.professor, inicio: 0, novas: 0, canceladas: 0, fim: 0 };
    });

    alunos.forEach(aluno => {
      // 1. Matrículas Ativas Atuais
      const ativas = matriculas.filter(m => m.alunoId === aluno.id);
      ativas.forEach(m => {
        if (!turmasStats[m.turmaId]) return;
        const dMat = parseToDate(m.dataMatricula);
        if (!dMat) return;
        const dMatTime = dMat.getTime();

        // Ativa no início?
        if (dMatTime < startTime) turmasStats[m.turmaId].inicio++;
        
        // Nova no período?
        if (dMatTime >= startTime && dMatTime <= endTime) turmasStats[m.turmaId].novas++;

        // Ativa no fim?
        if (dMatTime <= endTime) turmasStats[m.turmaId].fim++;
      });

      // 2. Matrículas Canceladas
      const canceladas = aluno.cursosCanceladosDetalhes || [];
      canceladas.forEach(c => {
        const tId = sortedTurmas.find(t => t.nome === c.nome || t.id === c.nome)?.id || c.nome;
        if (!turmasStats[tId]) return;
        const dMat = parseToDate(c.dataMatricula);
        const dCanc = parseToDate(c.dataCancelamento);
        if (!dMat || !dCanc) return;
        const dMatTime = dMat.getTime();
        const dCancTime = dCanc.getTime();

        // Ativa no início? (Entrou antes e saiu depois ou durante o início)
        if (dMatTime < startTime && dCancTime >= startTime) turmasStats[tId].inicio++;

        // Nova no período?
        if (dMatTime >= startTime && dMatTime <= endTime) turmasStats[tId].novas++;

        // Cancelada no período?
        if (dCancTime >= startTime && dCancTime <= endTime) turmasStats[tId].canceladas++;

        // Ativa no fim? (Entrou antes/durante e só saiu após o período)
        if (dMatTime <= endTime && dCancTime > endTime) turmasStats[tId].fim++;
      });
    });

    const listaTurmas = Object.values(turmasStats).sort((a, b) => a.nome.localeCompare(b.nome));
    const resumo = listaTurmas.reduce((acc, curr) => {
      acc.inicio += curr.inicio;
      acc.novas += curr.novas;
      acc.canceladas += curr.canceladas;
      acc.fim += curr.fim;
      return acc;
    }, { inicio: 0, novas: 0, canceladas: 0, fim: 0 });

    return { resumo, turmas: listaTurmas };
  }, [alunos, sortedTurmas, matriculas, biFluxoInicio, biFluxoFim]);

  // Lógica de Contatos (Secretaria)
  const filteredContatos = useMemo(() => {
    return sortedAlunos.filter(aluno => {
      const matchesSearch = !searchContato || aluno.nome.toLowerCase().includes(searchContato.toLowerCase()) || (aluno.email && aluno.email.toLowerCase().includes(searchContato.toLowerCase()));
      const turmasDoAluno = matriculas.filter(m => m.alunoId === aluno.id).map(m => m.turmaId);
      const isAtivo = turmasDoAluno.length > 0;
      let matchesStatus = true;
      if (secretariaStatusFilter === 'ativos') matchesStatus = isAtivo;
      else if (secretariaStatusFilter === 'cancelados') matchesStatus = !isAtivo;
      let matchesCursos = true;
      if (filtroCursosMulti.length > 0) matchesCursos = turmasDoAluno.some(tId => filtroCursosMulti.includes(tId));
      return matchesSearch && matchesStatus && matchesCursos;
    });
  }, [sortedAlunos, searchContato, secretariaStatusFilter, filtroCursosMulti, matriculas]);

  const frequenciaData = useMemo(() => {
    if (filtroAluno) {
      return presencas
        .filter(p => p.alunoId === filtroAluno)
        .filter(p => (!dataInicio || p.data >= dataInicio) && (!dataFim || p.data <= dataFim))
        .map(p => {
          const t = turmas.find(turma => turma.id === p.turmaId);
          return { data: p.data, turma: t ? t.nome : p.turmaId, status: p.status, observacao: extractObservation(p.observacao, 'aluno') };
        })
        .sort((a, b) => b.data.localeCompare(a.data));
    }
    const groups: Record<string, any> = {};
    presencas.forEach(p => {
      if (filtroTurmaUnica && p.turmaId !== filtroTurmaUnica) return;
      if (dataInicio && p.data < dataInicio) return;
      if (dataFim && p.data > dataFim) return;
      const key = `${p.data}-${p.turmaId}`;
      if (!groups[key]) {
        const t = turmas.find(turma => turma.id === p.turmaId);
        groups[key] = { data: p.data, turma: t ? t.nome : p.turmaId, presencas: 0, ausencias: 0, observacao: extractObservation(p.observacao, 'aula') };
      }
      if (p.status === 'Presente') groups[key].presencas++;
      else groups[key].ausencias++;
    });
    return Object.values(groups).sort((a, b) => b.data.localeCompare(a.data));
  }, [presencas, turmas, filtroTurmaUnica, filtroAluno, dataInicio, dataFim]);

  const financialData = useMemo(() => {
    if (!filtroMesFin) return [];
    const [year, month] = filtroMesFin.split('-').map(Number);
    const alunoMatriculasNoMes: Record<string, number> = {};
    const professorReport: Record<string, any[]> = {};
    const cobrancasNoMes: any[] = [];
    alunos.forEach(aluno => {
      const ativas = matriculas.filter(m => m.alunoId === aluno.id);
      const canceladas = aluno.cursosCanceladosDetalhes || [];
      const todasMatriculas = [
        ...ativas.map(m => ({ ...m, dataCanc: null })),
        ...canceladas.map(c => ({ alunoId: aluno.id, turmaId: c.nome, dataMatricula: c.dataMatricula, dataCanc: c.dataCancelamento }))
      ];
      todasMatriculas.forEach(m => {
        const turma = turmas.find(t => t.id === m.turmaId || t.nome === m.turmaId);
        if (!turma) return;
        const dMatOriginal = parseToDate(m.dataMatricula);
        if (!dMatOriginal) return;
        const dMatEfetiva = dMatOriginal < INICIO_AULAS_2026 ? new Date(INICIO_AULAS_2026) : new Date(dMatOriginal);
        const dCanc = parseToDate(m.dataCanc);
        const billingDay = dMatEfetiva.getDate();
        const lastDayOfThisMonth = new Date(year, month, 0).getDate();
        const targetDay = Math.min(billingDay, lastDayOfThisMonth);
        const targetBillingDate = new Date(year, month - 1, targetDay, 12, 0, 0);
        if (dMatOriginal <= targetBillingDate && (!dCanc || dCanc >= targetBillingDate)) {
          alunoMatriculasNoMes[aluno.id] = (alunoMatriculasNoMes[aluno.id] || 0) + 1;
          cobrancasNoMes.push({ alunoObj: aluno, turmaObj: turma, valorBase: Number(turma.valorMensal) || 0 });
        }
      });
    });
    cobrancasNoMes.forEach(item => {
      const { alunoObj, turmaObj, valorBase } = item;
      const profName = turmaObj.professor || 'Sem Professor';
      if (filtroProfsMulti.length > 0 && !filtroProfsMulti.includes(profName)) return;
      let desconto = 0;
      let motivoDesconto = '--';
      if (alunoObj.plano?.toLowerCase().includes('integral')) {
        desconto = valorBase * 0.10; motivoDesconto = 'PLANO INTEGRAL';
      } else if (alunoMatriculasNoMes[alunoObj.id] > 1) {
        desconto = valorBase * 0.10; motivoDesconto = 'MULTI-MATRÍCULA';
      }
      if (!professorReport[profName]) professorReport[profName] = [];
      professorReport[profName].push({
        aluno: alunoObj.nome, curso: turmaObj.nome, valorBase: Number(valorBase) || 0,
        desconto: Number(desconto) || 0, motivoDesconto: motivoDesconto, valorPago: Number(valorBase) - (Number(desconto) || 0)
      });
    });
    return Object.entries(professorReport).map(([prof, items]) => {
      const sortedItems = [...items].sort((a, b) => { if (a.curso !== b.curso) return a.curso.localeCompare(b.curso); return a.aluno.localeCompare(b.aluno); });
      return { 
        professor: prof, 
        items: sortedItems, 
        totalLiquido: sortedItems.reduce((acc, curr) => acc + (Number(curr.valorPago) || 0), 0), 
        totalBruto: sortedItems.reduce((acc, curr) => acc + (Number(curr.valorBase) || 0), 0), 
        totalDesconto: sortedItems.reduce((acc, curr) => acc + (Number(curr.desconto) || 0), 0), 
        matriculasAtivas: sortedItems.length 
      };
    }).sort((a, b) => a.professor.localeCompare(b.professor));
  }, [alunos, turmas, matriculas, filtroMesFin, filtroProfsMulti]);

  const globalFinanceiro = useMemo(() => {
    let bruto = 0;
    let descontos = 0;
    let liquido = 0;
    let matriculasCount = 0;
    let descontosCount = 0;

    financialData.forEach(prof => {
      bruto += Number(prof.totalBruto) || 0;
      descontos += Number(prof.totalDesconto) || 0;
      liquido += Number(prof.totalLiquido) || 0;
      matriculasCount += prof.matriculasAtivas;
      
      prof.items.forEach((item: any) => {
        if (Number(item.desconto) > 0) descontosCount++;
      });
    });

    return { bruto, descontos, liquido, matriculas: matriculasCount, descontosCount };
  }, [financialData]);

  // BI Data
  const biConversaoData = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();

    const filteredExperimentais = experimentais.filter(exp => {
      const expDate = parseToDate(exp.aula);
      if (!expDate) return false;

      if (biConvPeriodo === 'mensal') {
        const [selYear, selMonth] = biSelectedMonth.split('-').map(Number);
        return expDate.getFullYear() === selYear && expDate.getMonth() === (selMonth - 1);
      } else if (biConvPeriodo === 'anual') {
        return expDate.getFullYear() === curYear;
      }
      return true; // total
    });

    const agendados = filteredExperimentais.length;
    const presentes = filteredExperimentais.filter(e => e.status === 'Presente').length;
    const followups = filteredExperimentais.filter(e => e.followUpSent).length;
    const matriculasCount = filteredExperimentais.filter(e => e.convertido).length;
    
    const taxaComparecimento = agendados > 0 ? Math.round((presentes / agendados) * 100) : 0;
    const taxaConversaoReal = presentes > 0 ? Math.round((matriculasCount / presentes) * 100) : 0;
    
    const chartMap: Record<string, { name: string, agendamentos: number, matriculas: number }> = {};
    filteredExperimentais.forEach(e => {
      const date = parseToDate(e.aula);
      if (!date) return;
      const monthStr = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      if (!chartMap[monthStr]) chartMap[monthStr] = { name: monthStr, agendamentos: 0, matriculas: 0 };
      chartMap[monthStr].agendamentos++;
      if (e.convertido) chartMap[monthStr].matriculas++;
    });

    return { 
      agendados, presentes, followups, matriculas: matriculasCount, 
      taxaComparecimento, taxaConversaoReal, 
      chartData: Object.values(chartMap).slice(-6)
    };
  }, [experimentais, biConvPeriodo, biSelectedMonth]);

  const biFrequenciaMensal = useMemo(() => {
    const months: Record<string, { presentes: number, ausentes: number }> = {};
    presencas.forEach(p => {
      const month = p.data.substring(0, 7);
      if (!months[month]) months[month] = { presentes: 0, ausentes: 0 };
      if (p.status === 'Presente') months[month].presentes++;
      else months[month].ausentes++;
    });
    return Object.entries(months).map(([name, data]) => ({
      name,
      perc: Math.round((data.presentes / (data.presentes + data.ausentes)) * 100)
    })).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);
  }, [presencas]);

  const formatCurrency = (val: number) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    
    if (activeTab === 'geral') {
      headers = ["Data", "Turma", "Presenças", "Ausências", "Freq %", "Obs"];
      frequenciaData.forEach(d => {
        const total = (d.presencas || 0) + (d.ausencias || 0);
        const perc = total > 0 ? Math.round((d.presencas / total) * 100) : 0;
        rows.push([d.data, d.turma, d.presencas, d.ausencias, `${perc}%`, d.observacao]);
      });
    } else if (activeTab === 'financeiro') {
      headers = ["Professor", "Estudante", "Curso", "Bruto", "Desconto", "Motivo", "Líquido"];
      financialData.forEach(p => p.items.forEach(i => rows.push([`"${p.professor}"`, `"${i.aluno}"`, `"${i.curso}"`, i.valorBase.toFixed(2), i.desconto.toFixed(2), `"${i.motivoDesconto}"`, i.valorPago.toFixed(2)])));
    } else if (activeTab === 'bi') {
      if (biSubTab === 'frequencia') {
        headers = ["Mês", "Frequência %"];
        biFrequenciaMensal.forEach(d => rows.push([d.name, `${d.perc}%`]));
      } else if (biSubTab === 'conversao') {
        headers = ["Etapa", "Quantidade"];
        rows.push(["Agendados", biConversaoData.agendados]);
        rows.push(["Presentes", biConversaoData.presentes]);
        rows.push(["Follow-ups", biConversaoData.followups]);
        rows.push(["Matrículas", biConversaoData.matriculas]);
      } else {
        headers = ["Turma", "Início", "Novas", "Canceladas", "Fim"];
        biFluxoData.turmas.forEach(t => rows.push([t.nome, t.inicio, t.novas, t.canceladas, t.fim]));
      }
    } else if (activeTab === 'secretaria') {
      headers = ["Estudante", "Status", "Responsável 1", "WhatsApp 1", "Responsável 2", "WhatsApp 2", "E-mail"];
      filteredContatos.forEach(aluno => {
        const isAtivo = matriculas.some(m => m.alunoId === aluno.id);
        rows.push([
          `"${aluno.nome}"`, 
          isAtivo ? "Ativo" : "Cancelado", 
          `"${aluno.responsavel1 || ''}"`, 
          `"${aluno.whatsapp1 || ''}"`, 
          `"${aluno.responsavel2 || ''}"`, 
          `"${aluno.whatsapp2 || ''}"`, 
          `"${aluno.email || ''}"`
        ]);
      });
    }

    const csvContent = ["\ufeff" + headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${activeTab}_${new Date().getTime()}.csv`;
    link.click();
  };

  const toggleCursoMulti = (id: string) => {
    setFiltroCursosMulti(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painéis de Inteligência B+</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <button onClick={() => setActiveTab('geral')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FREQUÊNCIA</button>
            {isMaster && <button onClick={() => setActiveTab('financeiro')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'financeiro' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FINANCEIRO</button>}
            <button onClick={() => setActiveTab('bi')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO ESTRATÉGICA (BI)</button>
            <button onClick={() => setActiveTab('secretaria')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>CONTATOS</button>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black transition-all shadow-lg hover:bg-slate-800 active:scale-95"><Download className="w-5 h-5" /> Exportar Planilha</button>
      </div>

      {activeTab === 'bi' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                <button onClick={() => setBiSubTab('frequencia')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${biSubTab === 'frequencia' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Activity className="w-4 h-4" /> Frequência</button>
                <button onClick={() => setBiSubTab('conversao')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${biSubTab === 'conversao' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Target className="w-4 h-4" /> Conversão</button>
                <button onClick={() => setBiSubTab('fluxo')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${biSubTab === 'fluxo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><RefreshIcon className="w-4 h-4" /> Fluxo Matrículas</button>
              </div>

              {biSubTab === 'conversao' && (
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit items-center gap-1">
                  <div className={`relative flex items-center transition-all rounded-xl ${biConvPeriodo === 'mensal' ? 'bg-blue-600' : ''}`}>
                    <button 
                      onClick={() => setBiConvPeriodo('mensal')} 
                      className={`flex items-center gap-2 px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all ${biConvPeriodo === 'mensal' ? 'text-white' : 'text-slate-400'}`}
                    >
                      {biConvPeriodo === 'mensal' ? (biSelectedMonth.split('-').reverse().join('/')) : 'Mensal'}
                    </button>
                    {biConvPeriodo === 'mensal' && (
                      <input 
                        type="month" 
                        value={biSelectedMonth}
                        onChange={(e) => setBiSelectedMonth(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                  <button onClick={() => setBiConvPeriodo('anual')} className={`flex items-center gap-2 px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all ${biConvPeriodo === 'anual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>Anual</button>
                  <button onClick={() => setBiConvPeriodo('total')} className={`flex items-center gap-2 px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all ${biConvPeriodo === 'total' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>Total</button>
                </div>
              )}

              {biSubTab === 'fluxo' && (
                <div className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Início</label>
                    <input type="date" value={biFluxoInicio} onChange={(e) => setBiFluxoInicio(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fim</label>
                    <input type="date" value={biFluxoFim} onChange={(e) => setBiFluxoFim(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}
           </div>

           {biSubTab === 'frequencia' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2"><TrendingUpIcon className="w-4 h-4 text-blue-500" /> Tendência de Frequência (%)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={biFrequenciaMensal}>
                        <defs>
                          <linearGradient id="colorPerc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="perc" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorPerc)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="p-6 bg-blue-50 rounded-full mb-4">
                    <PieIcon className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Frequência Geral</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase mt-1">Média dos últimos 6 meses</p>
                  <p className="text-6xl font-black text-blue-600 mt-6">{biFrequenciaMensal.length > 0 ? biFrequenciaMensal[biFrequenciaMensal.length-1].perc : 0}%</p>
               </div>
             </div>
           )}

           {biSubTab === 'conversao' && (
             <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AGENDAMENTOS</p>
                   <p className="text-5xl font-black text-slate-900 tracking-tighter">{biConversaoData.agendados}</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                     <FlaskConical className="w-3.5 h-3.5" /> Total {biConvPeriodo === 'mensal' ? biSelectedMonth.split('-').reverse().join('/') : biConvPeriodo}
                   </div>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TAXA COMPARECIMENTO</p>
                   <p className="text-5xl font-black text-blue-600 tracking-tighter">{biConversaoData.taxaComparecimento}%</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                     <Users className="w-3.5 h-3.5" /> {biConversaoData.presentes} Estudantes
                   </div>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CONVERSÃO REAL</p>
                   <p className="text-5xl font-black text-emerald-500 tracking-tighter">{biConversaoData.taxaConversaoReal}%</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                     <UserCheck className="w-3.5 h-3.5" /> {biConversaoData.matriculas} Matrículas
                   </div>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CAC EXPERIMENTAL</p>
                   <p className="text-5xl font-black text-slate-300 tracking-tighter">--</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                     Custo por Matrícula
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-3 mb-10">
                     <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600"><BarChart3 className="w-5 h-5" /></div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">FUNIL DE CONVERSÃO</h3>
                   </div>
                   <div className="space-y-6">
                      {[
                        { label: 'Agendados', value: biConversaoData.agendados, total: biConversaoData.agendados, color: 'bg-[#9333ea]' },
                        { label: 'Presentes', value: biConversaoData.presentes, total: biConversaoData.agendados, color: 'bg-[#6366f1]' },
                        { label: 'Follow-ups', value: biConversaoData.followups, total: biConversaoData.agendados, color: 'bg-[#3b82f6]' },
                        { label: 'Matrículas', value: biConversaoData.matriculas, total: biConversaoData.agendados, color: 'bg-[#10b981]' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-6 group">
                          <span className="w-24 text-[11px] font-black text-slate-400 uppercase text-right leading-none">{item.label}</span>
                          <div className="flex-1 h-12 bg-slate-50 rounded-xl overflow-hidden relative">
                             <div 
                               className={`h-full ${item.color} transition-all duration-1000 ease-out flex items-center justify-end pr-4 text-white font-black text-xs`}
                               style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                             >
                               {item.value}
                             </div>
                          </div>
                        </div>
                      ))}
                   </div>
                 </div>

                 <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-10">
                      <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUpIcon className="w-5 h-5" /></div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">AGENDAMENTOS VS MATRÍCULAS</h3>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={biConversaoData.chartData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                           <YAxis hide />
                           <Tooltip />
                           <Bar dataKey="matriculas" barSize={30} fill="#10b981" radius={[8, 8, 0, 0]} />
                           <Line type="monotone" dataKey="agendamentos" stroke="#9333ea" strokeWidth={4} dot={{r: 5, fill: '#fff', strokeWidth: 3, stroke: '#9333ea'}} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
               </div>
             </div>
           )}

           {/* NOVO BI: FLUXO DE MATRÍCULAS */}
           {biSubTab === 'fluxo' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Cards de Fluxo */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ATIVAS NO INÍCIO</p>
                    <p className="text-5xl font-black text-slate-800 tracking-tighter">{biFluxoData.resumo.inicio}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <History className="w-3.5 h-3.5" /> Posicionamento em {new Date(biFluxoInicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">NOVAS MATRÍCULAS</p>
                    <p className="text-5xl font-black text-emerald-600 tracking-tighter">+{biFluxoData.resumo.novas}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      <MoveUpRight className="w-3.5 h-3.5" /> Entradas no Período
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">CANCELAMENTOS</p>
                    <p className="text-5xl font-black text-red-500 tracking-tighter">-{biFluxoData.resumo.canceladas}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                      <MoveDownRight className="w-3.5 h-3.5" /> Saídas no Período
                    </div>
                  </div>
                  <div className="bg-blue-600 p-8 rounded-[32px] shadow-xl shadow-blue-600/20 relative overflow-hidden text-white">
                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">ATIVAS NO FIM</p>
                    <p className="text-5xl font-black text-white tracking-tighter">{biFluxoData.resumo.fim}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-100 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Posicionamento em {new Date(biFluxoFim + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
               </div>

               {/* Tabela de Detalhamento por Turma */}
               <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                 <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-xl"><GraduationCap className="w-5 h-5" /></div>
                      <h3 className="font-black text-lg uppercase tracking-tight">Evolução por Turma (A-Z)</h3>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Total de {biFluxoData.turmas.length} Cursos</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-8 py-5">Turma / Modalidade</th>
                          <th className="px-8 py-5 text-center">Ativas Início</th>
                          <th className="px-8 py-5 text-center text-emerald-600">Novas (+)</th>
                          <th className="px-8 py-5 text-center text-red-500">Canc. (-)</th>
                          <th className="px-8 py-5 text-center bg-blue-50/50">Ativas Fim</th>
                          <th className="px-8 py-5 text-right">Evolução %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {biFluxoData.turmas.map((t, idx) => {
                          const evolucao = t.inicio > 0 ? Math.round(((t.fim - t.inicio) / t.inicio) * 100) : (t.novas > 0 ? 100 : 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-5">
                                <p className="font-bold text-slate-800 uppercase text-xs">{t.nome}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{t.professor}</p>
                              </td>
                              <td className="px-8 py-5 text-center font-bold text-slate-600">{t.inicio}</td>
                              <td className="px-8 py-5 text-center font-black text-emerald-500">+{t.novas}</td>
                              <td className="px-8 py-5 text-center font-black text-red-400">-{t.canceladas}</td>
                              <td className="px-8 py-5 text-center font-black text-blue-600 bg-blue-50/20">{t.fim}</td>
                              <td className="px-8 py-5 text-right">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${evolucao > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : evolucao < 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                  {evolucao > 0 ? `+${evolucao}%` : `${evolucao}%`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                 </div>
               </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'secretaria' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Filtros Secretaria */}
           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><Search className="w-3 h-3" /> Buscar Estudante</label>
                <input type="text" value={searchContato} onChange={(e) => setSearchContato(e.target.value)} placeholder="Nome ou E-mail..." className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><Filter className="w-3 h-3" /> Status do Contato</label>
                <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-slate-100">
                  <button onClick={() => setSecretariaStatusFilter('todos')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${secretariaStatusFilter === 'todos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Todos</button>
                  <button onClick={() => setSecretariaStatusFilter('ativos')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${secretariaStatusFilter === 'ativos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                  <button onClick={() => setSecretariaStatusFilter('cancelados')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${secretariaStatusFilter === 'cancelados' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Cancelados</button>
                </div>
              </div>
              <div className="relative md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><GraduationCap className="w-3 h-3" /> Filtro por Cursos (Multi)</label>
                <div onClick={() => setIsCourseFilterOpen(!isCourseFilterOpen)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 flex flex-wrap gap-1 cursor-pointer min-h-[52px]">
                   {filtroCursosMulti.length === 0 ? <span className="text-slate-400 font-bold text-[10px] uppercase">Selecione Cursos</span> : 
                     filtroCursosMulti.map(cId => (<span key={cId} className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">{cId.substring(0, 10)}... <X className="w-2.5 h-2.5" onClick={(e) => { e.stopPropagation(); toggleCursoMulti(cId); }} /></span>))
                   }
                </div>
                {isCourseFilterOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-3 space-y-1">
                    {sortedTurmas.map(turma => (
                      <div key={turma.id} onClick={() => toggleCursoMulti(turma.id)} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                        <span className="text-[10px] font-black text-slate-700 uppercase">{turma.nome}</span>
                        {filtroCursosMulti.includes(turma.id) && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredContatos.map(aluno => {
                const turmasAtivas = matriculas.filter(m => m.alunoId === aluno.id);
                return (
                  <div key={aluno.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6 group hover:shadow-lg transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">{aluno.nome.charAt(0)}</div>
                       <div className="flex-1 min-w-0">
                          <h3 className="font-black text-slate-800 truncate uppercase tracking-tight">{aluno.nome}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                             {turmasAtivas.length > 0 ? turmasAtivas.map(m => (
                               <span key={m.id} className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{m.turmaId}</span>
                             )) : <span className="text-[8px] font-black bg-red-50 text-red-400 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-widest">Inativo / Cancelado</span>}
                          </div>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><User className="w-2 h-2" /> Responsável 1</p>
                          <p className="text-[10px] font-bold text-slate-700 truncate">{aluno.responsavel1 || '--'}</p>
                          <p className="text-[10px] font-black text-green-600 flex items-center gap-1.5 mt-1"><MessageCircle className="w-3 h-3" /> {aluno.whatsapp1 || '--'}</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><User className="w-2 h-2" /> Responsável 2</p>
                          <p className="text-[10px] font-bold text-slate-700 truncate">{aluno.responsavel2 || '--'}</p>
                          <p className="text-[10px] font-black text-green-600 flex items-center gap-1.5 mt-1"><MessageCircle className="w-3 h-3" /> {aluno.whatsapp2 || '--'}</p>
                       </div>
                    </div>
                    
                    <div className="pt-2">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Mail className="w-2 h-2" /> E-mail de Contato</p>
                       <p className="text-[10px] font-bold text-blue-600 truncate">{aluno.email || '--'}</p>
                    </div>
                  </div>
                );
              })}
           </div>
           {filteredContatos.length === 0 && (
             <div className="p-20 text-center"><p className="text-slate-400 font-bold italic">Nenhum estudante encontrado com estes filtros.</p></div>
           )}
        </div>
      )}

      {activeTab === 'financeiro' && isMaster && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col md:flex-row items-end gap-6 w-full md:w-auto">
                <div className="w-full md:w-auto min-w-[200px]">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Competência do Pagamento</label>
                  <input type="month" value={filtroMesFin} onChange={(e) => setFiltroMesFin(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
                </div>
                <div className="relative w-full md:w-[260px]">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><User className="w-3 h-3" /> Professores</label>
                  <div onClick={() => setIsProfFilterOpen(!isProfFilterOpen)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 flex flex-wrap gap-1 cursor-pointer min-h-[52px]">
                    {filtroProfsMulti.length === 0 ? <span className="text-slate-400 font-bold text-xs">Todos os Professores</span> : 
                      filtroProfsMulti.map(p => (<span key={p} className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">{p.split(' ')[0]} <X className="w-2.5 h-2.5" onClick={(e) => { e.stopPropagation(); setFiltroProfsMulti(prev => prev.filter(x => x !== p)); }} /></span>))
                    }
                  </div>
                  {isProfFilterOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-3 space-y-1">
                      {sortedTurmas.reduce((acc: string[], curr) => { if (curr.professor && !acc.includes(curr.professor)) acc.push(curr.professor); return acc; }, []).sort().map(prof => (
                        <div key={prof} onClick={() => { setFiltroProfsMulti(prev => prev.includes(prof) ? prev.filter(x => x !== prof) : [...prev, prof]); setIsProfFilterOpen(false); }} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                          <span className="text-xs font-bold text-slate-700">{prof}</span>
                          {filtroProfsMulti.includes(prof) && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl h-[52px] items-center">
                  <button onClick={() => setViewFinanceiro('resumido')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewFinanceiro === 'resumido' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /> Resumo</button>
                  <button onClick={() => setViewFinanceiro('detalhado')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewFinanceiro === 'detalhado' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><List className="w-4 h-4" /> Detalhado</button>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">RECEITA BRUTA TOTAL</p>
                 <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(globalFinanceiro.bruto)}</p>
                 <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                   <ClipboardPaste className="w-3.5 h-3.5" /> {globalFinanceiro.matriculas} Mensalidades
                 </p>
              </div>
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL DE DESCONTOS</p>
                 <p className="text-4xl font-black text-red-500 tracking-tighter">{formatCurrency(globalFinanceiro.descontos)}</p>
                 <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                   <TrendingDown className="w-3.5 h-3.5" /> {globalFinanceiro.descontosCount} Descontos Aplicados
                 </p>
              </div>
              <div className="bg-blue-600 p-8 rounded-[40px] shadow-2xl shadow-blue-500/30 relative overflow-hidden text-white">
                 <p className="text-[11px] font-black text-blue-200 uppercase tracking-widest mb-1">RECEITA LÍQUIDA ESTIMADA</p>
                 <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(globalFinanceiro.liquido)}</p>
                 <p className="text-[10px] font-bold text-blue-200 mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                   Faturamento Líquido Estimado
                 </p>
              </div>
           </div>

           {viewFinanceiro === 'resumido' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
               {financialData.map((prof) => (
                  <div key={prof.professor} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:border-blue-300 transition-all border-b-8 border-b-slate-100 hover:border-b-blue-500">
                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform"><User className="w-8 h-8" /></div>
                    <h3 className="font-black text-xl uppercase tracking-tight text-slate-800 truncate w-full">{prof.professor}</h3>
                    <div className="w-full space-y-3 mt-6 mb-2">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>Bruto</span><span className="text-slate-600">{formatCurrency(prof.totalBruto)}</span></div>
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 mt-1 pb-2 border-b border-slate-100">
                         <span>Mensalidades</span>
                         <span className="text-blue-600 font-black">{prof.matriculasAtivas}</span>
                       </div>
                       <p className="text-3xl font-black text-blue-600 pt-2">{formatCurrency(prof.totalLiquido)}</p>
                    </div>
                  </div>
               ))}
             </div>
           ) : (
             <div className="space-y-8">
              {financialData.map((prof) => (
                <div key={prof.professor} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                   <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-500 rounded-2xl"><User className="w-6 h-6 text-white" /></div>
                        <div>
                          <h3 className="font-black text-xl uppercase tracking-tight leading-none">{prof.professor}</h3>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{prof.matriculasAtivas} Mensalidades pagas no Mês</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total do Professor</p>
                        <p className="text-3xl font-black text-blue-400 leading-none">{formatCurrency(prof.totalLiquido)}</p>
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-8 py-4">Estudante</th>
                            <th className="px-8 py-4">Curso</th>
                            <th className="px-8 py-4 text-right">Bruto</th>
                            <th className="px-8 py-4 text-right">Desc.</th>
                            <th className="px-8 py-4">Motivo</th>
                            <th className="px-8 py-4 text-right">Líquido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {prof.items.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-4 font-bold text-slate-800">{item.aluno}</td>
                              <td className="px-8 py-4 text-sm font-medium text-slate-500 uppercase">{item.curso}</td>
                              <td className="px-8 py-4 text-right font-bold text-slate-400">{formatCurrency(item.valorBase)}</td>
                              <td className="px-8 py-4 text-right font-bold text-red-400">-{formatCurrency(item.desconto)}</td>
                              <td className="px-8 py-4"><span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-slate-100 text-slate-400">{item.motivoDesconto}</span></td>
                              <td className="px-8 py-4 text-right font-black text-blue-600 bg-blue-50/20">{formatCurrency(item.valorPago)}</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                </div>
              ))}
             </div>
           )}
        </div>
      )}

      {activeTab === 'geral' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><User className="w-3 h-3" /> Estudante</label>
                <select value={filtroAluno} onChange={(e) => { setFiltroAluno(e.target.value); if(e.target.value) setFiltroTurmaUnica(''); }} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500">
                  <option value="">Todos os Estudantes (A-Z)</option>
                  {sortedAlunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><GraduationCap className="w-3 h-3" /> Turma</label>
                <select value={filtroTurmaUnica} onChange={(e) => { setFiltroTurmaUnica(e.target.value); if(e.target.value) setFiltroAluno(''); }} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500">
                  <option value="">Todas as Turmas (A-Z)</option>
                  {sortedTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Início</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Fim</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">
                    <th className="px-8 py-6">Data da Aula</th>
                    <th className="px-8 py-6">Turma</th>
                    {filtroAluno ? (
                      <>
                        <th className="px-8 py-6">Status</th>
                        <th className="px-8 py-6">Obs</th>
                      </>
                    ) : (
                      <>
                        <th className="px-8 py-6 text-center">P</th>
                        <th className="px-8 py-6 text-center">F</th>
                        <th className="px-8 py-6 text-center">%</th>
                        {filtroTurmaUnica && <th className="px-8 py-6">Obs Aula</th>}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {frequenciaData.map((item, idx) => {
                    if (filtroAluno) {
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-5 text-xs font-bold text-slate-700">{parseToDate(item.data)?.toLocaleDateString('pt-BR')}</td>
                          <td className="px-8 py-5 text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase">{item.turma}</td>
                          <td className="px-8 py-5">
                             <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${item.status === 'Presente' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{item.status}</span>
                          </td>
                          <td className="px-8 py-5 text-[10px] text-slate-500 font-medium italic">{item.observacao}</td>
                        </tr>
                      );
                    }
                    const total = (item.presencas || 0) + (item.ausencias || 0);
                    const perc = total > 0 ? Math.round((item.presencas / total) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 text-xs font-bold text-slate-700">{parseToDate(item.data)?.toLocaleDateString('pt-BR')}</td>
                        <td className="px-8 py-5 text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase">{item.turma}</td>
                        <td className="px-8 py-5 text-center font-black text-slate-700">{item.presencas}</td>
                        <td className="px-8 py-5 text-center font-black text-red-400">{item.ausencias}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-[10px] font-black text-slate-800">{perc}%</span>
                          </div>
                        </td>
                        {filtroTurmaUnica && <td className="px-8 py-5 text-[10px] text-slate-500 font-medium italic">{item.observacao}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
