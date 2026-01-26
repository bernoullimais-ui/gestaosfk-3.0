
# Guia Frequência B+: Conexão v20.0 (Edição de Cancelamento)

Utilize este código atualizado. Ele agora permite editar a data de cancelamento de qualquer curso (ativo ou já cancelado) com precisão.

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

  var result = {
    base: getSheetDataWithRecovery(sheetBase),
    turmas: getSheetDataWithRecovery(sheetTurmas),
    usuarios: getSheetDataWithRecovery(sheetUsuarios),
    experimental: getSheetDataWithRecovery(sheetExperimental),
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
    
    if (action === "update_aluno") {
      var rowsUpdated = updateAlunoOnSheet(data);
      return ContentService.createTextOutput(JSON.stringify({status: "SUCCESS", rows: rowsUpdated}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "cancel_curso") {
      var rowsUpdated = cancelCursoOnSheet(data);
      return ContentService.createTextOutput(JSON.stringify({status: "SUCCESS", rows: rowsUpdated}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "SUCCESS"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "ERROR", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function normalizeText(text) {
  if (!text) return "";
  return text.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .trim();
}

function updateAlunoOnSheet(updatedAluno) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[0];
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName().toLowerCase();
    if (n.includes("base") || n.includes("aluno") || n.includes("estudante")) {
      sheet = sheets[i];
      break;
    }
  }

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  
  var nameColIndex = -1;
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    var hNorm = normalizeText(headers[h]);
    colMap[hNorm] = h;
    if (["estudante", "nome", "aluno"].includes(hNorm)) {
      nameColIndex = h;
    }
  }
  
  if (nameColIndex === -1) throw new Error("Coluna de Nome não encontrada");

  var rowsUpdated = 0;
  var targetName = normalizeText(updatedAluno.nome);

  for (var i = 1; i < values.length; i++) {
    var sheetName = normalizeText(values[i][nameColIndex]);
    
    if (sheetName === targetName) {
      var updates = [
        { keys: ["email"], value: updatedAluno.email },
        { keys: ["whatsapp1", "whatsapp 1", "contato"], value: updatedAluno.whatsapp1 },
        { keys: ["whatsapp2", "whatsapp 2"], value: updatedAluno.whatsapp2 },
        { keys: ["responsavel 1", "responsavel1", "mae"], value: updatedAluno.responsavel1 },
        { keys: ["responsavel 2", "responsavel2", "pai"], value: updatedAluno.responsavel2 },
        { keys: ["nasc", "data de nascimento", "nascimento"], value: updatedAluno.dataNascimento },
        { keys: ["etapa", "sigla", "estagio"], value: updatedAluno.etapa },
        { keys: ["ano escolar", "anoescolar", "serie"], value: updatedAluno.anoEscolar },
        { keys: ["turma escolar", "turmaescolar", "letra", "classe"], value: updatedAluno.turmaEscolar }
      ];

      updates.forEach(function(update) {
        update.keys.forEach(function(key) {
          var normKey = normalizeText(key);
          if (colMap[normKey] !== undefined) {
            var val = update.value;
            if (normKey.includes("nasc") && val && val.includes("-")) {
               var dParts = val.split("-");
               val = dParts[2] + "/" + dParts[1] + "/" + dParts[0].substring(2);
            }
            sheet.getRange(i + 1, colMap[normKey] + 1).setValue(val);
          }
        });
      });
      rowsUpdated++;
    }
  }
  return rowsUpdated;
}

function cancelCursoOnSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[0];
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName().toLowerCase();
    if (n.includes("base") || n.includes("aluno") || n.includes("estudante")) {
      sheet = sheets[i];
      break;
    }
  }

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  
  var nameColIndex = -1;
  var cursoColIndex = -1;
  var statusColIndex = -1;
  var cancelDateColIndex = -1;

  for (var h = 0; h < headers.length; h++) {
    var hNorm = normalizeText(headers[h]);
    if (["estudante", "nome", "aluno"].includes(hNorm)) nameColIndex = h;
    if (["plano", "modalidade", "curso", "turma sport"].includes(hNorm)) cursoColIndex = h;
    if (["status", "situacao"].includes(hNorm)) statusColIndex = h;
    if (["data de cancelamento", "dt cancelamento", "cancelamento"].includes(hNorm)) cancelDateColIndex = h;
  }

  if (nameColIndex === -1 || cursoColIndex === -1) throw new Error("Colunas obrigatórias não encontradas");

  var targetName = normalizeText(data.nome);
  var targetCurso = normalizeText(data.curso);
  var cancelDate = data.dataCancelamento;

  var formattedDate = cancelDate;
  if (cancelDate && cancelDate.includes("-")) {
    var dParts = cancelDate.split("-");
    formattedDate = dParts[2] + "/" + dParts[1] + "/" + dParts[0].substring(2);
  }

  var rowsUpdated = 0;
  for (var i = 1; i < values.length; i++) {
    var rowName = normalizeText(values[i][nameColIndex]);
    var rowCurso = normalizeText(values[i][cursoColIndex]);
    
    if (rowName === targetName && rowCurso === targetCurso) {
      if (statusColIndex !== -1) sheet.getRange(i + 1, statusColIndex + 1).setValue("Cancelado");
      if (cancelDateColIndex !== -1) sheet.getRange(i + 1, cancelDateColIndex + 1).setValue(formattedDate);
      rowsUpdated++;
    }
  }
  return rowsUpdated;
}

function getSheetDataWithRecovery(sheet) {
  if (!sheet) return null;
  try {
    var range = sheet.getDataRange();
    var values = range.getValues();
    var formulas = range.getFormulas(); 
    if (values.length < 2) return [];
    var headers = values[0];
    var data = [];
    for (var i = 1; i < values.length; i++) {
      var item = {};
      var hasData = false;
      for (var j = 0; j < headers.length; j++) {
        var key = normalizeText(headers[j]).replace(/[^a-z0-9]/g, "");
        if (!key) continue;
        var val = values[i][j];
        if (val === "#ERROR!" || val === "#VALUE!" || val === "#N/A") {
          var formula = formulas[i][j];
          if (formula) val = formula.replace(/^=/, "");
        }
        item[key] = val;
        if (val !== "") hasData = true;
      }
      if (hasData) data.push(item);
    }
    return data;
  } catch(e) { return []; }
}
```

## 2. PROCEDIMENTO DE ATUALIZAÇÃO
1. No Apps Script, cole o código acima.
2. Clique no **Disquete** (Salvar).
3. Vá em **Implantar** > **Gerenciar Implantações**.
4. Edite a implantação atual (ícone do lápis).
5. Selecione **"Nova Versão"**.
6. Clique em **Implantar**.
