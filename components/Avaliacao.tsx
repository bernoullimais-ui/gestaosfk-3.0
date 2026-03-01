
import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Users, 
  GraduationCap, 
  Calendar, 
  FileText, 
  Download, 
  Search, 
  ChevronDown, 
  AlertCircle,
  Save,
  CheckCircle2,
  X,
  User,
  BookOpen,
  MapPin,
  ArrowRight,
  RefreshCw,
  MessageCircle,
  Zap,
  Loader2
} from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario, AvaliacaoRecord, IdentidadeConfig, UnidadeMapping } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AvaliacaoProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  avaliacoes: AvaliacaoRecord[];
  currentUser: Usuario;
  identidades: IdentidadeConfig[];
  unidadesMapping: UnidadeMapping[];
  onSave: (record: AvaliacaoRecord) => Promise<void>;
}

const QUESTIONS = [
  { id: 's1', category: '1. Socialização', text: '1. A criança interage com os colegas durante as atividades propostas?' },
  { id: 's2', category: '1. Socialização', text: '2. Demonstra interesse em participar de atividades em grupo?' },
  { id: 's3', category: '1. Socialização', text: '3. Sabe esperar sua vez nas dinâmicas e jogos?' },
  { id: 's4', category: '1. Socialização', text: '4. Respeita regras de convivência estabelecidas em aula?' },
  { id: 'r5', category: '2. Relação com o Professor', text: '1. Demonstra confiança e abertura para conversar com o professor?' },
  { id: 'r6', category: '2. Relação com o Professor', text: '2. Segue instruções e orientações dadas durante as aulas?' },
  { id: 'r7', category: '2. Relação com o Professor', text: '3. Mostra respeito pelo professor e pelas regras estabelecidas?' },
  { id: 'r8', category: '2. Relação com o Professor', text: '4. Procura o professor para pedir ajuda quando necessário?' },
  { id: 'c9', category: '3. Relação com os Colegas', text: '1. Coopera com os colegas durante as atividades?' },
  { id: 'c10', category: '3. Relação com os Colegas', text: '2. Resolve conflitos de forma adequada ou com ajuda?' },
  { id: 'c11', category: '3. Relação com os Colegas', text: '3. Demonstra atitudes de incentivo ou apoio aos colegas?' },
  { id: 'c12', category: '3. Relação com os Colegas', text: '4. Aceita bem a diversidade de habilidades e estilos entre os colegas?' },
  { id: 'c13', category: '3. Relação com os Colegas', text: '5. Demonstra empatia ou cuidado com os colegas?' },
  { id: 'e14', category: '4. Envolvimento com a Temática das Aulas', text: '1. Mostra entusiasmo nas atividades da modalidade?' },
  { id: 'e15', category: '4. Envolvimento com a Temática das Aulas', text: '2. Participa ativamente das propostas, mesmo quando não domina a prática?' },
  { id: 'e16', category: '4. Envolvimento com a Temática das Aulas', text: '3. Demonstra evolução no engajamento ao longo do tempo?' },
  { id: 'e17', category: '4. Envolvimento com a Temática das Aulas', text: '4. Apresenta curiosidade sobre o conteúdo da modalidade praticada?' },
];

