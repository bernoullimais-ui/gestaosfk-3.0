
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard,
  GraduationCap,
  PlusCircle,
  CheckCircle2,
  Database,
  CloudSync,
  RefreshCw,
  AlertCircle,
  Settings,
  Check,
  ShieldCheck,
  Lock,
  Code,
  ClipboardList,
  FlaskConical,
  Contact2,
  UserX,
  MessageCircle,
  Zap,
  Timer
} from 'lucide-react';
import { Aluno, Turma, Matricula, Presenca, Usuario, ViewType, AulaExperimental, CursoCancelado, AcaoRetencao } from './types';
import { INITIAL_ALUNOS, INITIAL_TURMAS, INITIAL_MATRICULAS, INITIAL_PRESENCAS, INITIAL_USUARIOS } from './constants';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Frequencia from './components/Frequencia';
import Relatorios from './components/Relatorios';
import TurmasList from './components/TurmasList';
import UsuariosList from './components/UsuariosList';
import PreparacaoTurmas from './components/PreparacaoTurmas';
import AulasExperimentais from './components/AulasExperimentais';
import DadosAlunos from './components/DadosAlunos';
import ChurnRiskManagement from './components/ChurnRiskManagement';

const BPlusLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="5" y="80" fontFamily="Arial Black, sans-serif" fontSize="85" fill="#1d3ba3" fontWeight="900">B</text>
    <path d="M60 45 L95 45 M77.5 25 L77.5 65" stroke="#00a396" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

const formatEscolaridade = (aluno: Aluno) => {
  const etapa = (aluno.etapa || '').trim();
  const ano = (aluno.anoEscolar || '').trim();
  const turma = (aluno.turmaEscolar || '').trim();
  if (!etapa && !ano) return 'Sem Classificação';
  let result = etapa;
  if (ano) result += (result ? `-${ano}` : ano);
  if (turma) result += ` ${turma.replace(/Turma/gi, '').trim()}`;
  return result.trim() || 'Sem Classificação';
};

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxR3xc5QoxvEBC0nFaGojOT2v8KG32dmGoSMcYuGt-IJr9TxZ8TLgaGoWWU-3jE-VpfiA/exec";
const DEFAULT_WHATSAPP_URL = "https://webhook.pluglead.com/webhook/f119b7961a1c6530df9dcec417de5f3e";

