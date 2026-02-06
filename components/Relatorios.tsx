
import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  User, 
  Search, 
  History, 
  XCircle, 
  Info, 
  BarChart3, 
  PieChart as PieIcon,
  Contact2,
  Mail, 
  Phone,
  UserCheck,
  UserX,
  ClipboardList,
  ChevronDown,
  Check,
  TrendingUp,
  FlaskConical,
  Target,
  Zap,
  ArrowRight,
  TrendingDown,
  Activity,
  X,
  MousePointerClick,
  BarChart,
  BarChart as BarChartIcon,
  Layers,
  MessageSquare,
  BookOpen
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
  LabelList,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { Aluno, Turma, Presenca, Matricula, AulaExperimental } from '../types';

interface RelatoriosProps {
  alunos: Aluno[];
  turmas: Turma[];
  presencas: Presenca[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const Relatorios: React.FC<RelatoriosProps> = ({ alunos, turmas, presencas, matriculas = [], experimentais = [] }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'bi' | 'secretaria'>('geral');
  const [biSubTab, setBiSubTab] = useState<'frequencia' | 'conversao'>('frequencia');
  const [filtroTurmaUnica, setFiltroTurmaUnica] = useState(''); 
  const [filtroTurmasMulti, setFiltroTurmasMulti] = useState<string[]>([]); 
  const [filtroAluno, setFiltroAluno] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'cancelados' | 'leads'>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '') return null;
    let s = String(dateVal).trim().toLowerCase();
    const months: Record<string, number> = {
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
      'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
    };
    if (s.includes(' de ')) {
      const parts = s.split(/\s+de\s+|\s+|,/);
      const day = parseInt(parts[0]);
      const monthName = parts[1].replace('.', '').substring(0, 3);
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(year) && months[monthName] !== undefined) return new Date(year, months[monthName], day);
    }
    const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dateMatch) {
      const d = parseInt(dateMatch[1]);
      const m = parseInt(dateMatch[2]);
      let y = parseInt(dateMatch[3]);
      if (y < 100) y += (y < 50 ? 2000 : 1900);
      return new Date(y, m - 1, d);
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDisplayDate = (dateVal: any) => {
    const d = parseToDate(dateVal);
    if (!d) return '--/--/--';
    return d.toLocaleDateString('pt-BR');
  };

  const presencasFiltradas = useMemo(() => {
    let filtered = presencas;
    if (filtroTurmaUnica) filtered = filtered.filter(p => p.turmaId === filtroTurmaUnica);
    if (filtroAluno) filtered = filtered.filter(p => p.alunoId === filtroAluno);
    if (dataInicio) filtered = filtered.filter(p => p.data >= dataInicio);
    if (dataFim) filtered = filtered.filter(p => p.data <= dataFim);
    return filtered;
  }, [presencas, filtroTurmaUnica, filtroAluno, dataInicio, dataFim]);

  const statsGerais = useMemo(() => {
    // CASO 1: Filtro de Aluno (Histórico detalhado do estudante)
    if (filtroAluno) {
      return presencasFiltradas
        .sort((a, b) => b.data.localeCompare(a.data))
        .map(p => ({
          type: 'aluno-detalhe',
          id: p.id,
          data: p.data,
          status: p.status,
          observacao: p.observacao,
          turma: turmas.find(t => t.id === p.turmaId)?.nome || p.turmaId
        }));
    }

    // CASO 2: Filtro de Turma (Histórico detalhado da Turma por Data)
    if (filtroTurmaUnica) {
      const groupedByDate: Record<string, { presentes: number, ausentes: number, obs: string }> = {};
      
      presencasFiltradas.forEach(p => {
        if (!groupedByDate[p.data]) {
          groupedByDate[p.data] = { presentes: 0, ausentes: 0, obs: '' };
        }
        if (p.status === 'Presente') groupedByDate[p.data].presentes++;
        else groupedByDate[p.data].ausentes++;

        // Extrai a observação da aula se houver no padrão [Aula: ...]
        if (p.observacao && p.observacao.includes('[Aula:')) {
          const match = p.observacao.match(/\[Aula:\s*(.*?)\]/);
          if (match && match[1] && !groupedByDate[p.data].obs.includes(match[1])) {
            groupedByDate[p.data].obs = match[1];
          }
        }
      });

      return Object.entries(groupedByDate)
        .map(([data, stats]) => ({
          type: 'turma-detalhe',
          id: data,
          data,
          presentes: stats.presentes,
          ausentes: stats.ausentes,
          observacao: stats.obs
        }))
        .sort((a, b) => b.data.localeCompare(a.data));
    }

    // CASO 3: Resumo Geral (Todos os alunos em ordem alfabética)
    const stats: Record<string, { total: number; presencas: number }> = {};
    presencasFiltradas.forEach(p => {
      if (!stats[p.alunoId]) stats[p.alunoId] = { total: 0, presencas: 0 };
      stats[p.alunoId].total += 1;
      if (p.status === 'Presente') stats[p.alunoId].presencas += 1;
    });

    return Object.entries(stats).map(([alunoId, val]) => {
      const aluno = alunos.find(a => a.id === alunoId) || { nome: alunoId.replace(/_/g, ' ') };
      return {
        type: 'resumo-aluno',
        id: alunoId,
        nome: aluno.nome,
        total: val.total,
        presencas: val.presencas,
        percentual: Math.round((val.presencas / val.total) * 100)
      };
    }).sort((a: any, b: any) => a.nome.localeCompare(b.nome)); 
  }, [presencasFiltradas, filtroAluno, filtroTurmaUnica, alunos, turmas]);

  const sortedAlunos = useMemo(() => {
    return [...alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos]);

  // BI FREQUÊNCIA
  const biFreqData = useMemo(() => {
    const turmaStats: Record<string, { t: number, p: number }> = {};
    presencas.forEach(p => {
      if (!turmaStats[p.turmaId]) turmaStats[p.turmaId] = { t: 0, p: 0 };
      turmaStats[p.turmaId].t++;
      if (p.status === 'Presente') turmaStats[p.turmaId].p++;
    });
    
    return Object.entries(turmaStats)
      .map(([name, val]) => ({ 
        name, 
        value: Math.round((val.p / val.t) * 100),
        raw: val.t
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [presencas]);

  // BI CONVERSÃO EXPERIMENTAL
  const biConversaoData = useMemo(() => {
    const total = experimentais.length;
    const presentes = experimentais.filter(e => e.status === 'Presente').length;
    const followUps = experimentais.filter(e => e.followUpSent && e.status === 'Presente').length;
    const matriculados = experimentais.filter(e => e.convertido).length;

    const funnelData = [
      { name: 'Agendados', value: total, fill: '#8b5cf6' },
      { name: 'Presentes', value: presentes, fill: '#6366f1' },
      { name: 'Follow-ups', value: followUps, fill: '#3b82f6' },
      { name: 'Matrículas', value: matriculados, fill: '#10b981' }
    ];

    // Por Curso
    const cursosMap: Record<string, { t: number, c: number }> = {};
    experimentais.forEach(e => {
      if (!cursosMap[e.curso]) cursosMap[e.curso] = { t: 0, c: 0 };
      cursosMap[e.curso].t++;
      if (e.convertido) cursosMap[e.curso].c++;
    });

    const porCurso = Object.entries(cursosMap)
      .map(([name, val]) => ({
        name,
        total: val.t,
        convertidos: val.c,
        taxa: val.t > 0 ? Math.round((val.c / val.t) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Tendência Mensal
    const tendMap: Record<string, { a: number, c: number }> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    experimentais.forEach(e => {
      const date = parseToDate(e.aula);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        if (!tendMap[key]) tendMap[key] = { a: 0, c: 0 };
        tendMap[key].a++;
        if (e.convertido) tendMap[key].c++;
      }
    });

    const tendencia = Object.entries(tendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => {
        const [year, month] = key.split('-');
        return {
          month: `${monthNames[parseInt(month)]}/${year.slice(-2)}`,
          agendados: val.a,
          matriculas: val.c
        };
      }).slice(-6);

    return { funnelData, porCurso, tendencia, total, presentes, matriculados };
  }, [experimentais]);

  const monthlyTrend = useMemo(() => {
    const months: Record<string, { t: number, p: number }> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    presencas.forEach(p => {
      const date = parseToDate(p.data);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        if (!months[key]) months[key] = { t: 0, p: 0 };
        months[key].t++;
        if (p.status === 'Presente') months[key].p++;
      }
    });

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => {
        const [year, month] = key.split('-');
        return {
          month: `${monthNames[parseInt(month)]}/${year.slice(-2)}`,
          frequencia: Math.round((val.p / val.t) * 100)
        };
      }).slice(-6);
  }, [presencas]);

  const listaSecretaria = useMemo(() => {
    return alunos.filter(aluno => {
      const matsAluno = matriculas.filter(m => m.alunoId === aluno.id);
      const isAtivo = matsAluno.length > 0;
      const isLead = aluno.statusMatricula === 'Lead Qualificado' || !!aluno.isLead;
      const isCancelado = !isAtivo && !isLead && (aluno.statusMatricula === 'Cancelado' || (aluno.cursosCanceladosDetalhes && aluno.cursosCanceladosDetalhes.length > 0));

      if (filtroStatus === 'ativos' && !isAtivo) return false;
      if (filtroStatus === 'leads' && !isLead) return false;
      if (filtroStatus === 'cancelados' && !isCancelado) return false;

      if (filtroTurmasMulti.length > 0) {
        const matriculadoNasTurmasSelecionadas = matsAluno.some(m => filtroTurmasMulti.includes(m.turmaId));
        if (!matriculadoNasTurmasSelecionadas) return false;
      }

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, matriculas, filtroStatus, filtroTurmasMulti]);

  const toggleTurmaMulti = (id: string) => {
    setFiltroTurmasMulti(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let fileName = `relatorio_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'geral') {
      if (filtroAluno) {
        headers = ["Data", "Turma", "Status", "Observacao"];
        rows = (statsGerais as any[]).map(item => [formatDisplayDate(item.data), `"${item.turma}"`, item.status, `"${item.observacao || ''}"`]);
      } else if (filtroTurmaUnica) {
        headers = ["Data da Aula", "Presenças", "Ausências", "Observação da Aula"];
        rows = (statsGerais as any[]).map(item => [formatDisplayDate(item.data), item.presentes, item.ausentes, `"${item.observacao || ''}"`]);
      } else {
        headers = ["Aluno", "Registros", "Presenças", "% Frequência"];
        rows = (statsGerais as any[]).map(item => [`"${item.nome}"`, item.total, item.presencas, `${item.percentual}%`]);
      }
    } else if (activeTab === 'secretaria') {
      headers = ["Estudante", "Responsavel 1", "WhatsApp 1", "Responsável 2", "WhatsApp 2", "Email"];
      rows = listaSecretaria.map(a => [
        `"${a.nome}"`, 
        `"${a.responsavel1 || ''}"`, 
        `"${a.whatsapp1 || ''}"`, 
        `"${a.responsavel2 || ''}"`, 
        `"${a.whatsapp2 || ''}"`, 
        `"${a.email || ''}"`
      ]);
    }

    if (rows.length === 0) return;
    const csvContent = ["\ufeff" + headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painéis de Inteligência</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <button onClick={() => setActiveTab('geral')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FREQUÊNCIA GERAL</button>
            <button onClick={() => setActiveTab('bi')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO ESTRATÉGICA (BI)</button>
            <button onClick={() => setActiveTab('secretaria')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>SECRETARIA</button>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black transition-all shadow-lg hover:bg-slate-800 active:scale-95">
          <Download className="w-5 h-5" /> Exportar Dados
        </button>
      </div>

      {activeTab === 'bi' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setBiSubTab('frequencia')} 
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 ${biSubTab === 'frequencia' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              <Activity className="w-4 h-4" /> BI Frequência
            </button>
            <button 
              onClick={() => setBiSubTab('conversao')} 
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 ${biSubTab === 'conversao' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
            >
              <Target className="w-4 h-4" /> BI Conversão
            </button>
          </div>

          {biSubTab === 'frequencia' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <BarChartIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Top Frequência por Turma</h3>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={biFreqData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="value" name="% Frequência" radius={[8, 8, 0, 0]}>
                          {biFreqData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Tendência Mensal Geral</h3>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrend} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorFreq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="frequencia" name="Frequência %" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorFreq)" />
                      </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agendamentos</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{biConversaoData.total}</p>
                  <div className="flex items-center gap-1 mt-2 text-purple-600 font-bold text-xs">
                    <FlaskConical className="w-3 h-3" /> Total Bruto
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa Comparecimento</p>
                  <p className="text-3xl font-black text-blue-600 mt-1">
                    {biConversaoData.total > 0 ? Math.round((biConversaoData.presentes / biConversaoData.total) * 100) : 0}%
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-blue-600 font-bold text-xs">
                    <Users className="w-3 h-3" /> {biConversaoData.presentes} Estudantes
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversão Real</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {biConversaoData.presentes > 0 ? Math.round((biConversaoData.matriculados / biConversaoData.presentes) * 100) : 0}%
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-emerald-600 font-bold text-xs">
                    <UserCheck className="w-3 h-3" /> {biConversaoData.matriculados} Matrículas
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CAC Experimental</p>
                  <p className="text-3xl font-black text-slate-400 mt-1">--</p>
                  <div className="flex items-center gap-1 mt-2 text-slate-400 font-bold text-[10px] uppercase">
                    Custo por Matrícula
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Funil de Conversão</h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart layout="vertical" data={biConversaoData.funnelData} margin={{ left: 20, right: 40 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                           <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 900, fill: '#1e293b' }} />
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Agendamentos vs Matrículas</h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={biConversaoData.tendencia}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        <Area type="monotone" dataKey="agendados" fill="#8b5cf6" fillOpacity={0.05} stroke="#8b5cf6" strokeWidth={2} />
                        <Bar dataKey="matriculas" barSize={20} fill="#10b981" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <MousePointerClick className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Conversão por Modalidade (Ranking)</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {biConversaoData.porCurso.map((item, i) => (
                        <div key={i} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-purple-200 transition-all">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{item.name}</p>
                           <div className="flex items-end justify-between mt-2">
                              <p className="text-2xl font-black text-slate-900">{item.taxa}%</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{item.convertidos}/{item.total} Matriculados</p>
                           </div>
                           <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                              <div className="h-full bg-purple-600 rounded-full group-hover:bg-purple-500 transition-all" style={{ width: `${item.taxa}%` }} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'geral' && (
        <>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Aluno</label>
              <select value={filtroAluno} onChange={(e) => { setFiltroAluno(e.target.value); if(e.target.value) setFiltroTurmaUnica(''); }} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                <option value="">Todos da Aba Frequência</option>
                {sortedAlunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Turma</label>
              <select value={filtroTurmaUnica} onChange={(e) => { setFiltroTurmaUnica(e.target.value); if(e.target.value) setFiltroAluno(''); }} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                <option value="">Todas as Turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold"/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold"/>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {filtroAluno ? <History className="w-5 h-5 text-blue-600" /> : filtroTurmaUnica ? <BookOpen className="w-5 h-5 text-blue-600" /> : <Activity className="w-5 h-5 text-blue-600" />}
                <span className="font-black text-slate-700 uppercase text-xs tracking-wider">
                  {filtroAluno ? 'Histórico Nominal Detalhado' : filtroTurmaUnica ? 'Histórico da Turma por Aula' : 'Histórico de Frequência'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-black uppercase">
                {filtroTurmaUnica ? `${statsGerais.length} Aulas Registradas` : `${presencasFiltradas.length} Registros`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  {filtroAluno ? (
                    <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100 bg-slate-50/50">
                      <th className="px-8 py-4">Data da Aula</th>
                      <th className="px-8 py-4">Turma/Curso</th>
                      <th className="px-8 py-4 text-center">Status</th>
                      <th className="px-8 py-4">Observação</th>
                    </tr>
                  ) : filtroTurmaUnica ? (
                    <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100 bg-slate-50/50">
                      <th className="px-8 py-4">Data da Aula</th>
                      <th className="px-8 py-4 text-center">Presenças</th>
                      <th className="px-8 py-4 text-center">Ausências</th>
                      <th className="px-8 py-4">Observação da Aula</th>
                    </tr>
                  ) : (
                    <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100 bg-slate-50/50">
                      <th className="px-8 py-4">Estudante</th>
                      <th className="px-8 py-4 text-center">Registros</th>
                      <th className="px-8 py-4 text-center">Presenças</th>
                      <th className="px-8 py-4">Frequência (%)</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statsGerais.map((item: any) => {
                    if (item.type === 'aluno-detalhe') {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-800">{formatDisplayDate(item.data)}</td>
                          <td className="px-8 py-4 text-sm font-medium text-slate-600">{item.turma}</td>
                          <td className="px-8 py-4 text-center">
                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                              item.status === 'Presente' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-8 py-4">
                             {item.observacao ? (
                               <div className="flex items-start gap-2 max-w-xs">
                                 <MessageSquare className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                                 <span className="text-xs text-slate-500 leading-relaxed">{item.observacao}</span>
                               </div>
                             ) : (
                               <span className="text-xs text-slate-300 italic">Sem obs.</span>
                             )}
                          </td>
                        </tr>
                      );
                    } else if (item.type === 'turma-detalhe') {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-800">{formatDisplayDate(item.data)}</td>
                          <td className="px-8 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-black text-xs border border-green-100">{item.presentes}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase">Presentes</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-black text-xs border border-red-100">{item.ausentes}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase">Ausentes</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            {item.observacao ? (
                               <div className="flex items-start gap-2 max-w-sm">
                                 <BookOpen className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                                 <span className="text-xs text-slate-600 font-medium leading-relaxed">{item.observacao}</span>
                               </div>
                             ) : (
                               <span className="text-xs text-slate-300 italic">Nenhum conteúdo registrado para esta aula.</span>
                             )}
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-800">{item.nome}</td>
                          <td className="px-8 py-4 text-center font-bold text-slate-400">{item.total}</td>
                          <td className="px-8 py-4 text-center font-black text-slate-900">{item.presencas}</td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.percentual >= 80 ? 'bg-green-500' : item.percentual >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${item.percentual}%`}}/>
                              </div>
                              <span className="text-xs font-black text-slate-700">{item.percentual}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'secretaria' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-end gap-8">
             <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Situação do Aluno</label>
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    {['todos', 'ativos', 'leads', 'cancelados'].map(s => (
                      <button key={s} onClick={() => setFiltroStatus(s as any)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${filtroStatus === s ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Filtrar por Cursos (Multi-seleção)</label>
                  <div 
                    onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 flex flex-wrap gap-2 cursor-pointer min-h-[56px]"
                  >
                    {filtroTurmasMulti.length === 0 ? (
                      <span className="text-slate-300 font-bold text-xs uppercase">Todos os Cursos</span>
                    ) : (
                      filtroTurmasMulti.map(id => (
                        <span key={id} className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                          {turmas.find(t => t.id === id)?.nome || id}
                          <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); toggleTurmaMulti(id); }} />
                        </span>
                      ))
                    )}
                  </div>
                  
                  {isMultiSelectOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-4 space-y-2 animate-in slide-in-from-top-2">
                       {turmas.map(t => (
                         <div 
                           key={t.id} 
                           onClick={() => toggleTurmaMulti(t.id)}
                           className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                         >
                            <span className="text-xs font-bold text-slate-700">{t.nome}</span>
                            {filtroTurmasMulti.includes(t.id) && <Check className="w-4 h-4 text-blue-600" />}
                         </div>
                       ))}
                    </div>
                  )}
                </div>
             </div>
             <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 min-w-[200px] text-center h-fit">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Listagem Filtrada</p>
                <p className="text-3xl font-black text-blue-600">{listaSecretaria.length}</p>
             </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-5">Estudante</th>
                      <th className="px-8 py-5">Responsável 1 + WhatsApp</th>
                      <th className="px-8 py-5">Responsável 2 + WhatsApp</th>
                      <th className="px-8 py-5">E-mail de Contato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {listaSecretaria.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-all group">
                         <td className="px-8 py-5">
                            <p className="font-bold text-slate-800 leading-none">{a.nome}</p>
                            <div className="flex gap-1 mt-2">
                              {matriculas.filter(m => m.alunoId === a.id).map(m => (
                                <span key={m.turmaId} className="text-[8px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                                  {m.turmaId}
                                </span>
                              ))}
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <p className="text-sm font-bold text-slate-700">{a.responsavel1 || '--'}</p>
                            {a.whatsapp1 && (
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-green-600 mt-1">
                                <Phone className="w-3 h-3" /> {a.whatsapp1}
                              </div>
                            )}
                         </td>
                         <td className="px-8 py-5">
                            <p className="text-sm font-bold text-slate-700">{a.responsavel2 || '--'}</p>
                            {a.whatsapp2 && (
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 mt-1">
                                <Phone className="w-3 h-3" /> {a.whatsapp2}
                              </div>
                            )}
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                               <Mail className="w-3.5 h-3.5 text-blue-400" />
                               {a.email || '--'}
                            </div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {showExportSuccess && (
        <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-300 z-[70]">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
          <p className="font-black">Exportação concluída!</p>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