const Avaliacao: React.FC<AvaliacaoProps> = ({ alunos, turmas, matriculas, avaliacoes, currentUser, identidades, unidadesMapping, onSave }) => {
  const [selectedUnidade, setSelectedUnidade] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [obs1, setObs1] = useState('');
  const [obs2, setObs2] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; record: AvaliacaoRecord | null; message: string; identity?: IdentidadeConfig }>({ isOpen: false, record: null, message: '' });

  const isMaster = currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Start';
  const isGestorAdmin = currentUser.nivel === 'Gestor Administrativo';
  const isProfessor = currentUser.nivel === 'Professor';
  const isPrivileged = isMaster || isGestorAdmin;

  const [showHistory, setShowHistory] = useState(isPrivileged && !isProfessor);
  const [searchHistory, setSearchHistory] = useState('');

  const isManager = isMaster || isGestorAdmin || currentUser.nivel === 'Gestor' || currentUser.nivel === 'Gestor Operacional' || currentUser.nivel === 'Coordenador';

  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const myPermittedTurmas = useMemo(() => {
    let filtered = [...turmas];
    if (!isMaster) {
      if (isProfessor) {
        const profName = normalize(currentUser.nome || currentUser.login);
        filtered = filtered.filter(t => {
          const tProf = normalize(t.professor).replace(/^prof\.?\s*/i, '');
          return tProf.includes(profName) || profName.includes(tProf);
        });
      } else if (currentUser.unidade !== 'TODAS') {
        const userUnits = normalize(currentUser.unidade).split(',').map(u => u.trim()).filter(Boolean);
        filtered = filtered.filter(t => userUnits.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
      }
    }
    return filtered;
  }, [turmas, isMaster, isProfessor, currentUser]);

  const unidadesDisponiveis = useMemo(() => {
    const sets = new Set(myPermittedTurmas.map(t => t.unidade?.trim()).filter(Boolean));
    return Array.from(sets).sort();
  }, [myPermittedTurmas]);

  const displayTurmas = useMemo(() => {
    if (!selectedUnidade) return [];
    return myPermittedTurmas.filter(t => normalize(t.unidade) === normalize(selectedUnidade));
  }, [myPermittedTurmas, selectedUnidade]);

  const alunosDaTurma = useMemo(() => {
    if (!selectedTurmaId) return [];
    const targetTurma = turmas.find(t => t.id === selectedTurmaId);
    if (!targetTurma) return [];

    const tId = normalize(selectedTurmaId);
    const tNome = normalize(targetTurma.nome);
    const tUnidade = normalize(targetTurma.unidade);

    const ids = matriculas
      .filter(m => {
        const mTurmaId = normalize(m.turmaId);
        const mUnidade = normalize(m.unidade);
        const mCursoNome = mTurmaId.split('-')[0].trim();
        return (mUnidade === tUnidade || mUnidade === "") && 
               (mTurmaId === tId || mCursoNome === tNome || mTurmaId.startsWith(tNome + "-"));
      })
      .map(m => m.alunoId);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentSemester = currentMonth < 6 ? 1 : 2;

    return alunos
      .filter(a => ids.includes(a.id) && normalize(a.statusMatricula) === 'ativo')
      .map(a => {
        const jaRealizada = avaliacoes.some(av => {
          const avDate = new Date(av.dataRegistro);
          const avYear = avDate.getFullYear();
          const avMonth = avDate.getMonth();
          const avSemester = avMonth < 6 ? 1 : 2;
          return normalize(av.estudante) === normalize(a.nome) && 
                 normalize(av.turma) === normalize(targetTurma.nome) && 
                 avYear === currentYear && 
                 avSemester === currentSemester &&
                 av.realizada;
        });
        return { ...a, jaRealizada };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedTurmaId, matriculas, alunos, turmas, avaliacoes]);

  const handleSave = async () => {
    if (!isProfessor) {
      alert("Apenas professores podem registrar avaliações.");
      return;
    }
    if (!selectedAlunoId || !selectedTurmaId) return;
    
    const aluno = alunos.find(a => a.id === selectedAlunoId);
    const turma = turmas.find(t => t.id === selectedTurmaId);
    
    if (!aluno || !turma) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentSemester = currentMonth < 6 ? 1 : 2;

    const alreadyExists = avaliacoes.some(av => {
      const avDate = new Date(av.dataRegistro);
      const avYear = avDate.getFullYear();
      const avMonth = avDate.getMonth();
      const avSemester = avMonth < 6 ? 1 : 2;
      return normalize(av.estudante) === normalize(aluno.nome) && 
             normalize(av.turma) === normalize(turma.nome) && 
             avYear === currentYear && 
             avSemester === currentSemester;
    });

    if (alreadyExists) {
      alert("Este aluno já possui uma avaliação registrada para este semestre nesta modalidade.");
      return;
    }

    const missing = QUESTIONS.some(q => !scores[q.id]);
    if (missing) {
      alert("Por favor, preencha todas as avaliações da escala.");
      return;
    }

    setIsSaving(true);
    try {
      const record: AvaliacaoRecord = {
        id: Math.random().toString(36).substr(2, 9),
        dataRegistro: new Date().toISOString().split('T')[0],
        estudante: aluno.nome,
        turma: turma.nome,
        professor: turma.professor || currentUser.nome || currentUser.login,
        s1: scores.s1, s2: scores.s2, s3: scores.s3, s4: scores.s4,
        r5: scores.r5, r6: scores.r6, r7: scores.r7, r8: scores.r8,
        c9: scores.c9, c10: scores.c10, c11: scores.c11, c12: scores.c12, c13: scores.c13,
        e14: scores.e14, e15: scores.e15, e16: scores.e16, e17: scores.e17,
        obs1,
        obs2,
        unidade: turma.unidade,
        realizada: true,
        confirmacaoEnvio: false
      };
      await onSave(record);
      setScores({});
      setObs1('');
      setObs2('');
      setSelectedAlunoId('');
      alert("Avaliação salva com sucesso!");
      if (isPrivileged) setShowHistory(true);
    } catch (e) {
      alert("Erro ao salvar avaliação.");
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async (record: AvaliacaoRecord, shouldSave: boolean = true) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42);
    doc.text('Bernoulli +', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text('Ficha de Avaliação', pageWidth / 2, 30, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, pageWidth - 20, 35);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Nome do(a) estudante: ${record.estudante}`, 20, 45);
    doc.text(`Unidade: ${record.unidade}`, 20, 52);
    doc.text(`Modalidade: ${record.turma}`, 20, 59);
    doc.text(`Professor(a): ${record.professor}`, 20, 66);
    doc.text(`Data: ${record.dataRegistro.split('-').reverse().join('/')}`, 20, 73);

    // Scale Info
    doc.setFontSize(9);
    doc.text('Escala de avaliação: 1 - Nunca | 2 - Raramente | 3 - Às vezes | 4 - Frequentemente | 5 - Sempre', 20, 82);

    let y = 92;
    const categories = Array.from(new Set(QUESTIONS.map(q => q.category)));

    categories.forEach(cat => {
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text(cat, 20, y);
      y += 5;

      const catQuestions = QUESTIONS.filter(q => q.category === cat);
      catQuestions.forEach(q => {
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const score = (record as any)[q.id];
        doc.text(q.text, 25, y);
        doc.text(String(score), pageWidth - 30, y, { align: 'right' });
        
        doc.setDrawColor(241, 245, 249);
        doc.line(25, y + 2, pageWidth - 25, y + 2);
        y += 8;
      });
      y += 5;
    });

    // Observations
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('5. Observações', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Há alguma atitude ou comportamento relevante que merece destaque?', 20, y);
    y += 5;
    doc.setTextColor(51, 65, 85);
    const splitObs1 = doc.splitTextToSize(record.obs1 || 'Nenhuma observação registrada.', pageWidth - 40);
    doc.text(splitObs1, 20, y);
    y += (splitObs1.length * 5) + 5;

    doc.setTextColor(100, 116, 139);
    doc.text('Há algo que poderia ser feito para favorecer ainda mais a participação da criança?', 20, y);
    y += 5;
    doc.setTextColor(51, 65, 85);
    const splitObs2 = doc.splitTextToSize(record.obs2 || 'Nenhuma observação registrada.', pageWidth - 40);
    doc.text(splitObs2, 20, y);

    if (shouldSave) {
      doc.save(`Avaliacao_${record.estudante.replace(/\s+/g, '_')}_${record.dataRegistro}.pdf`);
    }
    return doc.output('datauristring');
  };

  const handleSendWebhook = async (record: AvaliacaoRecord) => {
    const student = alunos.find(a => normalize(a.nome) === normalize(record.estudante) && normalize(a.unidade) === normalize(record.unidade));
    if (!student || !student.whatsapp1) {
      alert("WhatsApp do Responsável 1 não encontrado para este estudante.");
      return;
    }

    const mapping = unidadesMapping.find(m => normalize(m.nome) === normalize(record.unidade));
    const ident = identidades.find(i => normalize(i.nome) === normalize(mapping?.identidade || ''));
    
    if (!ident || !ident.webhookUrl) {
      alert("Webhook não configurado para esta unidade.");
      return;
    }

    const responsavelNome = student.responsavel1?.split(' ')[0] || "Responsável";
    const template = ident.tplAvaliacao || "Olá {{responsavel}}, segue a avaliação socioafetiva de *{{estudante}}* referente à modalidade *{{turma}}*.";
    const message = template
      .replace(/{{responsavel}}/gi, responsavelNome)
      .replace(/{{paimae}}/gi, responsavelNome)
      .replace(/{{mae}}/gi, responsavelNome)
      .replace(/{{pai}}/gi, responsavelNome)
      .replace(/{{unidade}}/gi, record.unidade)
      .replace(/{{estudante}}/gi, record.estudante)
      .replace(/{{aluno}}/gi, record.estudante)
      .replace(/{{turma}}/gi, record.turma)
      .replace(/{{modalidade}}/gi, record.turma)
      .replace(/{{professor}}/gi, record.professor)
      .replace(/{{data}}/gi, record.dataRegistro.split('-').reverse().join('/'));

    setMessageModal({ isOpen: true, record, message, identity: ident });
  };

  const handleConfirmSend = async () => {
    if (!messageModal.record || !messageModal.identity) return;
    
    if (messageModal.record.confirmacaoEnvio) {
      alert("Esta avaliação já foi enviada anteriormente.");
      return;
    }

    setIsSending(true);
    const student = alunos.find(a => normalize(a.nome) === normalize(messageModal.record!.estudante) && normalize(a.unidade) === normalize(messageModal.record!.unidade));
    const fone = student?.whatsapp1?.replace(/\D/g, '');
    
    try {
      // 1. Gerar PDF
      const pdfBase64 = await generatePDF(messageModal.record, false);
      const fileName = `Avaliacao_${messageModal.record.estudante.replace(/\s+/g, '_')}_${messageModal.record.dataRegistro}.pdf`;

      // 2. Upload para Google Drive
      const uploadResponse = await fetch('/api/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: pdfBase64,
          fileName,
          folderId: messageModal.identity.folderIdDrive // Assumindo que pode haver um folderId específico
        })
      });

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.details || uploadData.error || "Erro ao fazer upload do PDF para o Google Drive");
      }
      const driveLink = uploadData.webViewLink;

      // 3. Adicionar link à mensagem
      const finalMessage = `${messageModal.message}\n\nLink do Relatório: ${driveLink}`;

      // 4. Enviar Webhook via Proxy
      if (messageModal.identity.webhookUrl && fone) {
        const proxyResponse = await fetch('/api/proxy-webhook', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            url: messageModal.identity.webhookUrl,
            data: { 
              "data.contact.Phone[0]": `55${fone}`, 
              "message": finalMessage 
            }
          }) 
        });

        if (!proxyResponse.ok) {
          const proxyError = await proxyResponse.json();
          throw new Error(proxyError.error || "Erro ao enviar mensagem via WhatsApp");
        }
      }
      
      // Atualiza o registro com a confirmação de envio
      await onSave({ ...messageModal.record, confirmacaoEnvio: true });
      
      alert("Mensagem de avaliação enviada com sucesso!");
      setMessageModal({ ...messageModal, isOpen: false });
    } catch (e: any) {
      alert(`Erro ao processar envio: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const filteredHistory = useMemo(() => {
    let result = [...avaliacoes];
    if (!isManager) {
      // Teachers only see their own
      const profName = normalize(currentUser.nome || currentUser.login);
      result = result.filter(r => normalize(r.professor).includes(profName) || profName.includes(normalize(r.professor)));
    } else if (!isMaster && currentUser.unidade !== 'TODAS') {
      // Managers see their unit
      const userUnits = normalize(currentUser.unidade).split(',').map(u => u.trim()).filter(Boolean);
      result = result.filter(r => userUnits.some(u => normalize(r.unidade).includes(u) || u.includes(normalize(r.unidade))));
    }
    
    if (searchHistory.trim()) {
      const b = normalize(searchHistory);
      result = result.filter(r => normalize(r.estudante).includes(b) || normalize(r.turma).includes(b));
    }
    return result.sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
  }, [avaliacoes, isManager, isMaster, currentUser, searchHistory]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Avaliação Socioafetiva</h2>
          <p className="text-slate-500 font-medium text-sm">Registro semestral de comportamento e desenvolvimento.</p>
        </div>
        <div className="flex gap-4">
          {isProfessor && isPrivileged && (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border-2 ${
                showHistory ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-500'
              }`}
            >
              {showHistory ? <ClipboardCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              {showHistory ? 'Nova Avaliação' : 'Histórico / PDFs'}
            </button>
          )}
        </div>
      </div>

      {!showHistory ? (
        <div className="space-y-8">
          {/* Seleção de Aluno */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">
                <MapPin className="w-3.5 h-3.5 text-blue-500 inline mr-1" /> 1. UNIDADE
              </label>
              <div className="relative group">
                <select 
                  value={selectedUnidade}
                  onChange={(e) => { setSelectedUnidade(e.target.value); setSelectedTurmaId(''); setSelectedAlunoId(''); }}
                  className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {unidadesDisponiveis.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">
                <GraduationCap className="w-3.5 h-3.5 text-blue-500 inline mr-1" /> 2. TURMA
              </label>
              <div className="relative group">
                <select 
                  value={selectedTurmaId}
                  disabled={!selectedUnidade}
                  onChange={(e) => { setSelectedTurmaId(e.target.value); setSelectedAlunoId(''); }}
                  className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  {displayTurmas.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.horario})</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">
                <User className="w-3.5 h-3.5 text-blue-500 inline mr-1" /> 3. ESTUDANTE
              </label>
              <div className="relative group">
                <select 
                  value={selectedAlunoId}
                  disabled={!selectedTurmaId}
                  onChange={(e) => setSelectedAlunoId(e.target.value)}
                  className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  {alunosDaTurma.map(a => (
                    <option 
                      key={a.id} 
                      value={a.id} 
                      disabled={a.jaRealizada}
                      className={a.jaRealizada ? "line-through text-slate-400" : ""}
                    >
                      {a.nome} {a.jaRealizada ? " (CONCLUÍDA)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {selectedAlunoId && (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-8 bg-[#0f172a] text-white flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                    <ClipboardCheck className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Ficha de Avaliação</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                      {alunos.find(a => a.id === selectedAlunoId)?.nome} • {turmas.find(t => t.id === selectedTurmaId)?.nome}
                    </p>
                  </div>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Escala de 1 a 5</p>
                  <p className="text-xs font-bold text-slate-400">1: Nunca | 5: Sempre</p>
                </div>
              </div>

              <div className="p-8 space-y-12">
                {Array.from(new Set(QUESTIONS.map(q => q.category))).map(cat => (
                  <div key={cat} className="space-y-6">
                    <h4 className="text-lg font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-4 flex items-center gap-3">
                      <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                      {cat}
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {QUESTIONS.filter(q => q.category === cat).map(q => (
                        <div key={q.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all gap-6">
                          <p className="font-bold text-slate-700 text-sm leading-relaxed flex-1">{q.text}</p>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setScores(prev => ({ ...prev, [q.id]: val }))}
                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all flex items-center justify-center border-2 ${
                                  scores[q.id] === val 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-300'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-8">
                  <h4 className="text-lg font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                    5. Observações
                  </h4>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        18. Há alguma atitude ou comportamento relevante que merece destaque?
                      </label>
                      <textarea 
                        value={obs1}
                        onChange={(e) => setObs1(e.target.value)}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-blue-500 outline-none transition-all font-medium text-sm h-32 resize-none shadow-inner"
                        placeholder="Descreva observações relevantes..."
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        19. Há algo que poderia ser feito para favorecer ainda mais a participação da criança?
                      </label>
                      <textarea 
                        value={obs2}
                        onChange={(e) => setObs2(e.target.value)}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-blue-500 outline-none transition-all font-medium text-sm h-32 resize-none shadow-inner"
                        placeholder="Sugestões de melhoria..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex justify-center">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-4 bg-emerald-600 hover:bg-emerald-700 text-white px-16 py-6 rounded-[32px] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    SALVAR AVALIAÇÃO SEMESTRAL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Buscar por Estudante ou Turma..." 
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full pl-16 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500 transition-all text-slate-700"
              />
            </div>
            <div className="bg-indigo-50 px-6 py-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-black text-indigo-700 uppercase">{filteredHistory.length} REGISTROS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHistory.map(record => (
              <div key={record.id} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <User className="w-7 h-7" />
                    </div>
                    <span className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200">
                      {record.dataRegistro.split('-').reverse().join('/')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{record.estudante}</h3>
                    <div className="flex items-center gap-2 text-slate-400 mt-2">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">{record.turma}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Professor(a)</p>
                      <p className="text-xs font-black text-slate-700 uppercase truncate">{record.professor}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => generatePDF(record)}
                  disabled={!isPrivileged}
                  className="w-full bg-slate-50 hover:bg-emerald-600 hover:text-white p-6 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all border-t border-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 disabled:hover:text-slate-400"
                >
                  GERAR RELATÓRIO PDF <Download className="w-4 h-4" />
                </button>
                {isPrivileged && !record.confirmacaoEnvio && (
                  <button 
                    onClick={() => handleSendWebhook(record)}
                    className="w-full bg-indigo-50 hover:bg-indigo-600 hover:text-white p-6 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all border-t border-slate-100"
                  >
                    ENVIAR VIA WHATSAPP <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                {record.confirmacaoEnvio && (
                  <div className="bg-emerald-50 text-emerald-600 p-3 text-[10px] font-black uppercase text-center border-t border-emerald-100">
                    Mensagem Enviada
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredHistory.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <AlertCircle className="w-16 h-16 text-slate-200" />
              <p className="text-slate-400 font-black uppercase text-sm">Nenhuma avaliação encontrada.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Whatsapp - Compacto para mobile */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] md:rounded-[44px] shadow-2xl p-8 md:p-12 border border-slate-100">
            <div className="flex items-center gap-4 mb-6 md:mb-8">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-lg md:text-2xl font-black tracking-tight uppercase text-slate-800 leading-none">Enviar Avaliação</h3>
            </div>
            <div className="mb-4 md:mb-6 space-y-1">
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IDENTIDADE DE CANAL</p>
              <p className="text-xs font-black text-blue-600 uppercase">{messageModal.identity?.nome || 'PADRÃO'}</p>
            </div>
            <textarea 
              value={messageModal.message} 
              onChange={e => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-6 md:p-8 bg-slate-50 border-2 border-slate-100 rounded-[24px] md:rounded-[32px] h-36 md:h-48 mb-6 md:mb-10 text-xs md:text-sm font-medium outline-none resize-none shadow-inner focus:border-blue-500 transition-all" 
            />
            <button 
              onClick={handleConfirmSend} 
              disabled={isSending} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 md:py-6 rounded-[20px] md:rounded-[28px] font-black text-xs md:text-sm flex items-center justify-center gap-3 md:gap-4 transition-all shadow-xl active:scale-95 shadow-emerald-600/20"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-4 h-4 md:w-6 md:h-6 fill-current" />} ENVIAR AGORA
            </button>
            <button 
              onClick={() => setMessageModal({...messageModal, isOpen: false})} 
              className="w-full mt-4 md:mt-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              FECHAR JANELA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Avaliacao;
