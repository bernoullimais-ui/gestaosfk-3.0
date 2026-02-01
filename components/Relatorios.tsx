
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
  ArrowRight
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
  LabelList
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
    if (s.includes('t')) {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
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

  const presencasFiltradas = useMemo(() => {
    let filtered = presencas;
    if (filtroTurmaUnica) filtered = filtered.filter(p => p.turmaId === filtroTurmaUnica);
    if (filtroAluno) filtered = filtered.filter(p => p.alunoId === filtroAluno);
    if (dataInicio) filtered = filtered.filter(p => p.data >= dataInicio);
    if (dataFim) filtered = filtered.filter(p => p.data <= dataFim);
    return filtered;
  }, [presencas, filtroTurmaUnica, filtroAluno, dataInicio, dataFim]);

  const statsGerais = useMemo(() => {
    if (filtroAluno) return [];
    const stats: Record<string, { total: number; presencas: number }> = {};
    presencasFiltradas.forEach(p => {
      if (!stats[p.alunoId]) stats[p.alunoId] = { total: 0, presencas: 0 };
      stats[p.alunoId].total += 1;
      if (p.status === 'Presente') stats[p.alunoId].presencas += 1;
    });

    return Object.entries(stats).map(([alunoId, val]) => {
      let aluno = alunos.find(a => a.id === alunoId);
      if (!aluno) {
        const normalizedInput = alunoId.replace(/\s+/g, '_').toLowerCase();
        aluno = alunos.find(a => a.id === normalizedInput || a.nome.toLowerCase() === alunoId.toLowerCase().replace(/_/g, ' '));
      }

      return {
        id: alunoId,
        nome: aluno?.nome || alunoId.replace(/_/g, ' '),
        total: val.total,
        presencas: val.presencas,
        percentual: Math.round((val.presencas / val.total) * 100)
      };
    }).sort((a, b) => b.percentual - a.percentual);
  }, [presencasFiltradas, filtroAluno, alunos]);

  const listaSecretaria = useMemo(() => {
    return alunos.filter(aluno => {
      const isAtivo = matriculas.some(m => m.alunoId === aluno.id);
      const isLead = aluno.statusMatricula === 'Lead Qualificado' || !!aluno.isLead;
      
      if (filtroStatus === 'ativos' && !isAtivo) return false;
      if (filtroStatus === 'leads' && !isLead) return false;
      if (filtroStatus === 'cancelados' && (isAtivo || isLead)) return false;
      
      if (filtroTurmasMulti.length > 0) {
        const matriculadoNasTurmas = matriculas.some(m => m.alunoId === aluno.id && filtroTurmasMulti.includes(m.turmaId));
        const canceladoNasTurmas = (aluno.cursosCancelados || []).some(c => filtroTurmasMulti.includes(c));
        const experimentalNasTurmas = experimentais.some(e => 
          e.estudante.replace(/\s+/g, '_').toLowerCase() === aluno.id && 
          filtroTurmasMulti.includes(e.curso)
        );
        
        if (filtroStatus === 'ativos' && !matriculadoNasTurmas) return false;
        if (filtroStatus === 'cancelados' && !canceladoNasTurmas) return false;
        if (filtroStatus === 'leads' && !experimentalNasTurmas) return false;
        if (filtroStatus === 'todos' && !matriculadoNasTurmas && !canceladoNasTurmas && !experimentalNasTurmas) return false;
      }

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, matriculas, experimentais, filtroStatus, filtroTurmasMulti]);

  const biData = useMemo(() => {
    const modalidadeStats: Record<string, number> = {};
    presencas.forEach(p => {
      modalidadeStats[p.turmaId] = (modalidadeStats[p.turmaId] || 0) + 1;
    });
    
    return Object.entries(modalidadeStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [presencas]);

  const funnelMetrics = useMemo(() => {
    if (!experimentais || experimentais.length === 0) return { data: [], convRate: 0, showRate: 0, convertidos: [] };
    
    const compareceram = experimentais.filter(e => e.status === 'Presente');
    const convertidosNominal: {nome: string, curso: string}[] = [];

    experimentais.forEach(exp => {
      const studentId = exp.estudante.replace(/\s+/g, '_').toLowerCase();
      const matriculadoNoMesmoCurso = matriculas.some(m => 
        m.alunoId === studentId && 
        m.turmaId.trim().toLowerCase() === exp.curso.trim().toLowerCase()
      );

      if (matriculadoNoMesmoCurso) {
        convertidosNominal.push({ nome: exp.estudante, curso: exp.curso });
      }
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
      convRate,
      showRate,
      convertidos: convertidosNominal
    };
  }, [experimentais, matriculas]);

  const historicoDetalhado = useMemo(() => {
    if (!filtroAluno) return [];
    return [...presencasFiltradas].sort((a, b) => b.data.localeCompare(a.data));
  }, [presencasFiltradas, filtroAluno]);

  const toggleTurmaMulti = (id: string) => {
    setFiltroTurmasMulti(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let fileName = "";

    if (activeTab === 'secretaria') {
      fileName = `lista_secretaria_${filtroStatus}_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ["Estudante", "Status", "Nascimento", "Responsavel 1", "WhatsApp 1", "Responsavel 2", "WhatsApp 2", "Email"];
      rows = listaSecretaria.map(a => {
        const isAtivo = matriculas.some(m => m.alunoId === a.id);
        const isLead = a.statusMatricula === 'Lead Qualificado' || !!a.isLead;
        let status = "Cancelado";
        if (isAtivo) status = "Ativo";
        else if (isLead) status = "Lead Qualificado";

        return [
          `"${a.nome}"`,
          status,
          formatDisplayDateBR(a.dataNascimento),
          `"${a.responsavel1 || ''}"`,
          `"${a.whatsapp1 || ''}"`,
          `"${a.responsavel2 || ''}"`,
          `"${a.whatsapp2 || ''}"`,
          `"${a.email || ''}"`
        ];
      });
    } else if (filtroAluno) {
      const alunoNome = alunos.find(a => a.id === filtroAluno)?.nome || "Aluno";
      fileName = `historico_${alunoNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ["Data", "Turma", "Status", "Observacao"];
      rows = historicoDetalhado.map(item => [item.data, `"${item.turmaId}"`, item.status, `"${item.observacao || ''}"`]);
    } else {
      fileName = `relatorio_frequencia_geral_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ["Aluno", "Aulas", "Presenças", "% Frequência"];
      rows = statsGerais.map(item => [`"${item.nome}"`, item.total, item.presencas, `${item.percentual}%`]);
    }

    if (rows.length === 0) return;

    const csvContent = ["\ufeff" + headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inteligência e Relatórios</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <button onClick={() => setActiveTab('geral')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FREQUÊNCIA GERAL</button>
            <button onClick={() => setActiveTab('bi')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO EXECUTIVA (BI)</button>
            <button onClick={() => setActiveTab('secretaria')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>SECRETARIA (LISTAS)</button>
          </div>
        </div>
        <button 
          onClick={handleExport}
          disabled={activeTab === 'secretaria' ? listaSecretaria.length === 0 : presencasFiltradas.length === 0}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black transition-all shadow-lg ${
            (activeTab === 'secretaria' ? listaSecretaria.length > 0 : presencasFiltradas.length > 0)
            ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-slate-900/10' 
            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <Download className="w-5 h-5" /> Exportar CSV
        </button>
      </div>

      {activeTab === 'geral' && (
        <>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Aluno</label>
              <select value={filtroAluno} onChange={(e) => setFiltroAluno(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold">
                <option value="">Todos os Alunos</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Turma</label>
              <select value={filtroTurmaUnica} onChange={(e) => setFiltroTurmaUnica(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold">
                <option value="">Todas as Turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Término</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"/>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {filtroAluno ? <History className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
                <span className="font-black text-slate-700 uppercase text-xs tracking-wider">
                  {filtroAluno ? `Histórico: ${alunos.find(a => a.id === filtroAluno)?.nome}` : 'Ranking de Frequência'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-black uppercase">{presencasFiltradas.length} Registros</span>
            </div>
            <div className="overflow-x-auto">
              {filtroAluno ? (
                <table className="w-full text-left">
                  <thead><tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100"><th className="px-8 py-4">Data</th><th className="px-8 py-4">Turma/Obs</th><th className="px-8 py-4 text-center">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {historicoDetalhado.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4"><span className="font-bold text-slate-700">{formatDisplayDateBR(item.data)}</span></td>
                        <td className="px-8 py-4">
                          <div className="font-bold text-slate-800">{item.turmaId}</div>
                          {item.observacao && <div className="text-[10px] text-slate-500 italic mt-0.5">{item.observacao}</div>}
                        </td>
                        <td className="px-8 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${item.status === 'Presente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left">
                  <thead><tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100"><th className="px-8 py-4">Aluno</th><th className="px-8 py-4 text-center">Total</th><th className="px-8 py-4 text-center">Presenças</th><th className="px-8 py-4">Frequência %</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {statsGerais.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setFiltroAluno(item.id)}>
                        <td className="px-8 py-4"><span className="font-bold text-slate-800">{item.nome}</span></td>
                        <td className="px-8 py-4 text-center font-bold text-slate-500">{item.total}</td>
                        <td className="px-8 py-4 text-center font-black">{item.presencas}</td>
                        <td className="px-8 py-4"><div className="flex items-center gap-3"><div className="w-20 bg-slate-100 h-1.5 rounded-full"><div className={`h-full rounded-full ${item.percentual >= 75 ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${item.percentual}%`}}/></div><span className="text-[10px] font-black">{item.percentual}%</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'bi' && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Funil de Conversão Experimental</h3>
                        <p className="text-lg font-black text-slate-800 mt-1">Eficácia Trial-to-Paid</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Show-up Rate</p>
                          <p className="text-xl font-black text-blue-600">{funnelMetrics.showRate}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Conversão Final</p>
                          <p className="text-xl font-black text-green-600">{funnelMetrics.convRate}%</p>
                        </div>
                    </div>
                  </div>

                  <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={funnelMetrics.data} margin={{ left: 20, right: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} width={100} />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                          />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                            {funnelMetrics.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList dataKey="label" position="right" style={{fill: '#64748b', fontSize: 12, fontWeight: '900'}} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
                </div>

                {funnelMetrics.convertidos.length > 0 && (
                   <div className="bg-emerald-50 rounded-[32px] p-6 border border-emerald-100 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl">
                           <UserCheck className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-emerald-900 uppercase">Alunos Convertidos (Match de Curso)</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {funnelMetrics.convertidos.map((c, i) => (
                           <div key={i} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-emerald-200/50 shadow-sm">
                              <div>
                                <p className="text-sm font-black text-slate-800">{c.nome}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{c.curso}</p>
                              </div>
                              <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-black">MATRICULADO</div>
                           </div>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[40px] shadow-2xl text-white flex flex-col justify-between">
                <div>
                  <div className="bg-white/10 w-fit p-3 rounded-2xl mb-6">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-black leading-tight mb-2">Insight do Funil</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">
                    A sua taxa de conversão atual é de <span className="text-green-400 font-bold">{funnelMetrics.convRate}%</span>. 
                    {funnelMetrics.showRate < 70 ? 
                      " O seu maior gargalo está no 'Show-up'. Considere reforçar as mensagens de 24h para garantir que o lead não esqueça a aula." : 
                      " A retenção no agendamento está alta! O foco deve ser agora no feedback técnico pós-aula para fechar a matrícula."}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl mt-8">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Métrica Secundária</p>
                  <p className="text-sm font-bold">Leads em Espera: {experimentais.filter(e => e.status === 'Pendente').length}</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
               <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                   <PieIcon className="w-5 h-5" />
                 </div>
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">Distribuição por Modalidade</h3>
               </div>
               <div className="h-64 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={biData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {biData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 pr-4">
                    {biData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{d.name}</span>
                      </div>
                    ))}
                  </div>
               </div>
             </div>

             <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
               <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                   <BarChart3 className="w-5 h-5" />
                 </div>
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">Volume de Interações</h3>
               </div>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" hide />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                        {biData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <p className="mt-4 text-[10px] text-slate-400 font-medium italic text-center">Interações totais capturadas por turma na base histórica.</p>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'secretaria' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Filtro de Status</label>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  onClick={() => setFiltroStatus('todos')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${filtroStatus === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFiltroStatus('ativos')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${filtroStatus === 'ativos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400'}`}
                >
                  Ativos
                </button>
                <button 
                  onClick={() => setFiltroStatus('leads')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${filtroStatus === 'leads' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400'}`}
                >
                  Leads
                </button>
                <button 
                  onClick={() => setFiltroStatus('cancelados')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${filtroStatus === 'cancelados' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-slate-400'}`}
                >
                  Cancelados
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Cursos / Turmas (Múltipla Seleção)</label>
              <div className="relative">
                <button 
                  onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                  className="w-full flex items-center justify-between pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 text-left"
                >
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <span className="truncate">
                    {filtroTurmasMulti.length === 0 ? "Todos os Cursos" : `${filtroTurmasMulti.length} selecionados`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isMultiSelectOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isMultiSelectOpen && (
                  <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto p-2">
                    <button 
                      onClick={() => { setFiltroTurmasMulti([]); setIsMultiSelectOpen(false); }}
                      className="w-full text-left px-4 py-2 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 rounded-xl mb-1"
                    >
                      Limpar Seleção
                    </button>
                    {turmas.map(t => (
                      <label key={t.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={filtroTurmasMulti.includes(t.id)}
                          onChange={() => toggleTurmaMulti(t.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-700">{t.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Contact2 className="w-6 h-6 text-blue-600" />
                  <span className="text-xs font-black text-blue-900 uppercase">Estudantes Listados</span>
                </div>
                <span className="text-2xl font-black text-blue-600">{listaSecretaria.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" /> Lista de Dados Cadastrais
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-50 bg-slate-50/30">
                    <th className="px-6 py-4">Nome do Estudante</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Responsáveis</th>
                    <th className="px-6 py-4">WhatsApp</th>
                    <th className="px-6 py-4">E-mail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {listaSecretaria.length > 0 ? listaSecretaria.map(a => {
                    const isAtivo = matriculas.some(m => m.alunoId === a.id);
                    const isLead = a.statusMatricula === 'Lead Qualificado' || !!a.isLead;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-800 leading-tight">{a.nome}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            Nasc: {formatDisplayDateBR(a.dataNascimento)}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${
                            isAtivo ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            isLead ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {isAtivo ? 'ATIVO' : isLead ? 'LEAD QUALIFICADO' : 'CANCELADO'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs font-bold text-slate-600">{a.responsavel1 || '--'}</div>
                          {a.responsavel2 && <div className="text-[10px] text-slate-400 mt-1">{a.responsavel2}</div>}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-green-500" />
                            {a.whatsapp1 || '--'}
                          </div>
                          {a.whatsapp2 && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                              <Phone className="w-3 h-3 text-slate-300" />
                              {a.whatsapp2}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                            {a.email || '--'}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">Nenhum estudante atende aos critérios do filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showExportSuccess && (
        <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-300 z-[70]">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
          <p className="font-black">Arquivo CSV exportado com sucesso!</p>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
