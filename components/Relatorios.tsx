
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
  Activity
} from 'lucide-react';
import { 
  BarChart, 
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
  Area
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

  const formatDisplayDateBR = (dateVal: any) => {
    const date = parseToDate(dateVal);
    if (!date) return '--/--/----';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  };

  // 1. Filtragem rigorosa baseada na aba FREQUENCIA
  const presencasFiltradas = useMemo(() => {
    let filtered = presencas;
    if (filtroTurmaUnica) filtered = filtered.filter(p => p.turmaId === filtroTurmaUnica);
    if (filtroAluno) filtered = filtered.filter(p => p.alunoId === filtroAluno);
    if (dataInicio) filtered = filtered.filter(p => p.data >= dataInicio);
    if (dataFim) filtered = filtered.filter(p => p.data <= dataFim);
    return filtered;
  }, [presencas, filtroTurmaUnica, filtroAluno, dataInicio, dataFim]);

  // 2. Ranking derivado da planilha
  const statsGerais = useMemo(() => {
    if (filtroAluno) return [];
    const stats: Record<string, { total: number; presencas: number }> = {};
    presencasFiltradas.forEach(p => {
      if (!stats[p.alunoId]) stats[p.alunoId] = { total: 0, presencas: 0 };
      stats[p.alunoId].total += 1;
      if (p.status === 'Presente') stats[p.alunoId].presencas += 1;
    });

    return Object.entries(stats).map(([alunoId, val]) => {
      const aluno = alunos.find(a => a.id === alunoId) || { nome: alunoId.replace(/_/g, ' ') };
      return {
        id: alunoId,
        nome: aluno.nome,
        total: val.total,
        presencas: val.presencas,
        percentual: Math.round((val.presencas / val.total) * 100)
      };
    }).sort((a, b) => b.percentual - a.percentual);
  }, [presencasFiltradas, filtroAluno, alunos]);

  // 3. BI Data - Exclusivo da aba FREQUENCIA
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

  const monthlyTrend = useMemo(() => {
    const months: Record<string, { t: number, p: number }> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Pegar registros dos últimos 6 meses da aba FREQUENCIA
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

  const funnelMetrics = useMemo(() => {
    if (!experimentais || experimentais.length === 0) return { data: [], convRate: 0, showRate: 0, convertidos: [] };
    const compareceram = experimentais.filter(e => e.status === 'Presente');
    const convertidosNominal: {nome: string, curso: string}[] = [];

    experimentais.forEach(exp => {
      const studentId = exp.estudante.replace(/\s+/g, '_').toLowerCase();
      // Verifica na aba BASE (matriculas) se o lead converteu
      const matriculadoNoMesmoCurso = matriculas.some(m => 
        m.alunoId === studentId && 
        m.turmaId.trim().toLowerCase() === exp.curso.trim().toLowerCase()
      );
      if (matriculadoNoMesmoCurso) convertidosNominal.push({ nome: exp.estudante, curso: exp.curso });
    });

    const totalAgendados = experimentais.length;
    const totalPresentes = compareceram.length;
    const totalConvertidos = convertidosNominal.length;

    const showRate = totalAgendados > 0 ? Math.round((totalPresentes / totalAgendados) * 100) : 0;
    const convRate = totalAgendados > 0 ? Math.round((totalConvertidos / totalAgendados) * 100) : 0;

    return {
      data: [
        { stage: 'Agendados', value: totalAgendados, fill: '#8b5cf6', label: '100%' },
        { stage: 'Compareceram', value: totalPresentes, fill: '#3b82f6', label: `${showRate}%` },
        { stage: 'Matriculados', value: totalConvertidos, fill: '#10b981', label: `${convRate}%` }
      ],
      convRate, showRate, convertidos: convertidosNominal
    };
  }, [experimentais, matriculas]);

  const listaSecretaria = useMemo(() => {
    return alunos.filter(aluno => {
      const isAtivo = matriculas.some(m => m.alunoId === aluno.id);
      const isLead = aluno.statusMatricula === 'Lead Qualificado' || !!aluno.isLead;
      if (filtroStatus === 'ativos' && !isAtivo) return false;
      if (filtroStatus === 'leads' && !isLead) return false;
      if (filtroStatus === 'cancelados' && (isAtivo || isLead)) return false;
      if (filtroTurmasMulti.length > 0) {
        const matriculadoNasTurmas = matriculas.some(m => m.alunoId === aluno.id && filtroTurmasMulti.includes(m.turmaId));
        if (filtroStatus === 'ativos' && !matriculadoNasTurmas) return false;
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
      headers = ["Aluno", "Registros", "Presenças", "% Frequência"];
      rows = statsGerais.map(item => [`"${item.nome}"`, item.total, item.presencas, `${item.percentual}%`]);
    } else if (activeTab === 'secretaria') {
      headers = ["Estudante", "Responsavel", "WhatsApp", "Email"];
      rows = listaSecretaria.map(a => [`"${a.nome}"`, `"${a.responsavel1 || ''}"`, `"${a.whatsapp1 || ''}"`, `"${a.email || ''}"`]);
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
          <h2 className="text-2xl font-bold text-slate-800">Inteligência de Dados</h2>
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

      {activeTab === 'geral' && (
        <>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Aluno</label>
              <select value={filtroAluno} onChange={(e) => setFiltroAluno(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                <option value="">Todos da Aba Frequência</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Turma</label>
              <select value={filtroTurmaUnica} onChange={(e) => setFiltroTurmaUnica(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                <option value="">Todas as Turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Período Inicial</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold"/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Período Final</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold"/>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="font-black text-slate-700 uppercase text-xs tracking-wider">Registros Aba FREQUENCIA</span>
              </div>
              <span className="text-[10px] text-slate-400 font-black uppercase">{presencasFiltradas.length} Linhas Sincronizadas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100 bg-slate-50/50">
                    <th className="px-8 py-4">Estudante</th>
                    <th className="px-8 py-4 text-center">Registros Totais</th>
                    <th className="px-8 py-4 text-center">Presenças</th>
                    <th className="px-8 py-4">Frequência (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statsGerais.length > 0 ? statsGerais.map((item) => (
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
                  )) : (
                    <tr><td colSpan={4} className="py-20 text-center text-slate-300 italic">Nenhum registro encontrado na aba FREQUENCIA para este filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'bi' && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico 1: Tendência de Presença Unidade */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Média Global de Presença</h3>
                      <p className="text-lg font-black text-slate-800 mt-1">Série Histórica (Aba Frequência)</p>
                    </div>
                  </div>
               </div>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorFreq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Area type="monotone" dataKey="frequencia" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFreq)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Gráfico 2: Engajamento por Modalidade */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
               <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><PieIcon className="w-5 h-5" /></div>
                 <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Engajamento por Turma</h3>
                   <p className="text-lg font-black text-slate-800 mt-1">% Média de Comparecimento</p>
                 </div>
               </div>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biFreqData} layout="vertical" margin={{left: 20}}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 9, fontWeight: 'bold'}} width={90} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                        {biFreqData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        <LabelList dataKey="value" position="right" formatter={(v: any) => `${v}%`} style={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl flex flex-col md:flex-row items-center gap-8 text-white">
             <div className="bg-blue-600/20 p-5 rounded-3xl border border-blue-500/20 text-blue-400">
                <Target className="w-10 h-10" />
             </div>
             <div className="flex-1">
                <h4 className="text-xl font-black mb-1">Metas de Retenção</h4>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Baseado nos {presencas.length} registros da planilha, a média de frequência atual da unidade é de 
                  <span className="text-blue-400 font-black ml-1 text-lg">
                    {Math.round(monthlyTrend.reduce((acc, m) => acc + m.frequencia, 0) / (monthlyTrend.length || 1))}%
                  </span>.
                  Manter este índice acima de 85% reduz o risco de cancelamento (Churn) em até 60%.
                </p>
             </div>
             <button onClick={() => setActiveTab('geral')} className="px-6 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2">
                Ver Ranking <ArrowRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      )}

      {activeTab === 'secretaria' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8">
             <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Filtrar Base de Alunos</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {['todos', 'ativos', 'leads', 'cancelados'].map(s => (
                    <button key={s} onClick={() => setFiltroStatus(s as any)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${filtroStatus === s ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
             </div>
             <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 min-w-[200px] text-center">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Estudantes Encontrados</p>
                <p className="text-3xl font-black text-blue-600">{listaSecretaria.length}</p>
             </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Estudante</th>
                    <th className="px-8 py-5">Responsável Principal</th>
                    <th className="px-8 py-5">Contato WhatsApp</th>
                    <th className="px-8 py-5">Email Corporativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {listaSecretaria.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-all group">
                       <td className="px-8 py-5">
                          <p className="font-bold text-slate-800 leading-none">{a.nome}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase mt-2">{a.etapa} - {a.anoEscolar}</p>
                       </td>
                       <td className="px-8 py-5 text-sm font-medium text-slate-600">{a.responsavel1 || '--'}</td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                             <Phone className="w-3.5 h-3.5" /> {a.whatsapp1 || '--'}
                          </div>
                       </td>
                       <td className="px-8 py-5 text-xs text-slate-400">{a.email || '--'}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {showExportSuccess && (
        <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-300 z-[70]">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
          <p className="font-black">Planilha exportada com sucesso!</p>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
