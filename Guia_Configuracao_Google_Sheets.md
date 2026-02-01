
# Guia Frequência B+: Conexão v23.0 (Sobrescrita em Edição)

Utilize este código atualizado no seu Google Apps Script para que as frequências feitas no App sejam enviadas para a sua planilha e para que, ao editar uma chamada, os dados antigos sejam substituídos pelos novos.

## 1. Código do Script (Substitua tudo no seu Apps Script)

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

  var sheetBase = findSheetSmart(["base", "aluno", "estudante"]) || sheets[0];
  var sheetTurmas = findSheetSmart(["turma", "curso", "horario"]);
  var sheetUsuarios = findSheetSmart(["usu", "oper", "profe", "login", "nivel"]);
  var sheetExperimental = findSheetSmart(["experimental", "aula exp", "teste"]);
  var sheetFreq = findSheetSmart(["frequencia", "chamada", "presenca"]);

  var result = {
    base: getSheetDataWithRecovery(sheetBase),
    turmas: getSheetDataWithRecovery(sheetTurmas),
    usuarios: getSheetDataWithRecovery(sheetUsuarios),
    experimental: getSheetDataWithRecovery(sheetExperimental),
    frequencia: getSheetDataWithRecovery(sheetFreq),
    status: "OK",
    timestamp: new Date().getTime()
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data;
    
    if (action === "save_frequencia") {
      saveFrequenciaOnSheet(data);
    } else if (action === "save_experimental") {
      saveExperimentalOnSheet(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "SUCCESS"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "ERROR", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetDataWithRecovery(sheet) {
  if (!sheet) return [];
  try {
    var range = sheet.getDataRange();
    var values = range.getValues();
    var formulas = range.getFormulas();
    if (values.length < 2) return [];
    var headers = values[0];
    var data = [];
    for (var i = 1; i < values.length; i++) {
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        var key = normalizeText(headers[j]).replace(/[^a-z0-9]/g, "");
        if (!key) continue;
        
        var val = values[i][j];
        if (typeof val === 'string' && val.startsWith("#")) {
          var formula = formulas[i][j];
          if (formula) val = formula;
        }
        
        item[key] = val;
      }
      data.push(item);
    }
    return data;
  } catch(e) { return []; }
}

function normalizeText(text) {
  if (!text) return "";
  return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * Função inteligente de salvamento:
 * Se a Turma + Data já existirem, remove os registros antigos antes de adicionar os novos.
 */
function saveFrequenciaOnSheet(lista) {
  if (!lista || lista.length === 0) return;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheetFreq = null;
  
  // Localiza a aba de frequência
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName().toLowerCase();
    if (n.includes("frequencia") || n.includes("chamada") || n.includes("presenca")) {
      sheetFreq = sheets[i];
      break;
    }
  }
  
  if (!sheetFreq) return;

  // Identifica Turma e Data do lote para limpeza (Overwrite Mode)
  var targetTurma = lista[0].turma;
  var targetData = lista[0].data;

  // Limpeza de registros antigos para evitar duplicidade (Modo Edição)
  var rows = sheetFreq.getDataRange().getValues();
  // Loop invertido para excluir linhas sem afetar o índice das próximas
  for (var row = rows.length - 1; row >= 1; row--) {
    var rowTurma = rows[row][1]; // Coluna B (Turma)
    var rowDataRaw = rows[row][2]; // Coluna C (Data)
    
    // Converte a data da planilha para string YYYY-MM-DD para comparação precisa
    var rowDataStr = "";
    if (rowDataRaw instanceof Date) {
      rowDataStr = Utilities.formatDate(rowDataRaw, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
    } else {
      rowDataStr = rowDataRaw.toString();
    }

    if (rowTurma == targetTurma && rowDataStr == targetData) {
      sheetFreq.deleteRow(row + 1);
    }
  }

  // Adiciona os novos registros
  lista.forEach(function(p) {
    sheetFreq.appendRow([p.aluno, p.turma, p.data, p.status, p.observacao]);
  });
}

function saveExperimentalOnSheet(data) {
  // Mantido para compatibilidade com feedbacks de leads
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheetExp = null;
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName().toLowerCase();
    if (n.includes("experimental") || n.includes("leads")) {
      sheetExp = sheets[i];
      break;
    }
  }
  if (!sheetExp) return;
  // Feedback geralmente apenas anexa ou você pode implementar lógica de busca aqui
  sheetExp.appendRow([new Date(), data.estudante, data.curso, data.data, data.status, data.feedback]);
}
```

## 2. Dica para Datas
O App envia a data no formato `YYYY-MM-DD`. O script acima está preparado para converter as datas da sua planilha automaticamente para esse formato antes de comparar, garantindo que o "Deletar para Substituir" funcione perfeitamente.
```