const App: React.FC = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last_sync'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<string | null>(null);
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem('google_script_url');
    return (saved && saved.trim() !== "") ? saved : DEFAULT_API_URL;
  });
  
  const [whatsappApiUrl, setwhatsappApiUrl] = useState(localStorage.getItem('whatsapp_api_url') || DEFAULT_WHATSAPP_URL);
  const [whatsappToken, setWhatsappToken] = useState(localStorage.getItem('whatsapp_token') || '');
  
  const [alunos, setAlunos] = useState<Aluno[]>(() => JSON.parse(localStorage.getItem('data_alunos') || JSON.stringify(INITIAL_ALUNOS)));
  const [turmas, setTurmas] = useState<Turma[]>(() => JSON.parse(localStorage.getItem('data_turmas') || JSON.stringify(INITIAL_TURMAS)));
  const [matriculas, setMatriculas] = useState<Matricula[]>(() => JSON.parse(localStorage.getItem('data_matriculas') || JSON.stringify(INITIAL_MATRICULAS)));
  const [presencas, setPresencas] = useState<Presenca[]>(() => JSON.parse(localStorage.getItem('data_presencas') || JSON.stringify(INITIAL_PRESENCAS)));
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => JSON.parse(localStorage.getItem('data_usuarios') || JSON.stringify(INITIAL_USUARIOS)));
  const [experimentais, setExperimentais] = useState<AulaExperimental[]>(() => JSON.parse(localStorage.getItem('data_experimentais') || '[]'));
  const [acoesRetencao, setAcoesRetencao] = useState<AcaoRetencao[]>(() => JSON.parse(localStorage.getItem('data_acoes_retencao') || '[]'));

  const syncFromSheets = async (isAuto: boolean = false) => {
    const urlToUse = apiUrl.trim();
    if (!urlToUse) return;
    if (!isAuto) setIsLoading(true);
    
    try {
      const cacheBuster = `&t=${Date.now()}`;
      const finalUrl = urlToUse.includes('?') ? `${urlToUse}${cacheBuster}` : `${urlToUse}?${cacheBuster}`;
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = await response.json();
      
      if (data.usuarios && Array.isArray(data.usuarios)) {
        const mappedUsuarios = data.usuarios.map((u: any) => ({
          login: getFuzzyValue(u, ['login', 'usuario', 'id', 'operador']),
          senha: String(getFuzzyValue(u, ['senha', 'password', 'key', 'pass'])),
          nivel: getFuzzyValue(u, ['nivel', 'acesso', 'role', 'tipo']) as any,
          nome: getFuzzyValue(u, ['nome', 'name', 'colaborador'])
        })).filter(u => u.login);
        if (mappedUsuarios.length > 0) setUsuarios(mappedUsuarios);
      }

      if (data.turmas && Array.isArray(data.turmas)) {
        const mappedTurmas = data.turmas.map((t: any) => ({
          id: getFuzzyValue(t, ['nome', 'turma', 'curso', 'modalidade', 'id']),
          nome: getFuzzyValue(t, ['nome', 'turma', 'curso', 'modalidade']),
          horario: getFuzzyValue(t, ['horario', 'hora', 'dias', 'periodo']),
          professor: getFuzzyValue(t, ['professor', 'instrutor', 'regente', 'profe']),
          capacidade: parseInt(getFuzzyValue(t, ['capacidade', 'vagas', 'max', 'limite'])) || 0
        })).filter(t => t.nome);
        if (mappedTurmas.length > 0) setTurmas(mappedTurmas);
      }

      if (data.base && Array.isArray(data.base)) {
        const newAlunosMap = new Map<string, Aluno>();
        const rawMatriculas: Matricula[] = [];
        data.base.forEach((row: any) => {
          const nome = getFuzzyValue(row, ['estudante', 'nome', 'aluno']);
          if (nome.length < 2) return;
          const id = nome.replace(/\s+/g, '_').toLowerCase();
          const curso = getFuzzyValue(row, ['modalidade', 'curso', 'turma_sport', 'aula', 'plano', 'cur']).trim();
          const statusRaw = getFuzzyValue(row, ['status', 'ativo', 'situa', 'matri', 'situacao', 'ativado']).toLowerCase();
          const isAtivo = statusRaw === 'ativo' || statusRaw === 'ativa' || statusRaw === 'sim' || statusRaw.includes('at') || statusRaw === '1';
          
          if (!newAlunosMap.has(id)) {
            newAlunosMap.set(id, {
              id, nome, 
              dataNascimento: getFuzzyValue(row, ['nasc', 'data de nascimento', 'nascimento', 'dt_nas']),
              contato: cleanPhonePrefix(getFuzzyValue(row, ['whatsapp', 'tel', 'contato'])),
              responsavel1: getFuzzyValue(row, ['responsavel 1', 'responsavel1', 'mae']),
              whatsapp1: cleanPhonePrefix(getFuzzyValue(row, ['whatsapp1', 'whatsapp 1'])),
              statusMatricula: statusRaw
            });
          }
          if (curso && isAtivo) {
            rawMatriculas.push({ id: `M-${Math.random().toString(36).substr(2, 5)}`, alunoId: id, turmaId: curso });
          }
        });
        setAlunos(Array.from(newAlunosMap.values()));
        setMatriculas(rawMatriculas);
      }
      
      const nowStr = new Date().toLocaleString('pt-BR');
      setLastSync(nowStr);
      localStorage.setItem('last_sync', nowStr);
      if (!isAuto) setSyncSuccess(`Dados atualizados.`);
    } catch (error) {
      if (!isAuto) setSyncError(`Falha na conexão.`);
    } finally {
      setIsLoading(false);
      scheduleNextAutoSync();
    }
  };

  const scheduleNextAutoSync = () => {
    if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    const now = new Date();
    const delay = (now.getHours() < 6) ? (360 - (now.getHours() * 60 + now.getMinutes())) : 30;
    const next = new Date(now.getTime() + delay * 60000);
    setNextSyncTime(next.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    autoSyncTimerRef.current = setTimeout(() => syncFromSheets(true), delay * 60000);
  };

  // EFEITO CRÍTICO: Sincronização Inicial ao abrir o App em qualquer dispositivo
  useEffect(() => {
    syncFromSheets(true);
  }, []);

  useEffect(() => {
    if (user && (user.nivel === 'Gestor' || user.nivel === 'Gestor Master')) {
      scheduleNextAutoSync();
    }
    return () => { if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current); };
  }, [user]);

  const viewableTurmas = useMemo(() => {
    if (!user) return [];
    if (user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Regente' || user.nivel === 'Estagiário') return turmas;
    const userName = (user.nome || user.login).toLowerCase();
    return turmas.filter(t => t.professor.toLowerCase().includes(userName) || userName.includes(t.professor.toLowerCase()));
  }, [user, turmas]);

  const viewableAlunos = useMemo(() => {
    if (!user) return [];
    if (user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Estagiário') return alunos;
    if (user.nivel === 'Regente') {
      const siglaRegente = (user.nome || '').toLowerCase().trim();
      return alunos.filter(a => formatEscolaridade(a).toLowerCase().trim() === siglaRegente);
    }
    const turmasIds = viewableTurmas.map(t => t.id);
    const ids = new Set(matriculas.filter(m => turmasIds.includes(m.turmaId)).map(m => m.alunoId));
    return alunos.filter(a => ids.has(a.id));
  }, [user, alunos, viewableTurmas, matriculas]);

  const viewablePresencas = useMemo(() => {
    if (!user) return [];
    if (user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Estagiário') return presencas;
    const turmasIds = viewableTurmas.map(t => t.id);
    return presencas.filter(p => turmasIds.includes(p.turmaId));
  }, [user, presencas, viewableTurmas]);

  useEffect(() => {
    localStorage.setItem('data_alunos', JSON.stringify(alunos));
    localStorage.setItem('data_turmas', JSON.stringify(turmas));
    localStorage.setItem('data_matriculas', JSON.stringify(matriculas));
    localStorage.setItem('data_presencas', JSON.stringify(presencas));
    localStorage.setItem('data_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('google_script_url', apiUrl);
  }, [alunos, turmas, matriculas, presencas, usuarios, apiUrl]);

  const getFuzzyValue = (obj: any, keys: string[], forbidden: string[] = []) => {
    if (!obj) return '';
    const objKeys = Object.keys(obj);
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
    const forbiddenNorm = forbidden.map(t => normalize(t));
    for (const searchKey of keys) {
      const normS = normalize(searchKey);
      const match = objKeys.find(k => {
        const nk = normalize(k);
        return nk === normS && !forbiddenNorm.some(f => nk.includes(f));
      });
      if (match) return String(obj[match]).trim();
    }
    return '';
  };

  const cleanPhonePrefix = (val: string) => (val && val.startsWith('+55')) ? val.substring(3).trim() : (val || '');

  const handleUpdateAluno = async (updated: Aluno) => {
    setAlunos(prev => prev.map(a => a.id === updated.id ? updated : a));
    try {
      await fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'update_aluno', data: updated }) });
      setSyncSuccess(`Salvo.`);
    } catch (e) { setSyncError(`Erro ao salvar.`); }
  };

  const handleLogout = () => { setUser(null); setCurrentView('dashboard'); };

  if (!user) return <Login onLogin={setUser} usuarios={usuarios} />;

  const isGestorUser = user.nivel === 'Gestor' || user.nivel === 'Gestor Master';
  const isMaster = user.nivel === 'Gestor Master';

  return (
    <div className="flex h-screen bg-slate-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white transform transition-transform duration-300 z-30 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <BPlusLogo className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">Gestão B+</h1>
          </div>
          <nav className="flex-1 space-y-1">
            {[
              { id: 'dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['Professor', 'Gestor', 'Gestor Master', 'Regente', 'Estagiário'] },
              { id: 'frequencia', label: 'Chamada', icon: CheckCircle2, roles: ['Professor', 'Gestor', 'Gestor Master'] },
              { id: 'dados-alunos', label: 'Alunos', icon: Contact2, roles: ['Gestor', 'Gestor Master'] },
              { id: 'relatorios', label: 'Relatórios', icon: BarChart3, roles: ['Gestor', 'Gestor Master'] },
            ].filter(item => item.roles.includes(user.nivel)).map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === item.id ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-slate-800 space-y-3">
             {isGestorUser && (
                <button onClick={() => syncFromSheets(false)} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold uppercase transition-all">
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSync className="w-4 h-4" />}
                  Atualizar Dados
                </button>
             )}
             {isMaster && (
                <button onClick={() => setIsSettingsOpen(true)} className="w-full text-[10px] text-slate-500 hover:text-white flex items-center justify-center gap-2 uppercase font-black"><Settings className="w-3.5 h-3.5" /> Configurações Master</button>
             )}
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-950/20 rounded-lg"><LogOut className="w-5 h-5" /> Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <button className="lg:hidden p-2 text-slate-600" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
          <div className="flex items-center gap-4">
             {lastSync && <span className="text-[10px] text-slate-400 font-bold uppercase">Última Sincronização: {lastSync}</span>}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {syncError && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 font-bold"><AlertCircle className="w-5 h-5" /> {syncError}</div>}
          {syncSuccess && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-2 font-bold"><CheckCircle2 className="w-5 h-5" /> {syncSuccess}</div>}
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={viewableAlunos.length} turmasCount={viewableTurmas.length} presencas={viewablePresencas} alunos={alunos} matriculas={matriculas} onNavigate={setCurrentView} />}
          {currentView === 'frequencia' && <Frequencia turmas={viewableTurmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={(p) => setPresencas([...presencas, ...p])} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={viewablePresencas} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} onUpdateAluno={handleUpdateAluno} user={user} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
        </div>
      </main>
      {isSettingsOpen && isMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black">Configurações Master</h3>
              <button onClick={() => setIsSettingsOpen(false)}><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Google Apps Script URL</label>
                <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://script.google.com/..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-mono text-xs focus:border-blue-500" />
              </div>
              <button onClick={() => { localStorage.setItem('google_script_url', apiUrl); setIsSettingsOpen(false); syncFromSheets(); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all">Salvar e Sincronizar Agora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
