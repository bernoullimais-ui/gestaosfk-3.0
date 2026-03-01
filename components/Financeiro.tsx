
import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingDown, 
  Activity, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Filter,
  Check,
  Zap,
  GraduationCap,
  BookOpen,
  UserMinus
} from 'lucide-react';
import { Aluno, Turma, Matricula } from '../types';

interface FinanceiroProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
}

const Financeiro: React.FC<FinanceiroProps> = ({ alunos, turmas, matriculas }) => {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [professoresSelecionados, setProfessoresSelecionados] = useState<string[]>([]);
  const [viewType, setViewType] = useState<'professor' | 'unidade' | 'detalhado' | 'integral' | 'sem-integral'>('professor');
  const [isProfOpen, setIsProfOpen] = useState(false);

  const normalizeText = (t: any) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const superNormalize = (t: any) => 
    normalizeText(t).replace(/[^a-z0-9]/g, '');

  const parseCurrency = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null' || String(dateVal) === '0') return null;
    try {
      let s = String(dateVal).trim().toLowerCase();
      
      // Remove tudo após a vírgula (tempo, sufixos relativos)
      if (s.includes(',')) s = s.split(',')[0].trim();
      
      // Remove sufixos de tempo relativo que podem não ter vírgula
      s = s.replace(/há\s+\d+\s+horas?/g, '').replace(/há\s+\d+\s+minutos?/g, '').trim();
      s = s.replace(/ano\s+passado/g, '').replace(/há\s+\d+\s+anos/g, '').trim();

      const ptMonths: Record<string, number> = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
      
      // Formato: 01 de fev. de 2026
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) return new Date(parseInt(ptMatch[3]), ptMonths[ptMatch[2]] || 0, parseInt(ptMatch[1]));

      // Formato: 19/2/26 ou 19/02/2026
      const slashMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{1,4})/);
      if (slashMatch) {
        const day = parseInt(slashMatch[1]);
        const month = parseInt(slashMatch[2]);
        let year = parseInt(slashMatch[3]);
        if (slashMatch[3].length === 2) {
          year += (year > 70 ? 1900 : 2000);
        } else if (slashMatch[3].length === 1) {
          year = 2000 + year;
        }
        return new Date(year, month - 1, day);
      }
      
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  const formatEscolaridade = (aluno: Aluno) => {
    let etapa = (aluno.etapa || '').trim();
    let turma = (aluno.turmaEscolar || '').toString().replace(/turma\s*/gi, '').trim();
    if (!etapa) return "--";
    etapa = etapa.toUpperCase().replace('EDUCACAO INFANTIL', 'EI').replace('ENSINO FUNDAMENTAL', 'EF').replace('ENSINO MEDIO', 'EM');
    let result = etapa;
    const invalidClasses = ['NAO SEI', 'NÃO SEI', '', 'TURMA'];
    if (turma && !invalidClasses.includes(turma.toUpperCase())) {
      const lastChar = etapa.split(' ').pop();
      if (lastChar !== turma.toUpperCase()) {
        result = `${etapa} ${turma.toUpperCase()}`;
      }
    }
    return result;
  };

  const unidadesUnicas = useMemo(() => Array.from(new Set(turmas.map(t => t.unidade).filter(Boolean))).sort(), [turmas]);
  const professoresUnicos = useMemo(() => Array.from(new Set(turmas.map(t => t.professor).filter(Boolean))).sort(), [turmas]);

  const stats = useMemo(() => {
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    if (!start || !end) return { items: [], summary: { bruto: 0, descontos: 0, liquido: 0, count: 0, discountCount: 0 } };

    const emailCounts: Record<string, number> = {};
    alunos.forEach(a => {
      const email = normalizeText(a.email);
      if (email && email !== '') {
        const activeMats = matriculas.filter(m => m.alunoId === a.id);
        activeMats.forEach(m => {
          const studentUnit = normalizeText(m.unidade);
          const unitSuffix = `-${studentUnit}`;
          const fullCourseString = m.turmaId.endsWith(unitSuffix) 
            ? m.turmaId.slice(0, -unitSuffix.length)
            : m.turmaId;
          const courseCount = fullCourseString.split('|').filter(Boolean).length;
          emailCounts[email] = (emailCounts[email] || 0) + courseCount;
        });
      }
    });

    const items: any[] = [];
    let totalBruto = 0, totalDescontos = 0, totalLiquido = 0, countMensalidades = 0, countDescontos = 0;

    matriculas.forEach(m => {
      const planoMat = normalizeText(m.plano || '');
      if (planoMat.includes('kids sport club')) return;

      const aluno = alunos.find(a => a.id === m.alunoId);
      if (!aluno) return;
      if (normalizeText(aluno.plano).includes('kids sport club')) return;

      const studentUnit = normalizeText(m.unidade);
      const unitSuffix = `-${studentUnit}`;
      const fullCourseString = m.turmaId.endsWith(unitSuffix) 
        ? m.turmaId.slice(0, -unitSuffix.length)
        : m.turmaId;
      
      const courseParts = fullCourseString.split('|').map(p => p.trim()).filter(Boolean);

      courseParts.forEach(coursePart => {
        const normalizedPart = normalizeText(coursePart);
        const superPart = superNormalize(coursePart);
        
        // Função auxiliar para match de unidade flexível
        const unitMatches = (u1: string, u2: string) => {
          const s1 = superNormalize(u1);
          const s2 = superNormalize(u2);
          if (!s1 || !s2) return false;
          return s1 === s2 || s1.includes(s2) || s2.includes(s1);
        };

        // Busca ultra-robusta da turma
        // 1. Tenta match por ID exato ou Nome + Unidade (super flexível)
        let turma = turmas.find(t => 
          unitMatches(t.unidade, studentUnit) && (
            superNormalize(t.id) === superNormalize(`${normalizedPart}-${studentUnit}`) ||
            superNormalize(t.nome) === superPart ||
            superNormalize(t.nome).includes(superPart) ||
            superPart.includes(superNormalize(t.nome))
          )
        );

        // 2. Fallback: Se não achou com a unidade, tenta apenas pelo nome (em qualquer unidade)
        if (!turma) {
          turma = turmas.find(t => 
            superNormalize(t.nome) === superPart ||
            superNormalize(t.nome).includes(superPart) ||
            superPart.includes(superNormalize(t.nome))
          );
        }

        // 3. Fallback Final: Se ainda não achou, cria uma "turma virtual" para não perder a contagem
        // Isso garante que o número de mensalidades bata com o de matrículas ativas
        const finalTurma = turma || {
          id: `virtual-${superPart}`,
          nome: coursePart + " (Não localizada em Turmas)",
          unidade: m.unidade,
          professor: "Não Identificado",
          valorMensal: 0
        };

        const vBase = parseCurrency(finalTurma.valorMensal || (finalTurma as any).custo || (finalTurma as any).valor || 0);
        
        // Lógica de Descontos: Cortesia (100%) > Fidelidade + Plano Integral (Não cumulativos)
        const emailAluno = normalizeText(aluno.email);
        const isFidelidade = emailAluno && emailCounts[emailAluno] > 1;
        const planoTexto = normalizeText(m.plano || aluno.plano || '');
        const isPlanoIntegral = planoTexto.includes('integral');
        const isCortesia = planoTexto.includes('cortesia');
        
        let pctDesconto = 0;
        let motivo = "--";

        if (isCortesia) {
          pctDesconto = 1.0;
          motivo = "Cortesia(100%)";
        } else if (isPlanoIntegral) {
          pctDesconto = 0.10;
          motivo = "Plano Integral (10%)";
        } else if (isFidelidade) {
          pctDesconto = 0.10;
          motivo = "Plano Família - (10%)";
        }

        const vDesconto = vBase * pctDesconto;

        // Fallback de data: se não houver data na matrícula, usa a do aluno ou uma data base antiga
        const dMat = parseToDate(m.dataMatricula) || parseToDate(aluno.dataMatricula) || new Date(2020, 0, 1);

        let currPayDate = new Date(dMat);
        const targetDay = dMat.getDate();

        // Otimização: se a matrícula for muito antiga, pula direto para perto do início do período
        if (currPayDate < start) {
          const monthsDiff = (start.getFullYear() - currPayDate.getFullYear()) * 12 + (start.getMonth() - currPayDate.getMonth());
          if (monthsDiff > 1) {
            currPayDate.setMonth(currPayDate.getMonth() + monthsDiff - 1);
          }
        }

        let iterations = 0;
        while (currPayDate <= end && iterations < 500) {
          iterations++;
          
          // Lógica de cancelamento refinada:
          // Prioriza o cancelamento da matrícula específica. 
          // Se não houver, usa o do aluno apenas se for posterior à data desta matrícula.
          const dCancMat = parseToDate(m.dataCancelamento);
          const dCancAluno = parseToDate(aluno.dataCancelamento);
          const dCanc = dCancMat || (dCancAluno && dCancAluno > dMat ? dCancAluno : null);
          
          if (dCanc && currPayDate > dCanc) break;

          if (currPayDate >= start && currPayDate <= end) {
            if (filtroUnidade && !unitMatches(finalTurma.unidade, filtroUnidade)) { 
              const nextMonth = new Date(currPayDate.getFullYear(), currPayDate.getMonth() + 1, targetDay);
              if (nextMonth.getDate() !== targetDay) nextMonth.setDate(0);
              currPayDate = nextMonth;
              continue; 
            }
            if (professoresSelecionados.length > 0 && !professoresSelecionados.includes(finalTurma.professor)) { 
              const nextMonth = new Date(currPayDate.getFullYear(), currPayDate.getMonth() + 1, targetDay);
              if (nextMonth.getDate() !== targetDay) nextMonth.setDate(0);
              currPayDate = nextMonth;
              continue; 
            }

            items.push({
              estudante: aluno.nome,
              unidade: finalTurma.unidade,
              turma: finalTurma.nome,
              professor: finalTurma.professor,
              escolaridade: formatEscolaridade(aluno),
              vBruto: vBase,
              vDesconto: vDesconto,
              vLiquido: vBase - vDesconto,
              motivo,
              vencimento: new Date(currPayDate),
              plano: m.plano || aluno.plano || ""
            });

            totalBruto += vBase;
            totalDescontos += vDesconto;
            totalLiquido += (vBase - vDesconto);
            countMensalidades++;
            if (pctDesconto > 0) countDescontos++;
          }
          
          const nextMonth = new Date(currPayDate.getFullYear(), currPayDate.getMonth() + 1, targetDay);
          if (nextMonth.getDate() !== targetDay) nextMonth.setDate(0);
          currPayDate = nextMonth;
        }
      });
    });

    return { 
      items: items.sort((a, b) => {
        const d = a.vencimento.getTime() - b.vencimento.getTime();
        if (d !== 0) return d;
        return a.estudante.localeCompare(b.estudante);
      }), 
      summary: { bruto: totalBruto, descontos: totalDescontos, liquido: totalLiquido, count: countMensalidades, discountCount: countDescontos } 
    };
  }, [alunos, matriculas, turmas, dataInicio, dataFim, filtroUnidade, professoresSelecionados]);

  const resumoProfessor = useMemo(() => {
    const map: Record<string, any> = {};
    stats.items.forEach(it => {
      if (!map[it.professor]) map[it.professor] = { nome: it.professor, bruto: 0, count: 0, liquido: 0 };
      map[it.professor].bruto += it.vBruto;
      map[it.professor].liquido += it.vLiquido;
      map[it.professor].count++;
    });
    return Object.values(map).sort((a:any, b:any) => a.nome.localeCompare(b.nome));
  }, [stats]);

  const resumoUnidade = useMemo(() => {
    const map: Record<string, any> = {};
    stats.items.forEach(it => {
      if (!map[it.unidade]) map[it.unidade] = { nome: it.unidade, bruto: 0, count: 0, liquido: 0 };
      map[it.unidade].bruto += it.vBruto;
      map[it.unidade].liquido += it.vLiquido;
      map[it.unidade].count++;
    });
    return Object.values(map).sort((a:any, b:any) => a.nome.localeCompare(b.nome));
  }, [stats]);

  // Itens para o relatório Nominal (Ordenado por Turma e depois Estudante)
  const itensNominais = useMemo(() => {
    return [...stats.items].sort((a, b) => {
      const turmaComp = a.turma.localeCompare(b.turma);
      if (turmaComp !== 0) return turmaComp;
      return a.estudante.localeCompare(b.estudante);
    });
  }, [stats.items]);

  // Itens excluindo plano integral (Ordenado por Estudante)
  const itensSemIntegral = useMemo(() => {
    return stats.items
      .filter(it => !normalizeText(it.plano).includes('integral'))
      .sort((a, b) => a.estudante.localeCompare(b.estudante));
  }, [stats.items]);

  // Lógica específica para visualização agrupada de Integral
  const itensIntegralAgrupados = useMemo(() => {
    // Agrupar matriculas por aluno, filtrando apenas as que são "Integral"
    const map: Record<string, { aluno: Aluno, mats: Matricula[] }> = {};
    
    matriculas.forEach(m => {
      const planoMat = normalizeText(m.plano || '');
      if (planoMat.includes('kids sport club')) return;

      if (normalizeText(m.plano || '').includes('integral')) {
        const aluno = alunos.find(a => a.id === m.alunoId);
        if (aluno && aluno.statusMatricula === 'Ativo') {
          if (normalizeText(aluno.plano).includes('kids sport club')) return;
          if (!map[aluno.id]) map[aluno.id] = { aluno, mats: [] };
          map[aluno.id].mats.push(m);
        }
      }
    });

    return Object.values(map).map(({ aluno, mats }) => {
      let somaValoresTurmas = 0;
      const nomesTurmas: string[] = [];
      
      mats.forEach(m => {
        const studentCourseName = normalizeText(m.turmaId.split('-')[0]);
        const studentUnit = normalizeText(m.unidade);

        const turmaObj = turmas.find(t => 
          t.id === m.turmaId || 
          (normalizeText(t.unidade) === studentUnit && (
            normalizeText(t.nome) === studentCourseName ||
            normalizeText(t.nome).includes(studentCourseName) ||
            studentCourseName.includes(normalizeText(t.nome))
          ))
        );

        if (turmaObj) {
          nomesTurmas.push(turmaObj.nome);
          const vBase = parseCurrency(turmaObj.valorMensal || (turmaObj as any).custo || 0);
          
          const tNomeNorm = normalizeText(turmaObj.nome);
          const isEspecial = tNomeNorm.includes('funcional kids terca') || tNomeNorm.includes('funcional kids quarta');
          
          somaValoresTurmas += isEspecial ? (vBase * 0.5) : vBase;
        }
      });

      const isCortesia = mats.some(m => normalizeText(m.plano || '').includes('cortesia')) || 
                        normalizeText(aluno.plano || '').includes('cortesia');

      return {
        estudante: aluno.nome,
        unidade: aluno.unidade,
        turmas: nomesTurmas.join(', '),
        escolaridade: formatEscolaridade(aluno),
        plano: isCortesia ? 'Integral (Cortesia)' : 'Integral',
        valorTotal: somaValoresTurmas,
        valorAPagar: isCortesia ? 0 : somaValoresTurmas * 0.65
      };
    }).sort((a, b) => a.estudante.localeCompare(b.estudante));
  }, [alunos, matriculas, turmas]);

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let fileName = `relatorio_financeiro_sfk_${viewType}`;

    if (viewType === 'professor') {
      headers = ["Professor", "Bruto Total", "Líquido Estimado", "Qtde Mensalidades"];
      rows = resumoProfessor.map((p: any) => [
        p.nome,
        `R$ ${p.bruto.toFixed(2).replace('.', ',')}`,
        `R$ ${p.liquido.toFixed(2).replace('.', ',')}`,
        p.count
      ]);
      const tBruto = resumoProfessor.reduce((acc: number, p: any) => acc + p.bruto, 0);
      const tLiquido = resumoProfessor.reduce((acc: number, p: any) => acc + p.liquido, 0);
      const tCount = resumoProfessor.reduce((acc: number, p: any) => acc + p.count, 0);
      rows.push(["TOTALIZAÇÃO", `R$ ${tBruto.toFixed(2).replace('.', ',')}`, `R$ ${tLiquido.toFixed(2).replace('.', ',')}`, tCount]);
    } else if (viewType === 'unidade') {
      headers = ["Unidade", "Bruto Total", "Líquido Estimado", "Qtde Mensalidades"];
      rows = resumoUnidade.map((u: any) => [
        u.nome,
        `R$ ${u.bruto.toFixed(2).replace('.', ',')}`,
        `R$ ${u.liquido.toFixed(2).replace('.', ',')}`,
        u.count
      ]);
      const tBruto = resumoUnidade.reduce((acc: number, u: any) => acc + u.bruto, 0);
      const tLiquido = resumoUnidade.reduce((acc: number, u: any) => acc + u.liquido, 0);
      const tCount = resumoUnidade.reduce((acc: number, u: any) => acc + u.count, 0);
      rows.push(["TOTALIZAÇÃO", `R$ ${tBruto.toFixed(2).replace('.', ',')}`, `R$ ${tLiquido.toFixed(2).replace('.', ',')}`, tCount]);
    } else if (viewType === 'detalhado' || viewType === 'sem-integral') {
      const dataToExport = viewType === 'detalhado' ? itensNominais : itensSemIntegral;
      headers = ["Estudante", "Unidade", "Escolaridade", "Turma", "Professor", "Vencimento", "Valor Bruto", "Desconto", "Motivo", "Liquido"];
      rows = dataToExport.map(it => [
        it.estudante, 
        it.unidade, 
        it.escolaridade,
        it.turma, 
        it.professor, 
        it.vencimento.toLocaleDateString('pt-BR'), 
        `R$ ${it.vBruto.toFixed(2).replace('.', ',')}`, 
        `R$ ${it.vDesconto.toFixed(2).replace('.', ',')}`, 
        it.motivo, 
        `R$ ${it.vLiquido.toFixed(2).replace('.', ',')}`
      ]);
      const tBruto = dataToExport.reduce((acc, it) => acc + it.vBruto, 0);
      const tLiquido = dataToExport.reduce((acc, it) => acc + it.vLiquido, 0);
      const tCount = dataToExport.length;
      rows.push(["TOTALIZAÇÃO", "", "", "", "", `Qtd: ${tCount}`, `R$ ${tBruto.toFixed(2).replace('.', ',')}`, "", "", `R$ ${tLiquido.toFixed(2).replace('.', ',')}`]);
    } else if (viewType === 'integral') {
      headers = ["Estudante", "Unidade", "Escolaridade", "Turmas", "Tipo Plano", "Valor Bruto (Ajustado)", "Valor a Pagar (65%)"];
      rows = itensIntegralAgrupados.map(it => [
        it.estudante, 
        it.unidade,
        it.escolaridade,
        it.turmas, 
        it.plano, 
        `R$ ${it.valorTotal.toFixed(2).replace('.', ',')}`, 
        `R$ ${it.valorAPagar.toFixed(2).replace('.', ',')}`
      ]);
      const tBruto = itensIntegralAgrupados.reduce((acc, it) => acc + it.valorTotal, 0);
      const tLiquido = itensIntegralAgrupados.reduce((acc, it) => acc + it.valorAPagar, 0);
      const tCount = itensIntegralAgrupados.length;
      rows.push(["TOTALIZAÇÃO", "", "", `Qtd: ${tCount}`, "", `R$ ${tBruto.toFixed(2).replace('.', ',')}`, `R$ ${tLiquido.toFixed(2).replace('.', ',')}`]);
    }

    const unitsInData = Array.from(new Set(
      viewType === 'professor' 
        ? stats.items.map(it => it.unidade)
        : rows.map(r => {
            if (viewType === 'unidade') return r[0];
            if (viewType === 'detalhado' || viewType === 'sem-integral' || viewType === 'integral') return r[1];
            return "";
          })
    )).filter(u => u && u !== "TOTALIZAÇÃO" && !String(u).startsWith("**")).sort().join(', ');

    const filterHeader = [
      ["RELATÓRIO FINANCEIRO SFK - " + (viewType === 'detalhado' ? 'NOMINAL' : viewType === 'sem-integral' ? 'SEM INTEGRAL' : viewType.toUpperCase())],
      ["Unidade(s) no Relatório:", unitsInData || filtroUnidade || "Todas"],
    ];

    if (viewType !== 'integral' && viewType !== 'sem-integral') {
      filterHeader.push(["Professor(es):", professoresSelecionados.length > 0 ? professoresSelecionados.join(', ') : "Todos"]);
    }

    filterHeader.push(
      ["Período:", `${parseToDate(dataInicio)?.toLocaleDateString('pt-BR')} até ${parseToDate(dataFim)?.toLocaleDateString('pt-BR')}`],
      ["Data de Exportação:", new Date().toLocaleString('pt-BR')],
      []
    );

    // Make totalization row "bold" using markdown-style or just a prefix
    const finalRows = rows.map(r => {
      if (r[0] === "TOTALIZAÇÃO") {
        return r.map(cell => cell ? `**${cell}**` : cell);
      }
      return r;
    });

    const csvContent = [...filterHeader, headers, ...finalRows];
    const csv = csvContent.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Relatório Financeiro</h2>
          <p className="text-slate-500 font-medium">Projeção de faturamento baseada no 'Custo' das turmas.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#0f172a] text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95">
          <Download className="w-5 h-5" /> EXPORTAR CSV ({viewType === 'detalhado' ? 'NOMINAL' : viewType === 'sem-integral' ? 'SEM INTEGRAL' : viewType.toUpperCase()})
        </button>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-500" /> INÍCIO</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-500" /> FIM</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-500" /> UNIDADE</label>
            <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer">
              <option value="">Todas as Unidades</option>
              {unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5 text-blue-500" /> PROFESSORES</label>
            <div className="relative">
              <button onClick={() => setIsProfOpen(!isProfOpen)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between font-bold text-sm text-slate-700">
                <span>{professoresSelecionados.length === 0 ? 'Todos' : `${professoresSelecionados.length} selecionados`}</span>
                {isProfOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {isProfOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 p-4 max-h-[250px] overflow-y-auto">
                  {professoresUnicos.map(p => (
                    <label key={p} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                      <input type="checkbox" checked={professoresSelecionados.includes(p)} onChange={() => setProfessoresSelecionados(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-[10px] font-black text-slate-600 uppercase">{p}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">RECEITA BRUTA TOTAL</p>
           <h4 className="text-5xl font-black text-slate-900 leading-none">{stats.summary.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
           <p className="text-[10px] font-black text-slate-500 mt-6 flex items-center gap-2"><DollarSign className="w-4 h-4"/> {stats.summary.count} MENSALIDADES</p>
        </div>
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TOTAL DE DESCONTOS</p>
           <h4 className="text-5xl font-black text-red-500 leading-none">{stats.summary.descontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
           <p className="text-[10px] font-black text-red-400 mt-6 flex items-center gap-2"><TrendingDown className="w-4 h-4"/> {stats.summary.discountCount} DESCONTOS APLICADOS</p>
        </div>
        <div className="bg-blue-600 p-10 rounded-[40px] shadow-xl text-white">
           <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">RECEITA LÍQUIDA ESTIMADA</p>
           <h4 className="text-5xl font-black leading-none">{stats.summary.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
           <p className="text-[10px] font-black text-blue-100 mt-6 flex items-center gap-2"><Activity className="w-4 h-4"/> FATURAMENTO LÍQUIDO ESTIMADO</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex bg-slate-100 p-1.5 rounded-[24px] w-fit shadow-inner overflow-x-auto custom-scrollbar">
          <button onClick={() => setViewType('professor')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all shrink-0 ${viewType === 'professor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>RESUMO POR PROFESSOR</button>
          <button onClick={() => setViewType('unidade')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all shrink-0 ${viewType === 'unidade' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>RESUMO POR UNIDADE</button>
          <button onClick={() => setViewType('detalhado')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all shrink-0 ${viewType === 'detalhado' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>DETALHAMENTO NOMINAL</button>
          <button onClick={() => setViewType('sem-integral')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all shrink-0 ${viewType === 'sem-integral' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><UserMinus className="w-3 h-3" /> SEM INTEGRAL</button>
          <button onClick={() => setViewType('integral')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all shrink-0 ${viewType === 'integral' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Zap className="w-3 h-3 fill-current" /> ESTUDANTES INTEGRAL</button>
        </div>

        {viewType === 'professor' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resumoProfessor.map((p:any, i:number) => (
              <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><User className="w-6 h-6 text-slate-400" /></div>
                   <h3 className="text-xl font-black text-slate-800 uppercase truncate">{p.nome}</h3>
                </div>
                <div className="space-y-3 mb-8">
                   <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Bruto</span><span className="text-slate-700">{p.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                   <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Mensalidades</span><span className="text-slate-700">{p.count}</span></div>
                </div>
                <div className="pt-6 border-t border-slate-50">
                   <p className="text-9px font-black text-blue-500 uppercase tracking-widest mb-1">Líquido Estimado</p>
                   <p className="text-3xl font-black text-blue-600">{p.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewType === 'unidade' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left">
                <thead>
                   <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                      <th className="px-8 py-6">UNIDADE</th>
                      <th className="px-8 py-6 text-right">BRUTO</th>
                      <th className="px-8 py-6 text-right">LÍQUIDO</th>
                      <th className="px-8 py-6 text-center">QTDE MENSALIDADES</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {resumoUnidade.map((u:any, i:number) => (
                     <tr key={i} className="hover:bg-slate-50 font-bold text-slate-700">
                        <td className="px-8 py-6 uppercase">{u.nome}</td>
                        <td className="px-8 py-6 text-right">{u.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="px-8 py-6 text-right text-blue-600 font-black">{u.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="px-8 py-6 text-center">{u.count}</td>
                     </tr>
                   ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                   <tr>
                      <td className="px-8 py-6 uppercase text-right">TOTALIZAÇÃO</td>
                      <td className="px-8 py-6 text-right">{stats.summary.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-8 py-6 text-right text-blue-400">{stats.summary.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-8 py-6 text-right">{stats.summary.count}</td>
                   </tr>
                </tfoot>
             </table>
          </div>
        )}

        {(viewType === 'detalhado' || viewType === 'sem-integral') && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                         <th className="px-8 py-6">ESTUDANTE / VENCIMENTO</th>
                         <th className="px-8 py-6">UNIDADE / TURMA / ESC.</th>
                         <th className="px-8 py-6">PROFESSOR</th>
                         <th className="px-8 py-6 text-right">VALOR BASE</th>
                         <th className="px-8 py-6 text-right">DESCONTO</th>
                         <th className="px-8 py-6 text-right">LÍQUIDO</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {(viewType === 'detalhado' ? itensNominais : itensSemIntegral).length > 0 ? (viewType === 'detalhado' ? itensNominais : itensSemIntegral).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                           <td className="px-8 py-5">
                              <p className="text-sm font-black text-slate-800 uppercase leading-none">{row.estudante}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">Vencimento: {row.vencimento.toLocaleDateString('pt-BR')}</p>
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-[10px] font-black text-blue-500 uppercase leading-none">{row.unidade}</p>
                              <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{row.turma}</p>
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[8px] font-black uppercase tracking-tighter">
                                <GraduationCap className="w-2.5 h-2.5" /> {row.escolaridade}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">{row.professor}</td>
                           <td className="px-8 py-5 text-right font-bold text-slate-600">{row.vBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                           <td className="px-8 py-5 text-right font-bold text-red-400">-{row.vDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                           <td className="px-8 py-5 text-right font-black text-blue-600 text-lg">{row.vLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-black uppercase">Nenhum dado localizado para este filtro.</td></tr>
                      )}
                   </tbody>
                   {(viewType === 'detalhado' ? itensNominais : itensSemIntegral).length > 0 && (
                     <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
                       <tr>
                         <td colSpan={3} className="px-8 py-6 text-right uppercase tracking-widest text-[10px]">
                           TOTALIZAÇÃO (Qtd: {(viewType === 'detalhado' ? itensNominais : itensSemIntegral).length})
                         </td>
                         <td className="px-8 py-6 text-right">
                           {(viewType === 'detalhado' ? itensNominais : itensSemIntegral).reduce((acc, it) => acc + it.vBruto, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                         </td>
                         <td className="px-8 py-6 text-right text-red-400">
                           -{(viewType === 'detalhado' ? itensNominais : itensSemIntegral).reduce((acc, it) => acc + it.vDesconto, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                         </td>
                         <td className="px-8 py-6 text-right text-blue-400 text-xl">
                           {(viewType === 'detalhado' ? itensNominais : itensSemIntegral).reduce((acc, it) => acc + it.vLiquido, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                         </td>
                       </tr>
                     </tfoot>
                   )}
                </table>
             </div>
          </div>
        )}

        {viewType === 'integral' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                         <th className="px-8 py-6">ESTUDANTE</th>
                         <th className="px-8 py-6">UNIDADE / ESCOLARIDADE</th>
                         <th className="px-8 py-6">TURMAS ATIVAS</th>
                         <th className="px-8 py-6">TIPO PLANO</th>
                         <th className="px-8 py-6 text-right">VALOR BRUTO</th>
                         <th className="px-8 py-6 text-right">VALOR A PAGAR (65%)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {itensIntegralAgrupados.length > 0 ? itensIntegralAgrupados.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                           <td className="px-8 py-5">
                              <p className="text-sm font-black text-slate-800 uppercase leading-none">{row.estudante}</p>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-black text-blue-500 uppercase leading-none">{row.unidade}</p>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[8px] font-black uppercase tracking-tighter w-fit">
                                  <GraduationCap className="w-2.5 h-2.5" /> {row.escolaridade}
                                </span>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug max-w-xs">{row.turmas}</p>
                           </td>
                           <td className="px-8 py-5">
                              <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-black uppercase">
                                {row.plano}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-right font-bold text-slate-600">
                              {row.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </td>
                           <td className="px-8 py-5 text-right font-black text-emerald-600 text-lg">
                              {row.valorAPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-black uppercase">Nenhum estudante integral com matrícula ativa localizado.</td></tr>
                      )}
                   </tbody>
                   {itensIntegralAgrupados.length > 0 && (
                     <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
                       <tr>
                         <td colSpan={4} className="px-8 py-6 text-right uppercase tracking-widest text-[10px]">
                           TOTALIZAÇÃO (Qtd: {itensIntegralAgrupados.length})
                         </td>
                         <td className="px-8 py-6 text-right">
                           {itensIntegralAgrupados.reduce((acc, it) => acc + it.valorTotal, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                         </td>
                         <td className="px-8 py-6 text-right text-emerald-400 text-xl">
                           {itensIntegralAgrupados.reduce((acc, it) => acc + it.valorAPagar, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                         </td>
                       </tr>
                     </tfoot>
                   )}
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Financeiro;
