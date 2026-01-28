
import React, { useMemo } from 'react';
import { Users, CalendarDays, CheckSquare, TrendingUp, GraduationCap, ClipboardCheck, UserPlus, AlertTriangle, ArrowRight } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { Presenca, Usuario, Aluno, Matricula, Turma, ViewType } from '../types';

interface DashboardProps {
  user: Usuario;
  alunosCount: number;
  turmasCount: number;
  turmas?: Turma[];
  presencas: Presenca[];
  alunosHojeCount?: number;
  alunos?: Aluno[];
  matriculas?: Matricula[];
  onNavigate?: (view: ViewType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  alunosCount, 
  turmasCount, 
  turmas = [],
  presencas, 
  alunosHojeCount = 0,
  alunos = [],
  matriculas = [],
  onNavigate
}) => {
  const isRegente = user.nivel === 'Regente';
  const isGestor = user.nivel === 'Gestor' || user.nivel === 'Gestor Master';
  const isGestorOrEstagiario = user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Estagiário';

  const statsCalculated = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const currentMonthStr = todayStr.substring(0, 7);

    const presencasHoje = presencas.filter(p => p.data === todayStr);
    const totalHoje = presencasHoje.length;
    const presentesHoje = presencasHoje.filter(p => p.status === 'Presente').length;
    const percHoje = totalHoje > 0 ? Math.round((presentesHoje / totalHoje) * 100) : 0;

    const presencasMes = presencas.filter(p => p.data.startsWith(currentMonthStr));
    const totalMes = presencasMes.length;
    const presentesMes = presencasMes.filter(p => p.status === 'Presente').length;
    const percMes = totalMes > 0 ? Math.round((presentesMes / totalMes) * 100) : 0;

    return { percHoje, percMes, totalHoje, presentesHoje };
  }, [presencas]);

  // Inteligência de BI Avançada: Alunos em Risco - EXCLUSIVO GESTOR
  const alunosEmRisco = useMemo(() => {
    if (!isGestor) return []; // Estagiários e outros níveis não processam risco
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString('en-CA');

    const ativosIds = new Set(matriculas.map(m => m.alunoId));
    
    return alunos.filter(aluno => {
      if (!ativosIds.has(aluno.id)) return false;
      
      const presencasAluno = presencas
        .filter(p => p.alunoId === aluno.id)
        .sort((a, b) => b.data.localeCompare(a.data));

      if (presencasAluno.length === 0) return false;

      const ultimas3 = presencasAluno.slice(0, 3);
      const tresFaltasConsecutivas = ultimas3.length === 3 && ultimas3.every(p => p.status === 'Ausente');

      const presencas30Dias = presencasAluno.filter(p => p.data >= thirtyDaysAgoStr);
      let altaTaxaAusencia = false;
      if (presencas30Dias.length >= 2) {
        const faltas = presencas30Dias.filter(p => p.status === 'Ausente').length;
        const taxaAusencia = (faltas / presencas30Dias.length) * 100;
        altaTaxaAusencia = taxaAusencia > 50;
      }

      return tresFaltasConsecutivas || altaTaxaAusencia;
    }).slice(0, 5);
  }, [isGestor, alunos, matriculas, presencas]);

  const gestorStats = useMemo(() => {
    if (!isGestorOrEstagiario) return [];
    const totalCadastrados = alunos.length;
    const idsComMatricula = new Set(matriculas.map(m => m.alunoId));
    const totalAlunosAtivos = Array.from(idsComMatricula).length;
    const totalMatriculasAtivas = matriculas.length;
    
    const totalCapacidade = turmas.reduce((acc, t) => acc + (t.capacidade || 0), 0) || (turmasCount * 15);
    const taxaOcupacaoMedia = Math.min(100, Math.round((totalMatriculasAtivas / totalCapacidade) * 100));

    return [
      { label: 'Alunos Cadastrados', value: totalCadastrados, icon: UserPlus, color: 'bg-slate-700' },
      { label: 'Alunos Ativos', value: totalAlunosAtivos, icon: Users, color: 'bg-blue-600' },
      { label: 'Matrículas Ativas', value: totalMatriculasAtivas, icon: ClipboardCheck, color: 'bg-emerald-600' },
      { label: 'Ocupação Média', value: `${taxaOcupacaoMedia}%`, icon: GraduationCap, color: 'bg-purple-600' },
    ];
  }, [isGestorOrEstagiario, alunos, matriculas, turmas, turmasCount]);

  const stats = useMemo(() => {
    if (isGestorOrEstagiario) return gestorStats;
    if (isRegente) {
      return [
        { label: 'Meus Alunos Ativos', value: alunosCount, icon: Users, color: 'bg-blue-600' },
        { label: 'Alunos em Curso Hoje', value: alunosHojeCount, icon: CalendarDays, color: 'bg-amber-500' },
      ];
    }
    return [
      { label: 'Alunos Ativos', value: alunosCount, icon: Users, color: 'bg-blue-500' },
      { label: 'Turmas Ativas', value: turmasCount, icon: GraduationCap, color: 'bg-purple-500' },
      { label: 'Presença Hoje', value: statsCalculated.totalHoje > 0 ? `${statsCalculated.percHoje}%` : '--', icon: CheckSquare, color: 'bg-green-500' },
      { label: 'Taxa Mensal', value: `${statsCalculated.percMes}%`, icon: TrendingUp, color: 'bg-orange-500' },
    ];
  }, [isGestorOrEstagiario, isRegente, gestorStats, alunosCount, alunosHojeCount, turmasCount, statsCalculated]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-slate-500">
            {isRegente ? `Bem-vindo, Regente ${user.nome}.` : `Painel de controle ${user.nivel}.`}
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${stats.length} gap-6`}>
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className={`${stat.color} p-3 rounded-2xl text-white shadow-lg shadow-opacity-10`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta de Retenção: RESTRITO APENAS PARA GESTOR */}
      {isGestor && alunosEmRisco.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-8 flex flex-col lg:flex-row items-center gap-8 shadow-sm">
          <div className="bg-amber-100 p-5 rounded-3xl text-amber-600">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h3 className="text-xl font-black text-amber-900">Alerta de Retenção (Churn Risk)</h3>
            <p className="text-amber-700 font-medium text-sm">
              Estudantes com 3 ausências consecutivas ou mais de 50% de faltas nos últimos 30 dias.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-4">
              {alunosEmRisco.map(a => (
                <span key={a.id} className="bg-white px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 border border-amber-200 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {a.nome}
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={() => onNavigate && onNavigate('churn-risk')}
            className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20"
          >
            Gerenciar Alertas <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isRegente && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-400 mb-6 uppercase tracking-widest text-[10px]">Frequência Semanal (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={useMemo(() => {
                  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                  const result = [];
                  const now = new Date();
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const dateStr = d.toLocaleDateString('en-CA');
                    const dayPresencas = presencas.filter(p => p.data === dateStr);
                    const total = dayPresencas.length;
                    const presentes = dayPresencas.filter(p => p.status === 'Presente').length;
                    const perc = total > 0 ? Math.round((presentes / total) * 100) : 0;
                    result.push({ name: days[d.getDay()], presenca: perc });
                  }
                  return result;
                }, [presencas])}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="presenca" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-400 mb-6 uppercase tracking-widest text-[10px]">Engajamento de Comparecimento</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={useMemo(() => {
                  const result = [];
                  const now = new Date();
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const dateStr = d.toLocaleDateString('en-CA');
                    const dayPresencas = presencas.filter(p => p.data === dateStr);
                    const total = dayPresencas.length;
                    const presentes = dayPresencas.filter(p => p.status === 'Presente').length;
                    const perc = total > 0 ? Math.round((presentes / total) * 100) : 0;
                    result.push({ name: d.getDate(), presenca: perc });
                  }
                  return result;
                }, [presencas])}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Line type="monotone" dataKey="presenca" stroke="#8b5cf6" strokeWidth={4} dot={{r: 6, fill: '#8b5cf6', strokeWidth: 3, stroke: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
