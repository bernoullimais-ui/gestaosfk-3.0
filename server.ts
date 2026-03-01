import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cors from "cors";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Google Drive Auth (OAuth2)
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

  console.log("[Drive Auth] Checking environment variables...");
  console.log(`[Drive Auth] CLIENT_ID: ${GOOGLE_CLIENT_ID ? "SET" : "MISSING"}`);
  console.log(`[Drive Auth] CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? "SET" : "MISSING"}`);
  console.log(`[Drive Auth] REFRESH_TOKEN: ${GOOGLE_REFRESH_TOKEN ? "SET" : "MISSING"}`);

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );

  if (GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN
    });
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // API Route for Drive Health Check
  app.get("/api/drive-health", async (req, res) => {
    try {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
        return res.status(400).json({ 
          status: "error", 
          message: "Credenciais OAuth2 ausentes nas variáveis de ambiente." 
        });
      }
      
      // Test the connection by getting the about info
      const response = await drive.about.get({ fields: 'user' });
      res.json({ 
        status: "ok", 
        user: response.data.user 
      });
    } catch (error: any) {
      console.error("[Drive Health] Error:", error);
      
      let errorDetails = error.response?.data?.error?.message || error.response?.data?.error_description || error.message || "Erro desconhecido";
      
      if (errorDetails.includes("invalid_grant") || (error.message && error.message.includes("invalid_grant"))) {
        errorDetails = "ERRO DE CREDENCIAIS (invalid_grant): O seu Refresh Token do Google expirou ou foi revogado. Você precisa gerar um novo token no Google Cloud Console e atualizar as variáveis de ambiente.";
      }

      res.status(500).json({ 
        status: "error", 
        message: error.message,
        details: errorDetails
      });
    }
  });

  // API Route for PDF Upload
  app.post("/api/upload-pdf", async (req, res) => {
    try {
      const { base64, fileName, folderId: rawFolderId } = req.body;

      if (!base64 || !fileName) {
        return res.status(400).json({ error: "Missing base64 or fileName" });
      }

      // Sanitize folderId: remove query params and extract from URL if necessary
      const sanitizeId = (id: string) => {
        if (!id) return "";
        let clean = id.trim();
        if (clean.includes('?')) clean = clean.split('?')[0];
        if (clean.includes('/folders/')) clean = clean.split('/folders/')[1].split('/')[0];
        return clean.replace(/[^a-zA-Z0-9_-]/g, '');
      };

      let folderId = sanitizeId(rawFolderId);
      if (!folderId) {
        folderId = sanitizeId(process.env.GOOGLE_DRIVE_FOLDER_ID || "");
      }

      console.log(`[Drive Upload] Target Folder ID: "${folderId}"`);

      if (!folderId) {
        return res.status(400).json({ error: "ID da pasta do Google Drive não configurado. Verifique as configurações da Unidade ou as variáveis de ambiente (GOOGLE_DRIVE_FOLDER_ID)." });
      }

      const buffer = Buffer.from(base64.split(',')[1], 'base64');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      console.log(`[Drive Upload] Tentando upload para pasta: ${folderId}`);

      const media = {
        mimeType: 'application/pdf',
        body: stream, // Usando stream para maior compatibilidade
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });

      console.log(`[Drive Upload] Sucesso! ID: ${file.data.id}`);

      // Tenta tornar o arquivo público
      try {
        await drive.permissions.create({
          fileId: file.data.id!,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true,
        });
      } catch (permError) {
        console.warn("[Drive Upload] Aviso: Não foi possível definir permissão pública.", permError);
      }

      res.json({ 
        success: true, 
        fileId: file.data.id, 
        webViewLink: file.data.webViewLink 
      });
    } catch (error: any) {
      console.error("Error uploading to Drive:", error);
      
      let errorMessage = error.message || "";
      let errorDetails = error.response?.data?.error?.message || error.response?.data?.error_description || "Erro interno no servidor de upload";

      if (errorMessage.includes("invalid_grant") || errorDetails.includes("invalid_grant")) {
        errorDetails = "ERRO DE CREDENCIAIS (invalid_grant): O seu Refresh Token do Google expirou ou foi revogado. Você precisa gerar um novo token no Google Cloud Console e atualizar as variáveis de ambiente.";
      } else if (errorMessage.includes("storage quota") || errorDetails.includes("storage quota")) {
        errorDetails = "ERRO DE COTA: Seu Google Drive pessoal está sem espaço. Libere espaço ou use outra conta.";
      }

      if (error.response && error.response.data) {
        console.error("Drive API Error Data:", JSON.stringify(error.response.data, null, 2));
      }

      res.status(500).json({ 
        error: "Erro no Google Drive",
        details: errorDetails
      });
    }
  });

  // API Route for Webhook Proxy
  app.post("/api/proxy-webhook", async (req, res) => {
    try {
      const { url, data } = req.body;
      if (!url) return res.status(400).json({ error: "Missing webhook URL" });
      
      console.log(`[Webhook Proxy] Sending to: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const responseData = await response.text();
      console.log(`[Webhook Proxy] Response Status: ${response.status}`);
      
      res.json({ 
        success: response.ok, 
        status: response.status,
        data: responseData 
      });
    } catch (error: any) {
      console.error("[Webhook Proxy] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
