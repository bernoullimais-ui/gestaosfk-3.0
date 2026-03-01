
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  LayoutDashboard,
  GraduationCap, 
  CheckCircle2, 
  CloudSync,
  RefreshCw,
  AlertCircle,
  Settings,
  ShieldCheck,
  ClipboardList,
  FlaskConical,
  Contact2,
  UserX,
  CheckCircle,
  Activity,
  Layers,
  DollarSign,
  BarChart3,
  MapPin,
  Save,
  Webhook,
  Link2,
  FileText,
  MessageSquare,
  MessageCircle,
  Globe,
  Loader2,
  Cpu,
  Shield,
  CreditCard,
  ClipboardCheck
} from 'lucide-react';
import { Aluno, Turma, Matricula, Presenca, Usuario, ViewType, AulaExperimental, AcaoRetencao, IdentidadeConfig, UnidadeMapping, CancelamentoRecord, AvaliacaoRecord, Ocorrencia } from './types';
import { INITIAL_USUARIOS } from './constants';
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
import Financeiro from './components/Financeiro';
import Avaliacao from './components/Avaliacao';
import OcorrenciasView from './components/OcorrenciasView';

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycby3gVqOg4dHFFZSJV1co4pjyJp_ZXnje521z86tVSUhI7AA8njGUwNAA7nRdbXp3RxXHw/exec";

const normalizeStr = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

