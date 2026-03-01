
import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Filter,
  ChevronDown,
  X
} from 'lucide-react';
import { Ocorrencia, Usuario } from '../types';

interface OcorrenciasViewProps {
  ocorrencias: Ocorrencia[];
  user: Usuario;
}

const OcorrenciasView: React.FC<OcorrenciasViewProps> = ({ ocorrencias, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const filteredOcorrencias = useMemo(() => {
    const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start';
    const userUnits = String(user.unidade || '').toLowerCase().split(',').map(u => u.trim()).filter(Boolean);

    return ocorrencias.filter(oc => {
      // Filtro de Unidade para não-Master
      if (!isMaster) {
        const ocUnitNorm = normalize(oc.unidade);
        const hasUnitAccess = userUnits.some(u => ocUnitNorm.includes(u) || u.includes(ocUnitNorm));
        if (!hasUnitAccess) return false;
      }

      const matchesSearch = !searchTerm || normalize(oc.estudante).includes(normalize(searchTerm));
      
      const ocDate = oc.data ? new Date(oc.data) : null;
      let matchesPeriod = true;
      if (ocDate) {
        if (dataInicio && ocDate < new Date(dataInicio)) matchesPeriod = false;
        if (dataFim && ocDate > new Date(dataFim)) matchesPeriod = false;
      } else if (dataInicio || dataFim) {
        matchesPeriod = false;
      }

      return matchesSearch && matchesPeriod;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [ocorrencias, searchTerm, dataInicio, dataFim]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Ocorrências</h2>
          <p className="text-slate-500 font-medium text-sm">Registro de observações e eventos importantes.</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por estudante..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none transition-all font-bold text-sm"
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <div className="flex items-center gap-2 flex-1">
              <input 
                type="date" 
                value={dataInicio} 
                onChange={e => setDataInicio(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold w-full"
              />
              <span className="text-slate-300 font-black text-[10px]">ATÉ</span>
              <input 
                type="date" 
                value={dataFim} 
                onChange={e => setDataFim(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
             {(searchTerm || dataInicio || dataFim) && (
               <button 
                onClick={() => { setSearchTerm(''); setDataInicio(''); setDataFim(''); }}
                className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest hover:text-red-600 transition-colors"
               >
                 <X className="w-4 h-4" /> Limpar Filtros
               </button>
             )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4">Estudante</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOcorrencias.length > 0 ? filteredOcorrencias.map((oc) => (
                <tr key={oc.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-slate-700">{formatDate(oc.data)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">{oc.unidade}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{oc.estudante}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{oc.usuario || '--'}</span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="max-w-md">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                        "{oc.observacao}"
                      </p>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma ocorrência localizada</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OcorrenciasView;
