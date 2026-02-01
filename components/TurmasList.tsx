
import React, { useState, useMemo } from 'react';
import { GraduationCap, Clock, User, ArrowRight, X, Users, Database, Search, AlertCircle, Calendar } from 'lucide-react';
import { Turma, Matricula, Aluno, Usuario } from '../types';

interface TurmasListProps {
  turmas: Turma[];
  matriculas: Matricula[];
  alunos: Aluno[];
  currentUser: Usuario;
}

const TurmasList: React.FC<TurmasListProps> = ({ turmas, matriculas, alunos, currentUser }) => {
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isProfessor = currentUser.nivel === 'Professor';
  const professorName = currentUser.nome || currentUser.login;

  const displayTurmas = useMemo(() => {
    let filtered = turmas;
    if (isProfessor) {
      filtered = filtered.filter(t => t.professor === professorName);
    }
    return filtered.filter(t => 
      t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.professor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.horario.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [turmas, searchTerm, isProfessor, professorName]);

  const getAlunosDaTurma = (turmaId: string) => {
    const idsMatriculados = matriculas.filter(m => m.turmaId === turmaId).map(m => m.alunoId);
    return alunos.filter(a => idsMatriculados.includes(a.id));
  };

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
      if (!isNaN(day) && !isNaN(year) && months[monthName] !== undefined) {
        return new Date(year, months[monthName], day);
      }
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

  const formatDisplayDate = (dateVal: any) => {
    const date = parseToDate(dateVal);
    if (!date) return '--/--/--';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Turmas Ativas</h2>
          <p className="text-slate-500">Horários e listas sincronizados da planilha com controle de capacidade.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10">
          <Database className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Fonte: Google Sheets</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Consultar turma por nome, professor ou horário (Ex: Judô, 09:00)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTurmas.length > 0 ? displayTurmas.map((turma) => {
          const alunosTurma = getAlunosDaTurma(turma.id);
          const matriculadosCount = alunosTurma.length;
          const capacidade = turma.capacidade || 0;
          const taxaOcupacao = capacidade > 0 ? Math.round((matriculadosCount / capacidade) * 100) : 0;
          
          const isFull = taxaOcupacao >= 100;
          const isCrowded = taxaOcupacao >= 90 && !isFull;

          return (
            <div key={turma.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group border-l-4 border-l-blue-500 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  {capacidade > 0 && (
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${
                      isFull ? 'bg-red-50 text-red-600 border-red-100' : 
                      isCrowded ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      {isFull ? 'Lotada' : isCrowded ? 'Atenção' : 'Vagas Abertas'}
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2 truncate" title={turma.nome}>{turma.nome}</h3>
                
                <div className="space-y-3 mt-6">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{turma.horario}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{turma.professor}</span>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Users className="w-4 h-4" />
                        <span>{matriculadosCount} matriculados</span>
                      </div>
                      <div className="text-slate-400">
                        {capacidade > 0 ? `${capacidade} vagas` : '-- vagas'}
                      </div>
                    </div>
                    
                    {capacidade > 0 && (
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isFull ? 'bg-red-500' : isCrowded ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, taxaOcupacao)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase">Taxa de Ocupação</span>
                           <span className={`text-[10px] font-black ${isFull ? 'text-red-600' : isCrowded ? 'text-amber-600' : 'text-blue-600'}`}>
                             {taxaOcupacao}%
                           </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedTurma(turma)}
                  className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 text-slate-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all"
                >
                  Ver Lista de Alunos
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-300" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800">Nenhuma turma encontrada</h4>
              <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium mt-1">Verifique se o termo de busca está correto ou se as turmas foram sincronizadas da planilha.</p>
            </div>
          </div>
        )}
      </div>

      {selectedTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-blue-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">Alunos: {selectedTurma.nome}</h3>
                <button onClick={() => setSelectedTurma(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-blue-100 text-sm">{selectedTurma.horario} • {selectedTurma.professor}</p>
            </div>
            
            <div className="p-6 max-h-[500px] overflow-y-auto">
              {getAlunosDaTurma(selectedTurma.id).length > 0 ? (
                <div className="space-y-3">
                  {getAlunosDaTurma(selectedTurma.id).map(aluno => (
                    <div key={aluno.id} className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-slate-100">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                        {aluno.nome.charAt(0)}
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <p className="font-bold text-slate-800">{aluno.nome}</p>
                        <div className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded-xl">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                            {formatDisplayDate(aluno.dataNascimento)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 italic">
                  Nenhum aluno matriculado nesta turma ainda.
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setSelectedTurma(null)}
                className="text-slate-600 font-bold hover:text-slate-800"
              >
                Fechar Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasList;
