
# Guia Frequência B+: Correção Definitiva WhatsApp (#ERROR)

Siga este guia para corrigir os telefones que aparecem como `#ERROR!` devido ao prefixo `=+55`.

## 1. Novo Código do Script (Copie e Cole)

Este script usa `getFormulas()` para "espiar" o que está escrito na célula quando o Sheets dá erro.

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
  var sheetExperimental = findSheetSmart(["experimental", "leads", "aula exp"]);
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

/**
 * FUNÇÃO DE CAPTURA COM RECUPERAÇÃO DE ERRO
 */
function getSheetDataWithRecovery(sheet) {
  if (!sheet) return [];
  try {
    var range = sheet.getDataRange();
    var displayValues = range.getDisplayValues(); 
    var formulas = range.getFormulas();           
    
    if (displayValues.length < 2) return [];
    var headers = displayValues[0];
    var data = [];
    
    for (var i = 1; i < displayValues.length; i++) {
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        var key = normalizeText(headers[j]).replace(/[^a-z0-9]/g, "");
        if (!key) continue;
        
        var val = displayValues[i][j];
        // Se a célula estiver com erro (#ERROR!) ou for uma fórmula de telefone (=+55)
        if (val === "#ERROR!" || (formulas[i][j] && formulas[i][j].indexOf('=') === 0)) {
           val = formulas[i][j]; // Pega o texto bruto da fórmula
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

// ... manter as outras funções de POST iguais ...
```

## 2. Instruções de Implantação (Obrigatório)

1. No Apps Script, clique em **Implantar** > **Gerenciar Implantações**.
2. Clique no ícone de **Lápis** para editar a implantação atual.
3. Na caixa de seleção "Versão", escolha **"Nova Versão"**.
4. Clique em **Implantar**.
5. No seu aplicativo B+, clique no botão lateral **"Sincronizar Agora"**.
