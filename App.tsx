
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
  Timer,
  Smartphone,
  Info,
  Save,
  Key,
  ChevronRight,
  Loader2
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

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxMvufmlPTQiWtfyK4NAT74IWoSZyv2hYGR1_feR77iGj0E0mNW9CEDYMHYzEGa54vsbA/exec";
const DEFAULT_WHATSAPP_URL = "https://webhook.pluglead.com/webhook/f119b7961a1c6530df9dcec417de5f3e";

const App: React.FC = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last_sync'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  
  const lastAutoSyncRef = useRef<string | null>(null);
  
  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem('google_script_url');
    return (saved && saved.trim() !== "") ? saved : DEFAULT_API_URL;
  });
  
  const [whatsappApiUrl, setwhatsappApiUrl] = useState(localStorage.getItem('whatsapp_api_url') || DEFAULT_WHATSAPP_URL);
  const [whatsappToken, setWhatsappToken] = useState(localStorage.getItem('whatsapp_token') || '');
  
  const [alunos, setAlunos] = useState<Aluno[]>(() => {
    const saved = localStorage.getItem('data_alunos');
    return saved ? JSON.parse(saved) : INITIAL_ALUNOS;
  });
  const [turmas, setTurmas] = useState<Turma[]>(() => {
    const saved = localStorage.getItem('data_turmas');
    const parsed = saved ? JSON.parse(saved) : INITIAL_TURMAS;
    return [...parsed].sort((a, b) => a.nome.localeCompare(b.nome));
  });
  const [matriculas, setMatriculas] = useState<Matricula[]>(() => {
    const saved = localStorage.getItem('data_matriculas');
    return saved ? JSON.parse(saved) : INITIAL_MATRICULAS;
  });
  const [presencas, setPresencas] = useState<Presenca[]>(() => {
    const saved = localStorage.getItem('data_presencas');
    return saved ? JSON.parse(saved) : INITIAL_PRESENCAS;
  });
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem('data_usuarios');
    return saved ? JSON.parse(saved) : INITIAL_USUARIOS;
  });
  const [experimentais, setExperimentais] = useState<AulaExperimental[]>(() => {
    const saved = localStorage.getItem('data_experimentais');
    return saved ? JSON.parse(saved) : [];
  });
  const [acoesRetencao, setAcoesRetencao] = useState<AcaoRetencao[]>(() => {
    const saved = localStorage.getItem('data_acoes_retencao');
    return saved ? JSON.parse(saved) : [];
  });

  // Redirecionamento baseado no nível
  useEffect(() => {
    if (!user) return;
    if (user.nivel === 'Regente' || user.nivel === 'Estagiário') {
      setCurrentView('preparacao');
    } else {
      setCurrentView('dashboard');
    }
  }, [user]);

  // SINCRONIZAÇÃO AUTOMÁTICA AO LOGAR
  useEffect(() => {
    if (user && user.nivel !== 'Start' && user.nivel !== 'Regente') {
      console.log(`[LoginSync] Sincronização automática iniciada para: ${user.login}`);
      syncFromSheets(true);
    }
  }, [user?.login]); // Dispara quando o login do usuário muda de null para algo válido

  // CRONOGRAMA DE SINCRONIZAÇÃO AUTOMÁTICA (CRON)
  useEffect(() => {
    if (!user || user.nivel === 'Start') return;

    const checkSyncSchedule = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeKey = `${hours}:${minutes}`;

      if (lastAutoSyncRef.current === timeKey) return;

      let shouldSync = false;

      if (hours === 6 && minutes === 0) shouldSync = true;

      if (hours >= 6 && hours < 11) {
        if (hours === 10 && minutes > 45) {
          shouldSync = false;
        } else if (minutes % 30 === 0) {
          shouldSync = true;
        }
      }

      if (hours >= 11 && hours < 14) {
        if (minutes % 15 === 0) shouldSync = true;
      }
      
      if (hours >= 14 && hours < 20) {
        if (minutes % 30 === 0) shouldSync = true;
      }

      if (shouldSync) {
        lastAutoSyncRef.current = timeKey;
        console.log(`[AutoSync] Disparado via Cronograma às ${timeKey}`);
        syncFromSheets(true);
      }
    };

    const interval = setInterval(checkSyncSchedule, 60000);
    checkSyncSchedule();

    return () => clearInterval(interval);
  }, [user, apiUrl]);

  const parseDate = (dateVal: any): Date => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return new Date(0);
    if (typeof dateVal === 'number' || (!isNaN(Number(dateVal)) && String(dateVal).length < 8 && !String(dateVal).includes('/'))) {
      const serial = Number(dateVal);
      return new Date((serial - 25569) * 86400 * 1000);
    }
    try {
      let s = String(dateVal).trim().toLowerCase();
      const monthsMap: Record<string, number> = {
        'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
      };
      if (s.includes(' de ')) {
        let clean = s.split(',')[0].split('há')[0].trim();
        const parts = clean.split(/\s+de\s+|\s+/);
        const day = parseInt(parts[0]);
        const monthPart = parts[1].replace('.', '').substring(0, 3);
        const year = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(year) && monthsMap[monthPart] !== undefined) {
          return new Date(year, monthsMap[monthPart], day);
        }
      }
      const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const d = parseInt(dateMatch[1]);
        const m = parseInt(dateMatch[2]);
        let y = parseInt(dateMatch[3]);
        if (y < 100) y += (y < 50 ? 2000 : 1900);
        return new Date(y, m - 1, d);
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return new Date(0);
  };

  const sanitizePhone = (val: any): string => {
    if (!val || val === null || val === undefined) return '';
    let str = String(val).trim();
    str = str.replace(/^(\s*=\s*\+\s*55|\s*=\s*\+\s*|\s*=\s*55|\s*=\s*|\s*\+\s*55|\s*\+\s*)/, '');
    const digitsOnly = str.replace(/\D/g, '');
    if (!digitsOnly) return '';
    if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) {
      return digitsOnly.substring(2);
    }
    return digitsOnly;
  };

  const getFuzzyValue = (obj: any, keys: string[], forbiddenTerms: string[] = []) => {
    if (!obj) return '';
    const objKeys = Object.keys(obj);
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
    const forbiddenNormalized = forbiddenTerms.map(t => normalize(t));
    for (const searchKey of keys) {
      const normalizedSearch = normalize(searchKey);
      const exactMatch = objKeys.find(k => {
        const nk = normalize(k);
        if (forbiddenNormalized.some(f => nk === f || nk.includes(f))) return false;
        return nk === normalizedSearch;
      });
      if (exactMatch) {
        const val = obj[exactMatch];
        if (val === null || val === undefined) return '';
        return String(val).trim();
      }
    }
    for (const searchKey of keys) {
      const normalizedSearch = normalize(searchKey);
      if (normalizedSearch.length < 3) continue;
      const partialMatch = objKeys.find(k => {
        const nk = normalize(k);
        if (forbiddenNormalized.some(f => nk === f || nk.includes(f))) return false;
        return nk.includes(normalizedSearch);
      });
      if (partialMatch) {
        const val = obj[partialMatch];
        if (val === null || val === undefined) return '';
        return String(val).trim();
      }
    }
    return '';
  };

  const syncFromSheets = async (isAuto: boolean = false): Promise<boolean> => {
    let urlToUse = apiUrl.trim();
    if (!urlToUse) return false;
    if (!urlToUse.endsWith('/exec')) urlToUse = urlToUse.replace(/\/$/, '') + '/exec';

    if (isAuto) setIsAutoSyncing(true);
    else setIsLoading(true);
    
    setSyncError(null);
    
    try {
      const separator = urlToUse.includes('?') ? '&' : '?';
      const finalUrl = `${urlToUse}${separator}t=${Date.now()}`;
      
      const response = await fetch(finalUrl);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data.usuarios && Array.isArray(data.usuarios)) {
        const mappedUsuarios = data.usuarios.map((u: any) => ({
          login: getFuzzyValue(u, ['login', 'usuario', 'id']),
          senha: String(getFuzzyValue(u, ['senha', 'key', 'password'])),
          nivel: getFuzzyValue(u, ['nivel', 'acesso', 'permissao']) as any,
          nome: getFuzzyValue(u, ['nome', 'name', 'colaborador'])
        })).filter(u => u.login);
        if (mappedUsuarios.length > 0) {
          const updatedUsers = [...INITIAL_USUARIOS.filter(u => u.nivel === 'Gestor Master' || u.nivel === 'Start'), ...mappedUsuarios];
          setUsuarios(updatedUsers);
          localStorage.setItem('data_usuarios', JSON.stringify(updatedUsers));
        }
      }

      if (data.turmas && Array.isArray(data.turmas)) {
        const mappedTurmas = data.turmas.map((t: any) => ({
          id: getFuzzyValue(t, ['nome', 'turma', 'id']),
          nome: getFuzzyValue(t, ['nome', 'turma']),
          horario: getFuzzyValue(t, ['horario', 'hora']),
          professor: getFuzzyValue(t, ['professor', 'profe', 'instrutor']),
          capacidade: parseInt(getFuzzyValue(t, ['capacidade', 'vagas', 'max'])) || 0
        })).filter(t => t.nome);
        setTurmas(mappedTurmas);
        localStorage.setItem('data_turmas', JSON.stringify(mappedTurmas));
      }

      if (data.base && Array.isArray(data.base)) {
        const studentInfoMap = new Map<string, Aluno>();
        const studentCancelledMap = new Map<string, CursoCancelado[]>();
        const rawMatriculas: Matricula[] = [];

        data.base.forEach((row: any) => {
          const nome = getFuzzyValue(row, ['estudante', 'nome', 'aluno']);
          if (!nome) return;
          const id = nome.replace(/\s+/g, '_').toLowerCase();
          const curso = getFuzzyValue(row, ['modalidade', 'curso', 'turma', 'plano']).trim();
          const statusRaw = getFuzzyValue(row, ['status', 'situacao', 'ativo', 'matriculado']).toLowerCase();
          const isAtivo = statusRaw === 'ativo' || statusRaw === 'sim' || statusRaw === 'm' || statusRaw === 'a';
          const rawMatDateStr = getFuzzyValue(row, ['dt matricula', 'dt matrícula', 'data matricula', 'data matrícula', 'matricula', 'data_matricula']);
          const currentMatDate = parseDate(rawMatDateStr);

          let rawEstagio = getFuzzyValue(row, ['estagioanoescolar', 'estagio', 'etapa', 'escolaridade']).toUpperCase().trim();
          let rawAno = getFuzzyValue(row, ['estagioanoescolar', 'anoescolar', 'ano', 'serie']).trim();
          let finalEtapa = 'EI';
          if (rawEstagio.includes('FUNDAMENTAL')) finalEtapa = 'EF';
          else if (rawEstagio.includes('MEDIO') || rawEstagio.includes('MÉDIO')) finalEtapa = 'EM';
          else if (rawEstagio.includes('INFANTIL')) finalEtapa = 'EI';

          let finalAno = rawAno.replace(/ENSINO FUNDAMENTAL|ENSINO MÉDIO|ENSINO MEDIO|EDUCAÇÃO INFANTIL/gi, '').replace(/^\s*-\s*/, '').replace(/\s*ANO\s*$/i, '').replace(/\s*SÉRIE\s*$/i, '').replace(/\s*SERIE\s*$/i, '').trim();
          let rawTurma = getFuzzyValue(row, ['turmaescolar', 'turmae', 'turma']).trim();
          if (rawTurma.toLowerCase().startsWith('turma ')) rawTurma = rawTurma.substring(6).trim();

          if (curso) {
            if (isAtivo) {
              rawMatriculas.push({ id: `M-${Math.random().toString(36).substr(2, 5)}`, alunoId: id, turmaId: curso, dataMatricula: rawMatDateStr });
            } else {
              const cancelados = studentCancelledMap.get(id) || [];
              cancelados.push({ nome: curso, dataMatricula: rawMatDateStr, dataCancelamento: getFuzzyValue(row, ['dt cancelamento', 'data cancelamento', 'cancelamento']) || rawMatDateStr });
              studentCancelledMap.set(id, cancelados);
            }
          }

          const existing = studentInfoMap.get(id);
          if (!existing || currentMatDate > parseDate(existing.dataMatricula)) {
            studentInfoMap.set(id, {
              id, nome, 
              dataNascimento: getFuzzyValue(row, ['nasc', 'nascimento', 'data_nasc', 'dt nascimento']),
              etapa: finalEtapa,
              anoEscolar: finalAno,
              turmaEscolar: rawTurma,
              contato: sanitizePhone(getFuzzyValue(row, ['whatsapp', 'tel', 'celular', 'contato'])),
              dataMatricula: rawMatDateStr,
              statusMatricula: isAtivo ? 'Ativo' : 'Cancelado',
              email: getFuzzyValue(row, ['email', 'e-mail']),
              responsavel1: getFuzzyValue(row, ['responsavel1', 'mae', 'mãe', 'responsavel_1', 'responsavel']),
              whatsapp1: sanitizePhone(getFuzzyValue(row, ['whatsapp1', 'tel1', 'cel_mae', 'whatsapp_1', 'whatsapp'])),
              responsavel2: getFuzzyValue(row, ['responsavel2', 'pai', 'responsavel_2']),
              whatsapp2: sanitizePhone(getFuzzyValue(row, ['whatsapp2', 'tel2', 'cel_pai', 'whatsapp_2']))
            });
          }
        });

        const finalAlunosList = Array.from(studentInfoMap.values()).map(aluno => ({ ...aluno, cursosCanceladosDetalhes: studentCancelledMap.get(aluno.id) || [] }));
        setAlunos(finalAlunosList);
        setMatriculas(rawMatriculas);
        localStorage.setItem('data_alunos', JSON.stringify(finalAlunosList));
        localStorage.setItem('data_matriculas', JSON.stringify(rawMatriculas));
      }

      if (data.frequencia && Array.isArray(data.frequencia)) {
        const mappedHist = data.frequencia.map((p: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          alunoId: getFuzzyValue(p, ['aluno', 'id_aluno', 'estudante']).replace(/\s+/g, '_').toLowerCase(),
          turmaId: getFuzzyValue(p, ['turma', 'modalidade']),
          data: getFuzzyValue(p, ['data', 'dia']),
          status: getFuzzyValue(p, ['status']) === 'Presente' ? 'Presente' : 'Ausente',
          observacao: getFuzzyValue(p, ['observacao', 'obs'])
        })).filter(p => p.alunoId && p.data);
        if (mappedHist.length > 0) {
          setPresencas(mappedHist);
          localStorage.setItem('data_presencas', JSON.stringify(mappedHist));
        }
      }

      if (data.experimental && Array.isArray(data.experimental)) {
        const mappedExp = data.experimental.map((e: any) => {
          const etapaRaw = getFuzzyValue(e, ['etapa', 'estagio', 'nivel']).toUpperCase();
          const anoRaw = getFuzzyValue(e, ['ano', 'serie', 'anoescolar']);
          const turmaRaw = getFuzzyValue(e, ['turma', 'sigla', 'turma_escolar']).toUpperCase();
          
          let constructedSigla = getFuzzyValue(e, ['sigla', 'escolaridade', 'estagioanoescolar']).toUpperCase();
          
          constructedSigla = constructedSigla.replace(/ENSINO M[EÉ]DIO/gi, 'EM')
                                            .replace(/ENSINO FUNDAMENTAL/gi, 'EF')
                                            .replace(/EDUCA[CÇ]A[OÕ] INFANTIL/gi, 'EI');

          const needsReconstruction = !constructedSigla || constructedSigla.includes('--') || constructedSigla.length <= 3;

          if (needsReconstruction) {
             let prefix = 'EF';
             if (etapaRaw.includes('INFANTIL')) prefix = 'EI';
             else if (etapaRaw.includes('MEDIO') || etapaRaw.includes('MÉDIO')) prefix = 'EM';
             
             let year = anoRaw.replace(/\b(ANO|SÉRIE|SERIE)\b/gi, '').trim();
             if (year) {
               if (/^\d+$/.test(year)) year = year + 'º';
               constructedSigla = `${prefix}-${year}`.trim();
             } else {
               constructedSigla = prefix;
             }
          }

          if (turmaRaw && !constructedSigla.endsWith(turmaRaw)) {
             constructedSigla = `${constructedSigla} ${turmaRaw}`.trim();
          }

          constructedSigla = constructedSigla.replace(/^(EM|EF|EI)-\1-/i, '$1-').replace(/-+/g, '-').trim();

          return {
            id: Math.random().toString(36).substr(2, 9),
            estudante: getFuzzyValue(e, ['estudante', 'aluno', 'nome']),
            sigla: constructedSigla,
            curso: getFuzzyValue(e, ['curso', 'modalidade', 'esporte', 'plano']),
            aula: getFuzzyValue(e, ['aula', 'data_aula', 'agendamento', 'dia', 'horario']),
            responsavel1: getFuzzyValue(e, ['responsavel', 'mae', 'pai', 'nome_responsavel']),
            whatsapp1: sanitizePhone(getFuzzyValue(e, ['whatsapp', 'telefone', 'celular', 'contato'])),
            status: getFuzzyValue(e, ['status']) || 'Pendente',
            observacaoProfessor: getFuzzyValue(e, ['feedback', 'obs', 'observacao_professor'])
          };
        }).filter(e => e.estudante);
        setExperimentais(mappedExp);
        localStorage.setItem('data_experimentais', JSON.stringify(mappedExp));
      }
      
      const nowStr = new Date().toLocaleString('pt-BR');
      setLastSync(nowStr);
      localStorage.setItem('last_sync', nowStr);
      
      if (user?.nivel === 'Start') {
        setUser(null);
      }
      
      return true;
    } catch (error: any) {
      console.error("Sync error:", error);
      if (!isAuto) {
        const msg = error.message === 'Failed to fetch' 
          ? "Erro de conexão com o Google Sheets. Verifique o link do Web App ou se está colocado como 'Qualquer Pessoa'."
          : `Erro: ${error.message}`;
        setSyncError(msg);
      }
      return false;
    } finally {
      setIsLoading(false);
      setIsAutoSyncing(false);
    }
  };

  const handleSavePresencas = async (novasPresencas: Presenca[]) => {
    if (novasPresencas.length === 0) return;
    const { turmaId, data } = novasPresencas[0];
    const semConflitos = presencas.filter(p => !(p.turmaId === turmaId && p.data === data));
    const atualizadas = [...semConflitos, ...novasPresencas];
    setPresencas(atualizadas);
    localStorage.setItem('data_presencas', JSON.stringify(atualizadas));

    if (apiUrl) {
      setIsLoading(true);
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'save_frequencia',
            data: novasPresencas.map(p => ({
              aluno: alunos.find(a => a.id === p.alunoId)?.nome || p.alunoId,
              turma: p.turmaId,
              data: p.data,
              status: p.status,
              observacao: p.observacao || ''
            }))
          })
        });
        const result = await response.json();
        if (result.status === 'SUCCESS') {
          setSyncSuccess("Sincronizado com sucesso!");
          setTimeout(() => setSyncSuccess(null), 3000);
        }
      } catch (e) {
        setSyncError("Salvo apenas localmente (erro ao enviar para planilha).");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateExperimental = async (updated: AulaExperimental) => {
    const novasExps = experimentais.map(e => e.id === updated.id ? updated : e);
    setExperimentais(novasExps);
    localStorage.setItem('data_experimentais', JSON.stringify(novasExps));

    if (apiUrl) {
      setIsLoading(true);
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'save_experimental',
            data: {
              estudante: updated.estudante,
              curso: updated.curso,
              data: updated.aula,
              status: updated.status,
              feedback: updated.observacaoProfessor || ''
            }
          })
        });
        const result = await response.json();
        if (result.status === 'SUCCESS') {
          setSyncSuccess("Experimental sincronizado!");
          setTimeout(() => setSyncSuccess(null), 3000);
        }
      } catch (e) {
        setSyncError("Erro ao salvar experimental na nuvem.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRegistrarAcao = (novaAcao: AcaoRetencao) => {
    const updated = [...acoesRetencao, novaAcao];
    setAcoesRetencao(updated);
    localStorage.setItem('data_acoes_retencao', JSON.stringify(updated));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('google_script_url', apiUrl);
    localStorage.setItem('whatsapp_api_url', whatsappApiUrl);
    localStorage.setItem('whatsapp_token', whatsappToken);
    setSyncSuccess("Configurações salvas!");
    syncFromSheets();
    setTimeout(() => setSyncSuccess(null), 3000);
  };

  if (!user) return <Login onLogin={setUser} usuarios={usuarios} />;

  if (user.nivel === 'Start') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95 duration-500">
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-blue-50 rounded-[32px]">
              <Smartphone className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">PRIMEIRO ACESSO</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10">
            Toque no botão abaixo para configuração inicial dos alunos da unidade
          </p>

          <button
            onClick={() => syncFromSheets()}
            disabled={isLoading}
            className={`w-full py-5 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] ${
              isLoading 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <CloudSync className="w-6 h-6" />
            )}
            {isLoading ? 'SINCRONIZANDO...' : 'ATUALIZAR'}
          </button>

          {syncError && (
            <div className="mt-6 p-4 bg-red-50 rounded-2xl text-red-500 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{syncError}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isMaster = user.nivel === 'Gestor Master';
  const hours = new Date().getHours();
  const isPeakSync = hours >= 11 && hours < 14;

  return (
    <div className="flex h-screen bg-slate-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white transform transition-transform duration-300 z-30 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white p-1.5 rounded-lg"><BPlusLogo className="w-8 h-8" /></div>
            <h1 className="text-xl font-bold tracking-tight">Gestão B+</h1>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Professor', 'Gestor', 'Gestor Master', 'Estagiário'] },
              { id: 'dados-alunos', label: 'Dados de Alunos', icon: Contact2, roles: ['Gestor', 'Gestor Master'] },
              { id: 'turmas', label: 'Turmas', icon: GraduationCap, roles: ['Professor', 'Gestor', 'Gestor Master'] },
              { id: 'preparacao', label: 'Preparação', icon: ClipboardList, roles: ['Gestor', 'Gestor Master', 'Regente', 'Estagiário'] },
              { id: 'frequencia', label: 'Frequência', icon: CheckCircle2, roles: ['Professor', 'Gestor', 'Gestor Master'] },
              { id: 'experimental', label: 'Experimentais', icon: FlaskConical, roles: ['Gestor', 'Gestor Master', 'Regente', 'Estagiário', 'Professor'] },
              { id: 'relatorios', label: 'Relatórios', icon: BarChart3, roles: ['Gestor', 'Gestor Master'] },
              { id: 'churn-risk', label: 'Retenção', icon: UserX, roles: ['Gestor', 'Gestor Master'] },
              { id: 'usuarios', label: 'Usuários', icon: ShieldCheck, roles: ['Gestor', 'Gestor Master'] },
              { id: 'settings', label: 'Configurações', icon: Settings, roles: ['Gestor Master'] },
            ].filter(item => item.roles.includes(user.nivel)).map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-slate-800">
             <button onClick={() => syncFromSheets()} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-800 transition-all">
               {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSync className="w-4 h-4" />}
               {isLoading ? 'Sincronizando...' : 'Sincronizar Agora'}
             </button>
             <button onClick={() => setUser(null)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400"><LogOut className="w-5 h-5" /> <span className="font-medium">Sair</span></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <button className="lg:hidden p-2 text-slate-600" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
          <div className="flex items-center gap-4">
             {isAutoSyncing && (
               <div className="flex items-center gap-2 text-blue-500 animate-pulse">
                 <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Sincronia Automática</span>
               </div>
             )}
             {isPeakSync && !isAutoSyncing && (
               <div className="hidden sm:flex items-center gap-2 text-amber-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                 <Zap className="w-3 h-3 fill-current" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Pico (15min)</span>
               </div>
             )}
             {lastSync && !isAutoSyncing && (
               <span className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">Sincronia: {lastSync}</span>
             )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {syncError && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-4"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{syncError}</p></div>}
          {syncSuccess && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-700 animate-in slide-in-from-top-4"><CheckCircle2 className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{syncSuccess}</p></div>}
          
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={alunos.length} turmasCount={turmas.length} turmas={turmas} presencas={presencas} alunos={alunos} matriculas={matriculas} onNavigate={setCurrentView} />}
          {currentView === 'frequencia' && <Frequencia turmas={turmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={handleSavePresencas} currentUser={user} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={presencas} matriculas={matriculas} experimentais={experimentais} />}
          {currentView === 'turmas' && <TurmasList turmas={turmas} matriculas={matriculas} alunos={alunos} currentUser={user} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
          {currentView === 'preparacao' && <PreparacaoTurmas currentUser={user} alunos={alunos} turmas={turmas} matriculas={matriculas} />}
          {currentView === 'experimental' && <AulasExperimentais experimentais={experimentais} currentUser={user} turmas={turmas} onUpdate={handleUpdateExperimental} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} user={user} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} />}
          {currentView === 'churn-risk' && <ChurnRiskManagement alunos={alunos} matriculas={matriculas} presencas={presencas} turmas={turmas} acoesRealizadas={acoesRetencao} onRegistrarAcao={handleRegistrarAcao} currentUser={user} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} />}
          
          {currentView === 'settings' && isMaster && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Conexão Google Sheets</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Integração via Apps Script</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">URL da Implantação (Web App)</label>
                    <div className="relative">
                      <Code className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="text" 
                        value={apiUrl === DEFAULT_API_URL ? '' : apiUrl} 
                        onChange={(e) => setApiUrl(e.target.value)} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-mono text-xs focus:border-blue-500 transition-all" 
                        placeholder="https://script.google.com/macros/s/..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Integração WhatsApp</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Webhook & Automação Comercial</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">URL do Webhook</label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        value={whatsappApiUrl} 
                        onChange={(e) => setwhatsappApiUrl(e.target.value)} 
                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-mono text-xs focus:border-green-500 transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Token de Acesso (API Key)</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="password" 
                        value={whatsappToken} 
                        onChange={(e) => setWhatsappToken(e.target.value)} 
                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-mono text-xs focus:border-green-500 transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Save className="w-6 h-6" />
                  Salvar Configurações
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