const normalizeAggressive = (t: any) => 
  normalizeStr(t).replace(/[^a-z0-9]/g, '');

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [bootMessage, setBootMessage] = useState("Otimizando Planilha Unificada...");
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [viewContext, setViewContext] = useState<{ date?: string; unidade?: string; turmaId?: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('sfk_script_url') || DEFAULT_API_URL);
  const [identidades, setIdentidades] = useState<IdentidadeConfig[]>(() => JSON.parse(localStorage.getItem('sfk_identidades') || '[]'));
  const [unidadesMapping, setUnidadesMapping] = useState<UnidadeMapping[]>(() => JSON.parse(localStorage.getItem('sfk_unidades_mapping') || '[]'));
  const [dataInicialAvaliacao, setDataInicialAvaliacao] = useState(() => localStorage.getItem('sfk_data_inicial_avaliacao') || '');
  const [dataFinalAvaliacao, setDataFinalAvaliacao] = useState(() => localStorage.getItem('sfk_data_final_avaliacao') || '');

  const [alunos, setAlunos] = useState<Aluno[]>(() => JSON.parse(localStorage.getItem('sfk_alunos') || '[]'));
  const [turmas, setTurmas] = useState<Turma[]>(() => JSON.parse(localStorage.getItem('sfk_turmas') || '[]'));
  const [matriculas, setMatriculas] = useState<Matricula[]>(() => JSON.parse(localStorage.getItem('sfk_matriculas') || '[]'));
  const [presencas, setPresencas] = useState<Presenca[]>(() => JSON.parse(localStorage.getItem('sfk_presencas') || '[]'));
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => JSON.parse(localStorage.getItem('sfk_usuarios') || JSON.stringify(INITIAL_USUARIOS)));
  const [experimentais, setExperimentais] = useState<AulaExperimental[]>(() => JSON.parse(localStorage.getItem('sfk_experimentais') || '[]'));
  const [acoesRetencao, setAcoesRetencao] = useState<AcaoRetencao[]>(() => JSON.parse(localStorage.getItem('sfk_acoes_retencao') || '[]'));
  const [cancelamentos, setCancelamentos] = useState<CancelamentoRecord[]>(() => JSON.parse(localStorage.getItem('sfk_cancelamentos') || '[]'));
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoRecord[]>(() => JSON.parse(localStorage.getItem('sfk_avaliacoes') || '[]'));
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(() => JSON.parse(localStorage.getItem('sfk_ocorrencias') || '[]'));

  useEffect(() => {
    localStorage.setItem('sfk_identidades', JSON.stringify(identidades));
    localStorage.setItem('sfk_unidades_mapping', JSON.stringify(unidadesMapping));
    localStorage.setItem('sfk_data_inicial_avaliacao', dataInicialAvaliacao);
    localStorage.setItem('sfk_data_final_avaliacao', dataFinalAvaliacao);
    localStorage.setItem('sfk_alunos', JSON.stringify(alunos));
    localStorage.setItem('sfk_turmas', JSON.stringify(turmas));
    localStorage.setItem('sfk_matriculas', JSON.stringify(matriculas));
    localStorage.setItem('sfk_presencas', JSON.stringify(presencas));
    localStorage.setItem('sfk_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('sfk_experimentais', JSON.stringify(experimentais));
    localStorage.setItem('sfk_acoes_retencao', JSON.stringify(acoesRetencao));
    localStorage.setItem('sfk_cancelamentos', JSON.stringify(cancelamentos));
    localStorage.setItem('sfk_avaliacoes', JSON.stringify(avaliacoes));
    localStorage.setItem('sfk_ocorrencias', JSON.stringify(ocorrencias));
  }, [identidades, unidadesMapping, dataInicialAvaliacao, dataFinalAvaliacao, alunos, turmas, matriculas, presencas, usuarios, experimentais, acoesRetencao, cancelamentos, avaliacoes, ocorrencias]);

  useEffect(() => {
    if (!isBooting) return;
    const messages = [
      "Conectando ao Google Cloud...",
      "Validando Credenciais SFK...",
      "Processando Base de Estudantes...",
      "Sincronizando Matrículas Ativas...",
      "Configurando Unidades e Turmas...",
      "Iniciando Dashboard Inteligente..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setBootMessage(messages[i]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isBooting]);

  const handleLogin = (loggedUser: Usuario) => {
    setUser(loggedUser);
    const nivelNorm = normalizeStr(loggedUser.nivel || '');
    setCurrentView(nivelNorm === 'regente' ? 'preparacao' : 'dashboard');
  };

  const parseSheetDate = (dateVal: any): string => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null' || String(dateVal) === '0') return "";
    try {
      let s = String(dateVal).trim().toLowerCase();
      
      // Remove tudo após a vírgula (tempo, sufixos relativos)
      if (s.includes(',')) s = s.split(',')[0].trim();
      
      // Remove sufixos de tempo relativo que podem não ter vírgula
      s = s.replace(/há\s+\d+\s+horas?/g, '').replace(/há\s+\d+\s+minutos?/g, '').trim();
      s = s.replace(/ano\s+passado/g, '').replace(/há\s+\d+\s+anos/g, '').trim();
      s = s.replace(/\d{1,2}:\d{2}.*$/, '').trim(); // Remove horários no final
      
      const ptMonths: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
      
      // Formato: 01 de fev. de 2026
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) return `${ptMatch[3]}-${ptMonths[ptMatch[2]] || '01'}-${ptMatch[1].padStart(2, '0')}`;
      
      // Formato ISO: 2026-02-01
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return isoMatch[0];
      
      // Formato: 19/2/26 ou 19/02/2026
      const slashMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{1,4})/);
      if (slashMatch) {
        const dia = slashMatch[1].padStart(2, '0');
        const mes = slashMatch[2].padStart(2, '0');
        let ano = slashMatch[3];
        if (ano.length === 2) {
          const yearNum = parseInt(ano);
          ano = yearNum > 70 ? "19" + ano : "20" + ano;
        } else if (ano.length === 1) {
          ano = "200" + ano;
        }
        return `${ano}-${mes}-${dia}`;
      }
      
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return "";
  };

  const parseSheetTime = (dateVal: any): string => {
    if (!dateVal) return "";
    const s = String(dateVal).trim();
    const timeMatch = s.match(/(\d{1,2}:\d{2})/);
    return timeMatch ? timeMatch[1] : "";
  };

  const syncFromSheets = useCallback(async (isSilent: boolean = false) => {
    if (!apiUrl) return false;
    if (!isSilent) setIsLoading(true);
    setSyncError(null);
    try {
      const response = await fetch(`${apiUrl}?t=${Date.now()}`);
      const data = await response.json();
      
      const normalizedData: any = {};
      for (const k in data) {
        const nk = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        normalizedData[nk] = data[k];
      }

      const normalizeData = (arr: any[]) => {
        if (!arr || !Array.isArray(arr)) return [];
        return arr.filter(obj => obj && typeof obj === 'object').map(obj => {
          const normalized: any = {};
          for (const key in obj) {
            const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
            normalized[normalizedKey] = obj[key];
          }
          return normalized;
        });
      };

      const findSheetData = (prefixes: string[]) => {
        const normPrefixes = prefixes.map(p => normalizeStr(p).replace(/[^a-z0-9]/g, ''));
        // 1. Tenta match exato primeiro (após normalização)
        for (const k in normalizedData) {
          if (normPrefixes.includes(k)) return normalizedData[k];
        }
        // 2. Tenta startsWith
        for (const k in normalizedData) {
          if (normPrefixes.some(p => k.startsWith(p))) return normalizedData[k];
        }
        // 3. Tenta se o prefixo está contido na chave
        for (const k in normalizedData) {
          if (normPrefixes.some(p => k.includes(p))) return normalizedData[k];
        }
        return [];
      };

      const baseData = normalizeData(findSheetData(['base']));
      const experimentalData = normalizeData(findSheetData(['experimental', 'experimentais', 'lead']));
      const cancelamentoData = normalizeData(findSheetData(['cancelamento', 'cancelamentos', 'canc', 'retencao', 'churn', 'saida']));
      const turmasData = normalizeData(findSheetData(['turma', 'turmas']));
      const frequenciaData = normalizeData(findSheetData(['frequencia', 'presenca', 'presencas']));
      const usuariosData = normalizeData(findSheetData(['usuario', 'usuarios', 'login']));
      const configData = normalizeData(findSheetData(['configuracao', 'configuracoes', 'config']));
      const mappingData = normalizeData(findSheetData(['unidadesmapping', 'unidades', 'mapping']));
      const avaliacaoData = normalizeData(findSheetData(['avaliacao', 'avaliacoes', 'ficha']));
      const ocorrenciaData = normalizeData(findSheetData(['ocorrencia', 'ocorrencias']));

      const configsFromSheet = configData.map((c: any) => ({
        nome: c.identidade || c.nome || "Padrão",
        webhookUrl: c.webhook || c.webhookurl || "",
        tplLembrete: c.templatelembrete || "",
        tplFeedback: c.templatefeedback || c.templatefeddback || "",
        tplRetencao: c.templateretencao || "",
        tplMensagem: c.templatemensagem || "",
        tplReagendar: c.templatereagendar || "",
        tplAvaliacao: c.templateavaliacao || "",
        folderIdDrive: c.folderiddrive || c.folderid || ""
      }));
      setIdentidades(configsFromSheet);

      const mappingFromSheet = mappingData.map((u: any) => ({
        nome: u.unidade || u.nome || "",
        identidade: u.identidade || ""
      })).filter((m: any) => m.nome !== "");
      setUnidadesMapping(mappingFromSheet);

      if (configData[0]?.scripturl) setApiUrl(configData[0].scripturl);
      if (configData[0]?.datainicialavaliacao) setDataInicialAvaliacao(parseSheetDate(configData[0].datainicialavaliacao));
      if (configData[0]?.datafinalavaliacao) setDataFinalAvaliacao(parseSheetDate(configData[0].datafinalavaliacao));

      const cleanPhone = (p: any): string => {
        if (!p) return "";
        let s = String(p).trim();
        let digits = s.replace(/\D/g, '');
        if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.substring(2);
        return digits;
      };

      const studentsMap = new Map<string, Aluno>();
      const generatedMatriculas: Matricula[] = [];
      const studentActiveCoursesMap = new Map<string, string[]>();

      baseData.forEach((item: any, idx: number) => {
        const nomeRaw = (item.estudante || item.nome || item.aluno || item.nomecompleto || `${item.cliente || ''} ${item.sobrenome || ''}`.trim() || "").toString().trim();
        const unidadeRaw = item.unidade || item.escola || item.unid || "";
        if (!nomeRaw) return;
        
        const studentKey = `${normalizeStr(nomeRaw)}-${normalizeStr(unidadeRaw)}`;
        const dMat = parseSheetDate(item.dtmatricul || item.dtmatricula || item.datamatricula || item.matricula || item.data_matricula || item.datadeentrada || item.datainicio);
        const dCanc = parseSheetDate(item.dtcancelamento || item.dtcancel || item.cancelamento || item.datacancelamento || item.data_cancelamento || item.datadesaida || item.datafim);
        const statusRaw = normalizeStr(item.status || item.situacao || item.matriculastatus || item.estado || item.status_matricula || "");
        const isActiveStatus = statusRaw === 'ativo' || statusRaw === 'atv' || statusRaw === 'matriculado' || statusRaw === 'confirmado' || statusRaw === 'sim';
        let rawPlano = item.turma || item.curso || item.matriculas_ativas || item.matriculasativas || item.plano || item.modalidade || item.atividade || "";
        
        // Limpeza cuidadosa: remove apenas o conteúdo de parênteses individuais, sem truncar a string toda
        if (rawPlano && typeof rawPlano === 'string') {
          rawPlano = rawPlano.replace(/\s*\([^)]*\)/g, '').trim();
        }

        if (!studentsMap.has(studentKey)) {
          studentsMap.set(studentKey, {
            id: `aluno-${studentKey}`,
            nome: nomeRaw,
            unidade: unidadeRaw,
            dataNascimento: parseSheetDate(item.nascimento || item.datanascimento || item.dt_nascimento || item.data_nascimento),
            contato: cleanPhone(item.whatsapp1 || item.whatsapp2 || item.telefone || item.celular || item.contato),
            etapa: item.estagioanoescolar || item.etapa || item.etapaanoescolar || item.escolaridade || item.serie || "",
            anoEscolar: item.anoescolar || item.ano || item.serie || item.anoserie || item.ano_escolar || "",
            turmaEscolar: (item.turmaescolar || item.turma || item.turma_escolar || item.classe || "").toString().replace(/turma\s*/gi, '').trim(),
            dataMatricula: dMat,
            dataCancelamento: dCanc,
            responsavel1: item.responsavel1 || item.responsavel || item.nome_responsavel || "",
            whatsapp1: cleanPhone(item.whatsapp1 || item.whatsapp || item.tel_responsavel),
            responsavel2: item.responsavel2 || "",
            whatsapp2: cleanPhone(item.whatsapp2),
            email: item.email || item.e_mail || item.contato_email || item.contatoemail || item.mail || item.correioeletronico || "",
            statusMatricula: isActiveStatus ? 'Ativo' : (statusRaw.includes('lead') || statusRaw.includes('interessado') ? 'Lead' : 'Cancelado'),
            cursosCanceladosDetalhes: [],
            isLead: statusRaw.includes('lead') || statusRaw.includes('interessado'),
            plano: item.plano || item.pacote || item.curso || item.modalidade || rawPlano || ""
          });
        }

        const student = studentsMap.get(studentKey)!;
        
        const isMoreRecent = !student.dataMatricula || (dMat && dMat >= student.dataMatricula);
        if (isMoreRecent) {
          student.responsavel1 = item.responsavel1 || student.responsavel1;
          student.whatsapp1 = cleanPhone(item.whatsapp1) || student.whatsapp1;
          student.responsavel2 = item.responsavel2 || student.responsavel2;
          student.whatsapp2 = cleanPhone(item.whatsapp2) || student.whatsapp2;
          student.email = item.email || item.e_mail || item.contato_email || item.contatoemail || item.mail || student.email;
          student.etapa = item.estagioanoescolar || item.etapa || item.etapaanoescolar || student.etapa;
          student.anoEscolar = item.anoescolar || item.ano || item.serie || item.anoserie || student.anoEscolar;
          student.turmaEscolar = (item.turmaescolar || item.turma || "").toString().replace(/turma\s*/gi, '').trim() || student.turmaEscolar;
          student.dataMatricula = dMat || student.dataMatricula;
          student.plano = item.plano || item.pacote || item.curso || item.modalidade || rawPlano || student.plano;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const isRowActive = isActiveStatus && (!dCanc || dCanc >= todayStr);
        
        const isMatriculaValida = rawPlano && (isActiveStatus || statusRaw === 'cancelado' || dCanc);
        
        if (isMatriculaValida) {
          generatedMatriculas.push({ 
            id: `mat-${idx}`, 
            alunoId: student.id, 
            turmaId: `${normalizeStr(rawPlano)}-${normalizeStr(unidadeRaw)}`, 
            unidade: unidadeRaw, 
            dataMatricula: dMat,
            dataCancelamento: dCanc,
            plano: item.plano || item.pacote || item.curso || item.modalidade || rawPlano || ""
          });
        }

        if (isRowActive) {
          // Se encontrarmos uma linha ativa, o status do aluno deve ser Ativo
          // mesmo que outras linhas (antigas) digam o contrário
          student.statusMatricula = 'Ativo';
          student.dataCancelamento = ""; // Limpa data de cancelamento se houver linha ativa
          if (rawPlano) {
            const existingCourses = studentActiveCoursesMap.get(studentKey) || [];
            studentActiveCoursesMap.set(studentKey, [...existingCourses, rawPlano]);
          }
        } else if (dCanc || statusRaw === 'cancelado') {
          // Só atualiza a data de cancelamento global se o aluno não estiver ativo por outra linha
          if (student.statusMatricula !== 'Ativo') {
            if (dCanc && (!student.dataCancelamento || dCanc > student.dataCancelamento)) {
              student.dataCancelamento = dCanc;
              student.statusMatricula = 'Cancelado';
            }
          }
          if (rawPlano) {
            student.cursosCanceladosDetalhes!.push({ nome: rawPlano, unidade: unidadeRaw, dataMatricula: dMat, dataCancelamento: dCanc, plano: item.plano || item.pacote || item.curso || item.modalidade || rawPlano || "" });
          }
        }
      });

      setAlunos(Array.from(studentsMap.values()));
      setTurmas(turmasData.map((t: any) => ({
        ...t,
        id: t.id || `${normalizeStr(t.nome || t.turma || t.curso || t.modalidade || "")}-${normalizeStr(t.unidade || t.escola || t.unid || "")}`,
        nome: t.nome || t.turma || t.curso || t.modalidade || "",
        unidade: t.unidade || t.escola || t.unid || "",
        horario: t.horario || t.hora || "",
        professor: t.professor || t.instrutor || t.prof || "",
        capacidade: Number(t.capacidadedaturma || t.capacidade || t.vagas || 20),
        valorMensal: t.valormensal || t.valor || t.custo || t.mensalidade || t.preco || 0,
        identidade: t.identidade || t.canal || "",
        dataInicio: parseSheetDate(t.inicio || t.datainicio || "")
      })));
      setMatriculas(generatedMatriculas);
      setExperimentais(experimentalData.map((e: any, idx: number) => {
        const studentKey = `${normalizeStr(e.estudante || e.nome || "")}-${normalizeStr(e.unidade || e.escola || "")}`;
        const jaMatriculado = (studentActiveCoursesMap.get(studentKey) || []).some(ac => normalizeStr(ac).includes(normalizeStr(e.modalidade || e.curso || "")));
        return {
          ...e,
          id: `exp-${idx}`,
          estudante: e.estudante || e.nome || "",
          responsavel1: e.paimae || e.responsavel1 || "",
          unidade: e.unidade || e.escola || "",
          curso: e.modalidade || e.curso || "",
          aula: parseSheetDate(e.aula || e.data),
          horario: parseSheetTime(e.aula || e.data),
          whatsapp1: cleanPhone(e.whatsapp1 || e.whatsapp),
          status: e.status || "Pendente",
          observacaoProfessor: e.feedback || "",
          lembreteEnviado: String(e.lembrete || '').toLowerCase() === 'true',
          followUpSent: String(e.enviado || '').toLowerCase() === 'true',
          convertido: jaMatriculado || String(e.conversao || '').toLowerCase() === 'true',
          convertidoNaPlanilha: String(e.conversao || '').toLowerCase() === 'true',
          reagendarEnviado: String(e.reagendar || "").toLowerCase() === 'true',
          etapa: e.etapa || e.escolaridade || e.etapaoaescolar || e.etapaanoescolar || e.estagioanoescolar || "",
          anoEscolar: e.anoescolar || e.anoserie || e.ano || e.serie || "",
          turmaEscolar: e.turmaescolar || e.turma || ""
        };
      }));
      setUsuarios([...INITIAL_USUARIOS.filter(u => u.nivel === 'Gestor Master' || u.nivel === 'Start'), ...usuariosData.map((u: any) => ({ nome: u.nome || u.login || "", login: u.login || "", senha: String(u.senha || ""), nivel: u.nivel || "Professor", unidade: u.unidades || u.unidade || "" }))]);
      // Mapeamento de Presenças com De-duplicação (Pega o último registro para cada Aluno/Turma/Data)
      const presencasMap = new Map<string, Presenca>();
      frequenciaData.forEach((p: any, idx: number) => {
        const aId = p.estudante || p.aluno || p.nome || p.alunoid || "";
        const tId = p.turma || p.curso || p.modalidade || p.turmaid || "";
        const dStr = parseSheetDate(p.data);
        
        if (!aId || !dStr) return;
        
        const key = `${normalizeStr(aId)}|${normalizeStr(tId)}|${dStr}`;
        presencasMap.set(key, {
          id: `pres-${idx}`,
          alunoId: aId,
          unidade: p.unidade || p.escola || p.unid || p.unidadeativa || "",
          turmaId: tId,
          data: dStr,
          status: p.status || p.presenca || p.frequencia || "Ausente",
          observacao: p.observacao || p.obs || p.feedback || p.comentario || "",
          alarme: p.alarme || p.notificacao || p.alerta || "",
          timestampInclusao: p.datadoregistro || p.datainclusao || p.timestamp || p.data_registro || p.datainclusao || ""
        });
      });
      setPresencas(Array.from(presencasMap.values()));

      const cancelamentosFromSheet = cancelamentoData.map((c: any) => ({
        estudante: (c.estudante || c.nome || c.aluno || `${c.cliente || ''} ${c.sobrenome || ''}`.trim() || "").toString().trim(),
        unidade: c.unidade || c.escola || c.unid || "",
        plano: c.plano || c.curso || c.modalidade || c.atividade || c.pacote || "",
        email: c.email || c.e_mail || c.contato_email || c.contatoemail || "",
        dataInicio: parseSheetDate(c.datainicio || c.inicio || c.data_inicio || c.datadeinicio || c.matricula || c.datamatricula || c.dtmatricula || c.dtmatricul),
        dataFim: parseSheetDate(c.datafim || c.fim || c.data_fim || c.datadefim || c.cancelamento || c.datacancelamento || c.dtcancelamento || c.dtcancel),
        confirmado: String(c.confirma || c.confirmado || "").toLowerCase() === 'true' || String(c.concluido || "").toLowerCase() === 'true'
      })).filter(c => !c.confirmado);
      setCancelamentos(cancelamentosFromSheet);

      const avaliacoesFromSheet = avaliacaoData.map((a: any, idx: number) => ({
        id: a.id || a.codigo || a.cod || `av-${idx}`,
        dataRegistro: parseSheetDate(a.dataregistro || a.data || ""),
        estudante: a.estudante || a.aluno || "",
        turma: a.turma || a.curso || "",
        professor: a.professor || a.prof || "",
        s1: Number(a.socializacao1 || 0),
        s2: Number(a.socializacao2 || 0),
        s3: Number(a.socializacao3 || 0),
        s4: Number(a.socializacao4 || 0),
        r5: Number(a.relacao5 || 0),
        r6: Number(a.relacao6 || 0),
        r7: Number(a.relacao7 || 0),
        r8: Number(a.relacao8 || 0),
        c9: Number(a.colegas9 || 0),
        c10: Number(a.colegas10 || 0),
        c11: Number(a.colegas11 || 0),
        c12: Number(a.colegas12 || 0),
        c13: Number(a.colegas13 || 0),
        e14: Number(a.envolvimento14 || 0),
        e15: Number(a.envolvimento15 || 0),
        e16: Number(a.envolvimento16 || 0),
        e17: Number(a.envolvimento17 || 0),
        obs1: a.observacao1 || a.obs1 || "",
        obs2: a.observacao2 || a.obs2 || "",
        unidade: a.unidade || "",
        realizada: String(a.realizada || "").toLowerCase() === 'true',
        confirmacaoEnvio: String(a.confirmacaoenvio || a.confirmacaodeenvio || "").toLowerCase() === 'true'
      }));
      setAvaliacoes(avaliacoesFromSheet);

      const ocorrenciasFromSheet = ocorrenciaData.map((o: any, idx: number) => ({
        id: o.id || `oc-${idx}`,
        data: parseSheetDate(o.data || o.datadaocorrencia || ""),
        unidade: o.unidade || "",
        estudante: o.estudante || o.aluno || "",
        observacao: o.observacao || o.observacaoregistrada || "",
        usuario: o.usuario || o.operador || ""
      }));
      setOcorrencias(ocorrenciasFromSheet);

      // Auto-sync cancelamentos se for Gestor Master e houver pendências
      const nivelNorm = user ? normalizeStr(user.nivel || '') : '';
      const isPrivileged = nivelNorm === 'gestor master' || nivelNorm === 'start' || nivelNorm === 'gestor administrativo' || nivelNorm === 'gestor' || nivelNorm === 'gestor operacional';
      
      if (isPrivileged && !isSilent && cancelamentosFromSheet.length > 0) {
        // Pequeno delay para garantir que o estado local foi processado (opcional, mas ajuda na UX)
        setTimeout(() => {
          handleSyncCancellations(cancelamentosFromSheet, baseData, turmasData, baseData);
        }, 500);
      }

      return true;
    } catch (e) {
      if (!isSilent) setSyncError("Erro na sincronização.");
      return false;
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [apiUrl, normalizeStr]);

  useEffect(() => {
    if (!isBooting) return;
    const boot = async () => { await syncFromSheets(true); setIsBooting(false); };
    boot();
  }, [syncFromSheets, isBooting]);

  const handleUpdateExperimental = async (updated: AulaExperimental) => {
    setIsLoading(true);
    try {
      const cleanUrl = apiUrl.trim();
      const payload = { 
        action: 'save_experimental', 
        data: { 
          estudante: updated.estudante, 
          curso: updated.curso, 
          modalidade: updated.curso,
          unidade: updated.unidade,
          status: updated.status, 
          feedback: updated.observacaoProfessor, 
          enviado: updated.followUpSent ? "TRUE" : "FALSE", 
          conversao: updated.convertido ? "TRUE" : "FALSE", 
          convertido: updated.convertido ? "TRUE" : "FALSE", 
          lembrete: updated.lembreteEnviado ? "TRUE" : "FALSE", 
          reagendar: updated.reagendarEnviado ? "TRUE" : "FALSE" 
        } 
      };

      await fetch(cleanUrl, { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      });

      setExperimentais(prev => prev.map(e => e.id === updated.id ? { ...updated, convertidoNaPlanilha: updated.convertido } : e));
      setSyncSuccess("Planilha Atualizada!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) { 
      console.error("Erro ao salvar experimental:", e);
      setSyncError("Erro ao gravar na planilha."); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSyncConversions = async () => {
    const pending = experimentais.filter(e => e.convertido && !e.convertidoNaPlanilha);
    if (pending.length === 0) {
      setSyncSuccess("Tudo atualizado!");
      setTimeout(() => setSyncSuccess(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      for (const exp of pending) {
        const payload = { 
          action: 'save_experimental', 
          data: { 
            estudante: exp.estudante, 
            curso: exp.curso, 
            modalidade: exp.curso,
            unidade: exp.unidade,
            status: exp.status, 
            feedback: exp.observacaoProfessor, 
            enviado: exp.followUpSent ? "TRUE" : "FALSE", 
            conversao: "TRUE", 
            convertido: "TRUE", 
            lembrete: exp.lembreteEnviado ? "TRUE" : "FALSE", 
            reagendar: exp.reagendarEnviado ? "TRUE" : "FALSE" 
          } 
        };
        await fetch(apiUrl.trim(), { method: 'POST', body: JSON.stringify(payload) });
      }
      setExperimentais(prev => prev.map(e => {
        const isPending = pending.some(p => p.id === e.id);
        return isPending ? { ...e, convertidoNaPlanilha: true } : e;
      }));
      setSyncSuccess(`${pending.length} Conversões Sincronizadas!`);
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Erro na sincronização.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAvaliacao = async (record: AvaliacaoRecord) => {
    setIsLoading(true);
    try {
      const payload = {
        action: 'save_avaliacao',
        data: {
          id: record.id,
          dataRegistro: record.dataRegistro,
          estudante: record.estudante,
          turma: record.turma,
          professor: record.professor,
          socializacao1: record.s1,
          socializacao2: record.s2,
          socializacao3: record.s3,
          socializacao4: record.s4,
          relacao5: record.r5,
          relacao6: record.r6,
          relacao7: record.r7,
          relacao8: record.r8,
          colegas9: record.c9,
          colegas10: record.c10,
          colegas11: record.c11,
          colegas12: record.c12,
          colegas13: record.c13,
          envolvimento14: record.e14,
          envolvimento15: record.e15,
          envolvimento16: record.e16,
          envolvimento17: record.e17,
          observacao1: record.obs1,
          observacao2: record.obs2,
          unidade: record.unidade,
          realizada: record.realizada || false,
          confirmacaoEnvio: record.confirmacaoEnvio || false
        }
      };
      await fetch(apiUrl, { method: 'POST', body: JSON.stringify(payload) });
      
      setAvaliacoes(prev => {
        const exists = prev.find(a => a.id === record.id);
        if (exists) {
          return prev.map(a => a.id === record.id ? record : a);
        }
        return [record, ...prev];
      });
      setSyncSuccess("Avaliação Gravada!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Erro ao gravar avaliação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAluno = async (updated: Aluno, originalNome: string, originalUnidade: string, targetCurso?: string, toCurso?: string) => {
    setIsLoading(true);
    try {
      await fetch(apiUrl, { 
        method: 'POST', 
        body: JSON.stringify({ 
          action: 'save_aluno', 
          data: { 
            ...updated, 
            _originalNome: originalNome, 
            _originalUnidade: originalUnidade,
            _targetCurso: targetCurso,
            _toCurso: toCurso
          } 
        }) 
      });
      
      // Atualização local do estado
      if (targetCurso || toCurso) {
        // Se for cancelamento ou transferência, aguardamos um pouco para o Sheets processar
        // e forçamos um resync silencioso
        setTimeout(() => syncFromSheets(true), 1500);
      } else {
        setAlunos(prev => prev.map(a => a.id === updated.id ? updated : a));
      }

      setSyncSuccess(toCurso ? "Transferência Realizada!" : "Dados do Aluno Atualizados!");
      setTimeout(() => setSyncSuccess(null), 3000);
      
    } catch (e) { 
      setSyncError("Erro ao processar solicitação."); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleUpdateAlarmeRetencao = async (lastPresence: Presenca) => {
    setIsLoading(true);
    try {
      await fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'save_frequencia', data: [{ aluno: lastPresence.alunoId, unidade: lastPresence.unidade, turma: lastPresence.turmaId, data: lastPresence.data, status: lastPresence.status, observacao: lastPresence.observacao || "", alarme: 'Enviado' }] }) });
      setPresencas(prev => prev.map(p => (p.alunoId === lastPresence.alunoId && p.turmaId === lastPresence.turmaId && p.data === lastPresence.data) ? { ...p, alarme: 'Enviado' } : p));
      setSyncSuccess("Alarme Registrado!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) { setSyncError("Erro ao gravar alarme."); } finally { setIsLoading(false); }
  };

  const handleSyncCancellations = async (specificCancelamentos?: CancelamentoRecord[], specificAlunos?: any[], specificTurmas?: any[], specificMatriculas?: any[]) => {
    const nivelNorm = user ? normalizeStr(user.nivel || '') : '';
    const isPrivileged = nivelNorm === 'gestor master' || nivelNorm === 'start' || nivelNorm === 'gestor administrativo' || nivelNorm === 'gestor';
    if (!isPrivileged) return;
    
    const targetCancelamentos = Array.isArray(specificCancelamentos) ? specificCancelamentos : (cancelamentos || []);
    const targetAlunos = Array.isArray(specificAlunos) ? specificAlunos.map(a => ({
      ...a,
      id: a.estudante || a.nome || a.aluno || a.nomecompleto || ""
    })) : (alunos || []);
    
    const pendingCancellations = [];
    for (const cancel of targetCancelamentos) {
      const match = targetAlunos.find(a => {
        const aNome = a.estudante || a.nome || a.aluno || a.nomecompleto || "";
        const aEmail = a.email || a.e_mail || "";
        
        const nameOrEmailMatch = (aEmail && cancel.email && normalizeAggressive(aEmail) === normalizeAggressive(cancel.email)) ||
                                 (normalizeAggressive(aNome).includes(normalizeAggressive(cancel.estudante)) || normalizeAggressive(cancel.estudante).includes(normalizeAggressive(aNome)));
        
        if (!nameOrEmailMatch) return false;

        const statusRaw = normalizeStr(a.status || a.statusmatricula || a.status_matricula || a.statusMatricula || "");
        const isActiveStatus = statusRaw === 'ativo' || statusRaw === 'atv' || statusRaw === 'matriculado' || statusRaw === 'confirmado' || statusRaw === 'sim';
        
        // Se for dado bruto da planilha, também checamos a data de cancelamento para garantir que é a linha ativa
        const dCanc = parseSheetDate(a.dtcancelamento || a.dtcancel || a.cancelamento || a.datacancelamento || a.data_cancelamento || a.datadesaida || a.datafim || a.dataCancelamento);
        const todayStr = new Date().toISOString().split('T')[0];
        const isRowActive = isActiveStatus && (!dCanc || dCanc >= todayStr);

        // SÓ cancela se a linha na Base estiver ATIVA. Se já estiver cancelada, não faz nada.
        if (!isRowActive) return false;
        
        // NOVIDADE: Verifica se a data de matrícula na Base é MAIS RECENTE que a data de cancelamento solicitada.
        // Se for, o usuário provavelmente re-matriculou o aluno manualmente, então ignoramos o cancelamento antigo.
        const dMat = parseSheetDate(a.dtmatricul || a.dtmatricula || a.datamatricula || a.matricula || a.data_matricula || a.datainicio || a.dataMatricula);
        if (dMat && cancel.dataFim && dMat > cancel.dataFim) return false;

        // Se tivermos as matrículas e turmas específicas, validamos o plano
        if (specificMatriculas && specificTurmas) {
          const studentMatriculas = specificMatriculas.filter(m => (m.estudante || m.aluno || m.nome) === aNome);
          const planMatch = studentMatriculas.some(m => {
            const t = specificTurmas.find(turma => (turma.id || turma.nome) === (m.turma || m.turmaid));
            const tNome = t ? (t.nome || t.id) : (m.turma || m.turmaid);
            return normalizeAggressive(tNome).includes(normalizeAggressive(cancel.plano)) || normalizeAggressive(cancel.plano).includes(normalizeAggressive(tNome));
          }) || normalizeAggressive(a.plano || "").includes(normalizeAggressive(cancel.plano)) || normalizeAggressive(cancel.plano).includes(normalizeAggressive(a.plano || ""));
          return planMatch;
        }

        return true;
      });
      if (match) {
        pendingCancellations.push({ aluno: match, cancelInfo: cancel });
      }
    }

    if (pendingCancellations.length === 0) return;

    setIsLoading(true);
    try {
      for (const item of pendingCancellations) {
        const aNome = item.aluno.estudante || item.aluno.nome || item.aluno.aluno || item.aluno.nomecompleto || "";
        const aUnidade = item.aluno.unidade || item.aluno.escola || "";
        
        await fetch(apiUrl, { 
          method: 'POST', 
          body: JSON.stringify({ 
            action: 'save_aluno', 
            data: { 
              ...item.aluno,
              statusMatricula: 'Cancelado',
              dataCancelamento: item.cancelInfo.dataFim,
              _originalNome: aNome, 
              _originalUnidade: aUnidade,
              _targetCurso: item.cancelInfo.plano
            } 
          }) 
        });

        // Confirmar na aba Cancelamento (Coluna J - Confirma)
        await fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'save_cancelamento',
            data: {
              ...item.cancelInfo,
              confirma: 'TRUE',
              _originalEstudante: item.cancelInfo.estudante,
              _originalEmail: item.cancelInfo.email,
              _originalPlano: item.cancelInfo.plano
            }
          })
        });
      }
      await syncFromSheets(true);
      setSyncSuccess(`${pendingCancellations.length} cancelamentos processados automaticamente!`);
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Erro ao processar cancelamentos automáticos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOcorrencia = async (record: Ocorrencia) => {
    setIsLoading(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_ocorrencia',
          data: record
        })
      });
      setOcorrencias(prev => [record, ...prev]);
      setSyncSuccess("Ocorrência registrada com sucesso!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Erro ao registrar ocorrência.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (newConfig: { dataInicialAvaliacao: string; dataFinalAvaliacao: string }) => {
    setIsLoading(true);
    try {
      // Formata datas para o padrão brasileiro DD/MM/YYYY se necessário para a planilha
      const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      };

      await fetch(apiUrl.trim(), {
        method: 'POST',
        mode: 'no-cors', // Adicionado no-cors para evitar problemas de preflight em alguns scripts
        body: JSON.stringify({
          action: 'save_config',
          data: {
            datainicialavaliacao: formatDate(newConfig.dataInicialAvaliacao),
            datafinalavaliacao: formatDate(newConfig.dataFinalAvaliacao)
          }
        })
      });
      setDataInicialAvaliacao(newConfig.dataInicialAvaliacao);
      setDataFinalAvaliacao(newConfig.dataFinalAvaliacao);
      setSyncSuccess("Configurações Salvas!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Erro ao salvar configurações.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isBooting) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#020617] to-[#020617]" />
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
        <div className="mb-14 relative">
          <div className="absolute inset-0 bg-indigo-600 rounded-[50px] blur-[80px] opacity-40 animate-pulse" />
          <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-[40px] flex items-center justify-center border border-white/10 relative z-10">
            <Activity className="w-16 h-16 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center mb-16 space-y-2">
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter">GESTÃO SFK 3.0</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest opacity-80">SPORT FOR KIDS INTELLIGENCE</p>
        </div>
        <div className="w-full bg-white/5 backdrop-blur-2xl rounded-[40px] border border-white/10 p-10 shadow-2xl overflow-hidden group">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-14 h-14 bg-indigo-600/20 rounded-3xl flex items-center justify-center border border-indigo-500/30">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">SINCRONISMO</p>
              <p className="text-lg font-bold text-white uppercase truncate">{bootMessage}</p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} usuarios={usuarios} />;

  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start';
  const isGestorAdmin = user.nivel === 'Gestor Administrativo';
  const isGestorOp = user.nivel === 'Gestor Operacional';
  const isCoord = user.nivel === 'Coordenador';

  const todayStr = new Date().toISOString().split('T')[0];
  const isAvaliacaoPeriod = !dataInicialAvaliacao || !dataFinalAvaliacao || (todayStr >= dataInicialAvaliacao && todayStr <= dataFinalAvaliacao);
  const showAvaliacao = (user.nivel === 'Professor' && isAvaliacaoPeriod) || isMaster || isGestorAdmin;

  const handleNavigate = (view: ViewType, context?: { date?: string; unidade?: string; turmaId?: string }) => {
    setCurrentView(view);
    if (context) {
      setViewContext(context);
    } else {
      setViewContext(null);
    }
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#0f172a] overflow-hidden">
      {/* Overlay para Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#1e1b4b] text-white transform transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50 shadow-2xl lg:shadow-none`}>
        <div className="p-6 lg:p-8 flex flex-col h-full">
          <div className="mb-10 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tighter uppercase">Gestão SFK 3.0</h2>
          </div>
          
          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: user.nivel !== 'Regente' },
              { id: 'dados-alunos', label: 'Alunos', icon: Contact2, visible: isMaster || isCoord || isGestorAdmin },
              { id: 'turmas', label: 'Turmas', icon: GraduationCap, visible: user.nivel !== 'Regente' },
              { id: 'preparacao', label: 'Preparação', icon: ClipboardList, visible: true }, 
              { id: 'avaliacao', label: 'Avaliação', icon: ClipboardCheck, visible: showAvaliacao },
              { id: 'frequencia', label: 'Freqüência', icon: CheckCircle2, visible: user.nivel !== 'Regente' && user.nivel !== 'Gestor' && user.nivel !== 'Gestor Operacional' && user.nivel !== 'Gestor Administrativo' },
              { id: 'experimental', label: 'Experimentais', icon: FlaskConical, visible: true }, 
              { id: 'ocorrencias', label: 'Ocorrências', icon: AlertCircle, visible: isMaster || isGestorAdmin || isGestorOp },
              { id: 'relatorios', label: 'BI & Business', icon: BarChart3, visible: isMaster || user.nivel === 'Gestor' || user.nivel === 'Gestor Operacional' || isCoord || isGestorAdmin },
              { id: 'financeiro', label: 'Financeiro', icon: DollarSign, visible: isMaster },
              { id: 'churn-risk', label: 'Retenção', icon: UserX, visible: isMaster || isGestorAdmin }, 
              { id: 'usuarios', label: 'Equipe', icon: ShieldCheck, visible: isMaster },
              { id: 'settings', label: 'Configurações', icon: Settings, visible: isMaster },
            ].filter(i => i.visible).map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-white/5 space-y-4 shrink-0">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">OPERADOR</p>
              <p className="text-sm font-black truncate uppercase text-white">{user.nome || user.login}</p>
            </div>
            <button onClick={() => syncFromSheets()} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-900/40 text-white font-black text-[10px] tracking-widest uppercase hover:bg-indigo-900 transition-all">{isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSync className="w-4 h-4" />} Sincronizar</button>
            <button onClick={() => setUser(null)} className="w-full text-slate-400 hover:text-red-400 font-bold text-[10px] uppercase py-2">Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="h-20 bg-white border-b px-10 flex items-center justify-between shrink-0 z-20 shadow-sm">
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
          <div className="hidden lg:flex items-center gap-3 text-slate-400"><Layers className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">SFK & B+ / {currentView.toUpperCase()}</span></div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Unidade Ativa</p>
            <p className="text-xs font-black text-indigo-950 uppercase">{isMaster ? 'GESTÃO GLOBAL' : user.unidade}</p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={alunos.length} turmasCount={turmas.length} turmas={turmas} presencas={presencas} alunos={alunos} matriculas={matriculas} experimentais={experimentais} acoesRetencao={acoesRetencao} onNavigate={handleNavigate} onUpdateExperimental={handleUpdateExperimental} isLoading={isLoading} identidades={identidades} unidadesMapping={unidadesMapping} cancelamentos={cancelamentos} onSyncCancellations={handleSyncCancellations} onSyncConversions={handleSyncConversions} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} user={user} identidades={identidades} unidadesMapping={unidadesMapping} onUpdateAluno={handleUpdateAluno} />}
          {currentView === 'turmas' && <TurmasList turmas={turmas} matriculas={matriculas} alunos={alunos} currentUser={user} />}
          {currentView === 'frequencia' && <Frequencia turmas={turmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={async (recs) => { setIsLoading(true); try { await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_frequencia', data: recs }) }); setPresencas(prev => [...prev, ...recs]); setSyncSuccess("Freqüência Salva!"); setTimeout(() => setSyncSuccess(null), 3000); } catch (e) { setSyncError("Erro ao salvar."); } finally { setIsLoading(false); } }} currentUser={user} viewContext={viewContext} />}
          {currentView === 'preparacao' && <PreparacaoTurmas alunos={alunos} turmas={turmas} matriculas={matriculas} currentUser={user} onSaveOcorrencia={handleSaveOcorrencia} />}
          {currentView === 'avaliacao' && <Avaliacao alunos={alunos} turmas={turmas} matriculas={matriculas} avaliacoes={avaliacoes} currentUser={user} identidades={identidades} unidadesMapping={unidadesMapping} onSave={handleSaveAvaliacao} />}
          {currentView === 'ocorrencias' && <OcorrenciasView ocorrencias={ocorrencias} user={user} />}
          {currentView === 'experimental' && <AulasExperimentais experimentais={experimentais} alunosAtivos={alunos.filter(a => a.statusMatricula === 'Ativo')} currentUser={user} onUpdate={handleUpdateExperimental} turmas={turmas} identidades={identidades} unidadesMapping={unidadesMapping} viewContext={viewContext} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={presencas} matriculas={matriculas} experimentais={experimentais} user={user} />}
          {currentView === 'financeiro' && <Financeiro alunos={alunos} turmas={turmas} matriculas={matriculas} />}
          {currentView === 'churn-risk' && <ChurnRiskManagement alunos={alunos} matriculas={matriculas} presencas={presencas} turmas={turmas} acoesRealizadas={acoesRetencao} onRegistrarAcao={(a) => setAcoesRetencao(prev => [...prev, a])} onSheetAlarmeUpdate={handleUpdateAlarmeRetencao} currentUser={user} identidades={identidades} unidadesMapping={unidadesMapping} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
          {currentView === 'settings' && (
            <div className="space-y-12 animate-in fade-in max-w-5xl mx-auto">
              <div><h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Configurações</h2><p className="text-slate-500 font-medium">Gestão de API e múltiplas identidades de comunicação.</p></div>
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Globe className="w-6 h-6"/></div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">API Principal</h3>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/drive-health');
                        const data = await res.json();
                        if (data.status === 'ok') {
                          alert(`Conexão OK! Usuário: ${data.user.displayName} (${data.user.emailAddress})`);
                        } else {
                          alert(`Erro na Conexão: ${data.details || data.message}`);
                        }
                      } catch (e) {
                        alert("Erro ao testar conexão.");
                      }
                    }}
                    className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    Testar Google Drive
                  </button>
                </div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">URL do Google Script</label><input type="text" value={apiUrl} onChange={e => { setApiUrl(e.target.value); localStorage.setItem('sfk_script_url', e.target.value); }} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-xs" /></div>
              </div>
              
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><ClipboardCheck className="w-6 h-6"/></div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Período de Avaliação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Data Inicial</label>
                    <input 
                      type="date" 
                      value={dataInicialAvaliacao} 
                      onChange={e => setDataInicialAvaliacao(e.target.value)} 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-xs" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Data Final</label>
                    <input 
                      type="date" 
                      value={dataFinalAvaliacao} 
                      onChange={e => setDataFinalAvaliacao(e.target.value)} 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-xs" 
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleSaveConfig({ dataInicialAvaliacao, dataFinalAvaliacao })}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Período
                  </button>
                </div>
              </div>
              <div className="space-y-8">
                <div className="flex items-center gap-4"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><MessageSquare className="w-6 h-6"/></div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Identidades de Comunicação</h3></div>
                {identidades.map((ident, idx) => (
                  <div key={idx} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                      <h4 className="text-lg font-black text-indigo-600 uppercase tracking-widest">{ident.nome}</h4>
                      <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-400">ID: {idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Webhook URL</label><input type="text" readOnly value={ident.webhookUrl} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Feedback</label><textarea readOnly value={ident.tplFeedback} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Lembrete</label><textarea readOnly value={ident.tplLembrete} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                      </div>
                      <div className="space-y-4">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Retenção</label><textarea readOnly value={ident.tplRetencao} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Mensagem</label><textarea readOnly value={ident.tplMensagem} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Reagendamento</label><textarea readOnly value={ident.tplReagendar} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Avaliação</label><textarea readOnly value={ident.tplAvaliacao} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Folder ID Drive</label><input type="text" readOnly value={ident.folderIdDrive} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium" /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      {syncSuccess && <div className="fixed bottom-10 right-10 bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase flex items-center gap-3 z-50 border border-blue-400"><CheckCircle className="w-5 h-5" /> {syncSuccess}</div>}
      {syncError && <div className="fixed bottom-10 right-10 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase flex items-center gap-3 z-50"><AlertCircle className="w-5 h-5" /> {syncError}</div>}
    </div>
  );
};

export default App;
