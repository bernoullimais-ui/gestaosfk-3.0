
export interface CursoCancelado {
  nome: string;
  unidade: string;
  dataMatricula?: string;
  dataCancelamento?: string;
  plano?: string;
}

export interface AcaoRetencao {
  alertaId: string; // alunoId + turmaId + dataUltimaPresenca
  dataAcao: string;
  usuarioLogin: string;
  unidade: string;
}

export interface Aluno {
  id: string;
  nome: string;
  unidade: string;
  dataNascimento: string;
  contato: string;
  etapa?: string;
  anoEscolar?: string;
  turmaEscolar?: string;
  dataMatricula?: string;
  email?: string;
  responsavel1?: string;
  whatsapp1?: string;
  responsavel2?: string;
  whatsapp2?: string;
  statusMatricula?: string;
  dataCancelamento?: string;
  cursosCanceladosDetalhes?: CursoCancelado[];
  isLead?: boolean;
  plano?: string; // Campo para Column D (Plano) da aba Base
}

export interface Turma {
  id: string;
  nome: string;
  unidade: string;
  horario: string;
  professor: string;
  capacidade?: number;
  valorMensal?: number;
  identidade?: string; // Vinculo opcional por turma
  dataInicio?: string;
}

export interface UnidadeMapping {
  nome: string;
  identidade: string;
}

export interface IdentidadeConfig {
  nome: string;
  webhookUrl: string;
  tplLembrete: string;
  tplFeedback: string;
  tplRetencao: string;
  tplMensagem: string;
  tplReagendar: string;
  tplAvaliacao: string;
  folderIdDrive?: string;
}

export interface Matricula {
  id: string;
  alunoId: string;
  turmaId: string;
  unidade: string;
  dataMatricula?: string;
  dataCancelamento?: string;
  plano?: string;
}

export interface Presenca {
  id: string;
  alunoId: string;
  turmaId: string;
  unidade: string;
  data: string;
  status: 'Presente' | 'Ausente';
  observacao?: string;
  alarme?: string;
  timestampInclusao?: string;
}

export interface Usuario {
  nome?: string;
  login: string;
  senha?: string;
  unidade: string;
  nivel: 'Professor' | 'Gestor' | 'Gestor Operacional' | 'Regente' | 'Estagiário' | 'Gestor Master' | 'Start' | 'Coordenador' | 'Gestor Administrativo';
}

export interface AulaExperimental {
  id: string;
  estudante: string;
  unidade: string;
  sigla: string;
  curso: string;
  aula: string;
  horario?: string;
  responsavel1?: string;
  whatsapp1?: string;
  status?: 'Pendente' | 'Presente' | 'Ausente' | 'Reagendada';
  observacaoProfessor?: string;
  dataStatusAtualizado?: string;
  followUpSent?: boolean;
  lembreteEnviado?: boolean;
  convertido?: boolean;
  convertidoNaPlanilha?: boolean;
  reagendarEnviado?: boolean;
  etapa?: string;
  anoEscolar?: string;
  turmaEscolar?: string;
}

export interface CancelamentoRecord {
  estudante: string;
  unidade: string;
  plano: string;
  email: string;
  dataInicio: string;
  dataFim: string;
}

export interface AvaliacaoRecord {
  id: string;
  dataRegistro: string;
  estudante: string;
  turma: string;
  professor: string;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  r5: number;
  r6: number;
  r7: number;
  r8: number;
  c9: number;
  c10: number;
  c11: number;
  c12: number;
  c13: number;
  e14: number;
  e15: number;
  e16: number;
  e17: number;
  obs1: string;
  obs2: string;
  unidade: string;
  realizada?: boolean;
  confirmacaoEnvio?: boolean;
}

export interface Ocorrencia {
  id: string;
  data: string;
  unidade: string;
  estudante: string;
  observacao: string;
  usuario?: string;
}

export type ViewType = 'dashboard' | 'alunos' | 'frequencia' | 'relatorios' | 'turmas' | 'usuarios' | 'preparacao' | 'experimental' | 'churn-risk' | 'financeiro' | 'settings' | 'dados-alunos' | 'avaliacao' | 'ocorrencias';
