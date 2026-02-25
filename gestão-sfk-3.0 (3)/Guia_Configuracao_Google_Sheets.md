
# Guia Gestão Unificada SFK & B+: Configuração do Google Apps Script

Este script permite que o aplicativo leia dados de alunos, turmas, frequências e a nova associação de **Unidades x Identidades**.

## 1. Instruções de Instalação

1. Na sua Planilha Google, vá em **Extensões** > **Apps Script**.
2. Substitua o código existente pelo código abaixo.
3. Clique em **Implantar** > **Gerenciar implantações** > **Editar** (ícone de lápis) > **Nova Versão**.
4. Certifique-se de que o acesso continua como "Qualquer pessoa".

## 2. Código do Script (Versão 3.6 - Suporte a Cancelamento Automático)

```javascript
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  function findSheetSmart(keywords) {
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName().toLowerCase();
      for (var k = 0; k < keywords.length; k++) {
        if (name.indexOf(keywords[k].toLowerCase()) !== -1) return sheets[i];
      }
    }
    return null;
  }

  // Localização inteligente das abas
  var sheetBase = findSheetSmart(["base", "aluno", "estudante"]) || sheets[0];
  var sheetTurmas = findSheetSmart(["turma", "curso", "horario"]);
  var sheetUsuarios = findSheetSmart(["usu", "oper", "profe", "login", "nivel"]);
  var sheetExperimental = findSheetSmart(["experimental", "leads", "aula exp"]);
  var sheetFreq = findSheetSmart(["frequencia", "chamada", "presenca"]);
  var sheetConfig = findSheetSmart(["config", "parametros", "ajustes", "setup"]);
  var sheetUnidades = findSheetSmart(["unidade", "escolas", "unid"]);
  var sheetCancel = findSheetSmart(["cancelamento", "retencao", "churn"]);

  var result = {
    base: getSheetDataWithRecovery(sheetBase),
    turmas: getSheetDataWithRecovery(sheetTurmas),
    usuarios: getSheetDataWithRecovery(sheetUsuarios),
    experimental: getSheetDataWithRecovery(sheetExperimental),
    frequencia: getSheetDataWithRecovery(sheetFreq),
    configuracoes: getSheetDataWithRecovery(sheetConfig),
    unidadesMapping: getSheetDataWithRecovery(sheetUnidades),
    cancelamentos: getSheetDataWithRecovery(sheetCancel),
    status: "OK",
    timestamp: new Date().getTime()
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var data = contents.data;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    function findSheetSmart(keywords) {
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var name = sheets[i].getName().toLowerCase();
        for (var k = 0; k < keywords.length; k++) {
          if (name.indexOf(keywords[k].toLowerCase()) !== -1) return sheets[i];
        }
      }
      return null;
    }

    if (action === "save_aluno") {
      var sheet = ss.getSheetByName("BASE") || findSheetSmart(["base", "aluno", "estudante"]);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return normalizeText(h).replace(/[^a-z0-9]/g, ""); });
      
      var colEstudante = headers.indexOf("estudante") === -1 ? headers.indexOf("nome") : headers.indexOf("estudante");
      var colUnidade = headers.indexOf("unidade") === -1 ? headers.indexOf("escola") : headers.indexOf("unidade");
      var colTurma = headers.indexOf("turma") === -1 ? headers.indexOf("curso") : headers.indexOf("turma");
      
      var mappings = {
        nome: colEstudante,
        unidade: colUnidade,
        dataNascimento: headers.indexOf("nascimento") === -1 ? headers.indexOf("datanascimento") : headers.indexOf("nascimento"),
        email: headers.indexOf("email"),
        responsavel1: headers.indexOf("responsavel1"),
        whatsapp1: headers.indexOf("whatsapp1"),
        responsavel2: headers.indexOf("responsavel2"),
        whatsapp2: headers.indexOf("whatsapp2"),
        etapa: headers.indexOf("etapa") === -1 ? headers.indexOf("estagioanoescolar") : headers.indexOf("etapa"),
        turmaEscolar: headers.indexOf("turmaescolar"),
        statusMatricula: headers.indexOf("status"),
        dataMatricula: headers.indexOf("dtmatricula") === -1 ? headers.indexOf("datamatricula") : headers.indexOf("dtmatricula"),
        dataCancelamento: (headers.indexOf("dtcancelamento") !== -1) ? headers.indexOf("dtcancelamento") : headers.indexOf("datacancelamento")
      };

      var targetCurso = data._targetCurso;
      var toCurso = data._toCurso;
      var transferRowData = null;

      for (var i = 1; i < rows.length; i++) {
        var rowName = normalizeText(rows[i][colEstudante]);
        var rowUnit = normalizeText(rows[i][colUnidade]);
        var rowTurma = normalizeText(rows[i][colTurma]);

        if (rowName === normalizeText(data._originalNome) && rowUnit === normalizeText(data._originalUnidade)) {
          
          if (targetCurso && normalizeText(targetCurso) !== rowTurma) {
            continue;
          }

          if (toCurso) {
            transferRowData = JSON.parse(JSON.stringify(rows[i]));
          }

          for (var key in data) {
            if (key.indexOf("_") === 0) continue; 
            var colIdx = mappings[key];
            if (colIdx !== undefined && colIdx !== -1) {
              if (toCurso && key === "dataMatricula") continue;
              sheet.getRange(i + 1, colIdx + 1).setValue(data[key]);
            }
          }
          
          if (toCurso && mappings.statusMatricula !== -1) {
            sheet.getRange(i + 1, mappings.statusMatricula + 1).setValue("Cancelado");
          }
          
          if (targetCurso || data.statusMatricula !== 'Cancelado') break;
        }
      }

      if (toCurso && transferRowData) {
        transferRowData[colTurma] = toCurso;
        if (mappings.statusMatricula !== -1) transferRowData[mappings.statusMatricula] = "Ativo";
        if (mappings.dataMatricula !== -1) transferRowData[mappings.dataMatricula] = contents.data.dataCancelamento || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
        if (mappings.dataCancelamento !== -1) transferRowData[mappings.dataCancelamento] = "";
        sheet.appendRow(transferRowData);
      }
    }
    
    else if (action === "save_cancelamento") {
      var sheet = ss.getSheetByName("CANCELAMENTO") || findSheetSmart(["cancelamento", "retencao", "churn"]);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return normalizeText(h).replace(/[^a-z0-9]/g, ""); });
      
      var colCliente = headers.indexOf("cliente");
      var colSobrenome = headers.indexOf("sobrenome");
      var colEstudante = headers.indexOf("estudante") === -1 ? headers.indexOf("aluno") : headers.indexOf("estudante");
      var colEmail = headers.indexOf("email");
      var colPlano = headers.indexOf("plano");
      var colConfirma = headers.indexOf("confirma");
      
      for (var i = 1; i < rows.length; i++) {
        var rowEmail = normalizeText(rows[i][colEmail]);
        var rowPlano = normalizeText(rows[i][colPlano]);
        
        var rowFullName = "";
        if (colEstudante !== -1 && rows[i][colEstudante]) {
          rowFullName = normalizeText(rows[i][colEstudante]);
        } else if (colCliente !== -1) {
          rowFullName = normalizeText(rows[i][colCliente]) + (colSobrenome !== -1 ? " " + normalizeText(rows[i][colSobrenome]) : "");
        }
        rowFullName = rowFullName.trim();
        
        var targetName = normalizeText(data._originalEstudante);
        
        var nameMatch = rowFullName && targetName && (rowFullName.indexOf(targetName) !== -1 || targetName.indexOf(rowFullName) !== -1);
        var emailMatch = rowEmail && normalizeText(data._originalEmail) && rowEmail === normalizeText(data._originalEmail);
        
        var match = (emailMatch || nameMatch) && (rowPlano === normalizeText(data._originalPlano) || !data._originalPlano);
        
        if (match) {
          if (colConfirma !== -1) {
            sheet.getRange(i + 1, colConfirma + 1).setValue(data.confirma || "TRUE");
          }
          break;
        }
      }
    }
    
    else if (action === "save_experimental") {
      var sheet = ss.getSheetByName("EXPERIMENTAL") || findSheetSmart(["experimental", "leads", "aula exp"]);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return normalizeText(h).replace(/[^a-z0-9]/g, ""); });
      
      var colEstudante = headers.indexOf("estudante");
      var colCurso = headers.indexOf("modalidade") === -1 ? headers.indexOf("curso") : headers.indexOf("modalidade");
      if (colCurso === -1) colCurso = headers.indexOf("turma");
      
      var colEnviado = headers.indexOf("enviado");
      var colFeedback = headers.indexOf("feedback");
      var colStatus = headers.indexOf("status");
      var colConversao = headers.indexOf("conversao");
      var colLembrete = headers.indexOf("lembrete");
      var colReagendar = headers.indexOf("reagendar");
      
      for (var i = 1; i < rows.length; i++) {
        if (normalizeText(rows[i][colEstudante]) === normalizeText(data.estudante) && 
            (normalizeText(rows[i][colCurso]) === normalizeText(data.curso) || !data.curso)) {
          
          if (colEnviado !== -1 && data.enviado !== undefined) sheet.getRange(i + 1, colEnviado + 1).setValue(data.enviado);
          if (colFeedback !== -1 && data.feedback !== undefined) sheet.getRange(i + 1, colFeedback + 1).setValue(data.feedback);
          if (colStatus !== -1 && data.status !== undefined) sheet.getRange(i + 1, colStatus + 1).setValue(data.status);
          if (colConversao !== -1 && data.conversao !== undefined) sheet.getRange(i + 1, colConversao + 1).setValue(data.conversao);
          if (colLembrete !== -1 && data.lembrete !== undefined) sheet.getRange(i + 1, colLembrete + 1).setValue(data.lembrete);
          if (colReagendar !== -1 && data.reagendar !== undefined) sheet.getRange(i + 1, colReagendar + 1).setValue(data.reagendar);
          break;
        }
      }
    }
    
    else if (action === "save_frequencia") {
      var sheet = ss.getSheetByName("FREQUENCIA") || findSheetSmart(["frequencia", "chamada", "presenca"]);
      if (!sheet) {
        sheet = ss.insertSheet("FREQUENCIA");
        sheet.appendRow(["ESTUDANTE", "UNIDADE", "TURMA", "DATA", "STATUS", "OBSERVAÇÃO", "ALARME", "DATA INCLUSÃO"]);
      }
      
      var rows = sheet.getDataRange().getValues();
      var colAluno = 0, colUnidade = 1, colTurma = 2, colData = 3, colStatus = 4, colObs = 5, colAlarme = 6, colTimestamp = 7;  

      if (Array.isArray(data)) {
        data.forEach(function(p) {
          var foundIndex = -1;
          var pAluno = p.aluno || p.alunoId;
          var pTurma = p.turma || p.turmaId;
          var pData = p.data; // Esperado YYYY-MM-DD

          for (var i = 1; i < rows.length; i++) {
            var rowData = rows[i][colData];
            var formattedRowData = "";
            
            if (rowData instanceof Date) {
              formattedRowData = Utilities.formatDate(rowData, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            } else if (rowData) {
              // Tenta converter string DD/MM/YYYY para YYYY-MM-DD para comparar
              var s = rowData.toString();
              var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (m) {
                formattedRowData = m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
              } else {
                formattedRowData = s;
              }
            }

            if (normalizeText(rows[i][colAluno]) === normalizeText(pAluno) && 
                normalizeText(rows[i][colTurma]) === normalizeText(pTurma) && 
                formattedRowData === pData) {
              foundIndex = i + 1;
              break;
            }
          }

          if (foundIndex !== -1) {
            sheet.getRange(foundIndex, colStatus + 1).setValue(p.status);
            sheet.getRange(foundIndex, colObs + 1).setValue(p.observacao || "");
            sheet.getRange(foundIndex, colUnidade + 1).setValue(p.unidade);
            if (p.alarme) sheet.getRange(foundIndex, colAlarme + 1).setValue(p.alarme);
            sheet.getRange(foundIndex, colTimestamp + 1).setValue(p.timestampInclusao || "");
          } else {
            sheet.appendRow([pAluno, p.unidade, pTurma, pData, p.status, p.observacao || "", p.alarme || "", p.timestampInclusao || ""]);
          }
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(f) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: f.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetDataWithRecovery(sheet) {
  if (!sheet) return [];
  try {
    var range = sheet.getDataRange();
    var displayValues = range.getDisplayValues(); 
    var formulas = range.getFormulas();           
    
    if (displayValues.length < 1) return [];
    var headers = displayValues[0];
    var data = [];
    
    for (var i = 1; i < displayValues.length; i++) {
      var item = {};
      var hasData = false;
      for (var j = 0; j < headers.length; j++) {
        var key = normalizeText(headers[j]).replace(/[^a-z0-9]/g, "");
        if (!key) continue;
        var val = displayValues[i][j];
        if (val === "#ERROR!" && formulas[i][j]) val = formulas[i][j];
        item[key] = val;
        if (val) hasData = true;
      }
      if (hasData) data.push(item);
    }
    return data;
  } catch(e) { return []; }
}

function normalizeText(text) {
  if (!text) return "";
  return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
```
