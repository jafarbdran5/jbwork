import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🌟 Google Sheets Fetch & Proxy API Endpoint (Bypasses Browser CORS, Fetches GViz, CSV, TSV, HTML) 🌟
app.get('/api/sheets/fetch-data', async (req, res) => {
  try {
    const rawSheetId = String(req.query.sheetId || '').trim();
    const rawUrl = String(req.query.url || '').trim();
    const rawGid = String(req.query.gid || '0').trim();
    const rawSheetName = String(req.query.sheetName || '').trim();
    const format = String(req.query.format || 'gviz').trim(); // 'gviz' | 'csv' | 'tsv'
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.query.token || '');

    // Extract sheetId & gid from URL if provided
    let sheetId = rawSheetId;
    let gid = rawGid;

    if (rawUrl) {
      // 1. Published to web format: /spreadsheets/d/e/(2PACX-[a-zA-Z0-9_-]+)
      const pubMatch = rawUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/);
      if (pubMatch) {
        if (!sheetId) sheetId = pubMatch[1];
      } else {
        // 2. Standard spreadsheet URL: /spreadsheets/d/([a-zA-Z0-9_-]+)
        const stdMatch = rawUrl.match(/\/spreadsheets\/(?:u\/[0-9]+\/)?d\/([a-zA-Z0-9_-]+)/);
        if (stdMatch) {
          if (!sheetId) sheetId = stdMatch[1];
        }
      }
      // Only fallback to URL gid if rawGid was not explicitly specified
      if (!gid || gid === '0') {
        const gidMatch = rawUrl.match(/[#?&]gid=([0-9]+)/);
        if (gidMatch) {
          gid = gidMatch[1];
        }
      }
    }

    if (!gid) {
      gid = '0';
    }

    if (!sheetId) {
      return res.status(400).json({ success: false, message: 'معرف الشيت مطلوب (sheetId is required)' });
    }

    // 1. If OAuth Token is present, try Google Sheets API v4 first
    if (token) {
      try {
        const range = rawSheetName ? `'${rawSheetName.replace(/'/g, "''")}'` : (gid === '0' ? 'A1:ZZ5000' : `'${rawSheetName || 'Sheet1'}'!A1:ZZ5000`);
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
        const apiRes = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        if (apiRes.ok) {
          const apiData: any = await apiRes.json();
          const values: any[][] = apiData.values || [];
          if (values.length > 0) {
            const csvOutput = values.map(row => 
              row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
            ).join('\n');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('X-Sheet-Data-Type', 'csv');
            return res.send(csvOutput);
          }
        }
      } catch (oauthErr) {
        console.warn('OAuth Sheets API fetch notice:', oauthErr);
      }
    }

    const isPublishedWeb = sheetId.startsWith('2PACX-') || (rawUrl && rawUrl.includes('/d/e/'));
    const candidateUrls: { url: string; type: 'gviz' | 'csv' | 'tsv' | 'html' }[] = [];

    if (isPublishedWeb) {
      if (rawSheetName) {
        candidateUrls.push({
          url: `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${encodeURIComponent(rawSheetName)}&single=true`,
          type: 'csv'
        });
        candidateUrls.push({
          url: `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=tsv&sheet=${encodeURIComponent(rawSheetName)}&single=true`,
          type: 'tsv'
        });
      }
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv${gid && gid !== '0' ? `&gid=${gid}` : ''}&single=true`,
        type: 'csv'
      });
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=tsv${gid && gid !== '0' ? `&gid=${gid}` : ''}&single=true`,
        type: 'tsv'
      });
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/e/${sheetId}/pubhtml${gid && gid !== '0' ? `?gid=${gid}` : ''}`,
        type: 'html'
      });
    } else {
      // 1. Target by Sheet Name (if specified) - try both raw & decoded & URI encoded
      if (rawSheetName) {
        // GViz with sheet name parameter
        candidateUrls.push({ 
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&tq=&sheet=${encodeURIComponent(rawSheetName)}`, 
          type: 'gviz' 
        });
        candidateUrls.push({ 
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&tq=&sheet=${encodeURIComponent(rawSheetName)}`, 
          type: 'csv' 
        });
        // Direct export with sheet name
        candidateUrls.push({
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(rawSheetName)}&id=${sheetId}`,
          type: 'csv'
        });
        candidateUrls.push({
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv&sheet=${encodeURIComponent(rawSheetName)}&id=${sheetId}`,
          type: 'tsv'
        });
      }

      // 2. Target by GID
      candidateUrls.push({ 
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&tq=&gid=${gid}`, 
        type: 'gviz' 
      });

      // 3. Direct CSV & TSV Export with GID
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&tq=&gid=${gid}`,
        type: 'csv'
      });
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&id=${sheetId}`,
        type: 'csv'
      });
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv&gid=${gid}&id=${sheetId}`,
        type: 'tsv'
      });

      // 4. HTML view fallback
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview?gid=${gid}`,
        type: 'html'
      });
      if (rawSheetName) {
        candidateUrls.push({
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview?sheet=${encodeURIComponent(rawSheetName)}`,
          type: 'html'
        });
      }
      // 5. Default root gviz
      if (gid !== '0') {
        candidateUrls.push({
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&tq=`,
          type: 'gviz'
        });
      }
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'ar,en-US,en;q=0.9'
    };

    for (const candidate of candidateUrls) {
      try {
        const response = await fetch(candidate.url, { headers, redirect: 'follow' });
        if (!response.ok) continue;

        const content = await response.text();
        const trimmedContent = (content || '').trim();

        // 🛑 Reject any Google Login or Auth redirection HTML pages
        if (
          trimmedContent.includes('ServiceLogin') || 
          trimmedContent.includes('accounts.google.com') ||
          trimmedContent.includes('Sign in - Google Accounts')
        ) {
          continue;
        }

        // GViz check
        if (candidate.type === 'gviz') {
          if (trimmedContent.includes('google.visualization.Query.setResponse')) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('X-Sheet-Data-Type', 'gviz');
            return res.send(trimmedContent);
          }
        }

        // CSV / TSV check (MUST NOT be an HTML document)
        if (candidate.type === 'csv' || candidate.type === 'tsv') {
          const isHtml = 
            trimmedContent.startsWith('<!doctype html') || 
            trimmedContent.startsWith('<!DOCTYPE html') || 
            trimmedContent.startsWith('<html') ||
            trimmedContent.includes('<head>') ||
            trimmedContent.includes('<body>');

          if (!isHtml && trimmedContent.length > 0) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('X-Sheet-Data-Type', candidate.type);
            return res.send(trimmedContent);
          }
        }

        // HTML table parser check (extract actual <table> contents only)
        if (candidate.type === 'html' && trimmedContent.includes('<table')) {
          const parsedCsv = htmlTableToCsv(trimmedContent);
          if (parsedCsv && parsedCsv.trim().length > 0) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('X-Sheet-Data-Type', 'csv');
            return res.send(parsedCsv);
          }
        }
      } catch (innerErr) {
        // continue trying next strategy
      }
    }

    return res.status(403).json({
      success: false,
      isPrivate: true,
      message: 'تعذر قراءة بيانات هذا الشيت تلقائياً. يرجى التأكد من أن إعداد المشاركة هو: (أي شخص لديه الرابط - Anyone with the link can view).'
    });
  } catch (error: any) {
    console.error('Fetch sheet data proxy error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء قراءة بيانات الشيت'
    });
  }
});

// Helper: Extracts HTML table rows and converts to clean CSV
function htmlTableToCsv(html: string): string {
  const rows: string[] = [];
  const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  if (!trMatches) return '';

  for (const tr of trMatches) {
    const cells: string[] = [];
    const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
    if (!cellMatches) continue;

    for (const cell of cellMatches) {
      const text = cell
        .replace(/<(?:td|th)[^>]*>/i, '')
        .replace(/<\/(?:td|th)>/i, '')
        .replace(/<[^>]+>/g, '') // remove inner HTML
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .trim();
      cells.push(`"${text.replace(/"/g, '""')}"`);
    }

    if (cells.some(c => c !== '""' && c !== '')) {
      rows.push(cells.join(','));
    }
  }

  return rows.join('\n');
}

// 🌟 Google Sheets Automatic Tab Discovery API Endpoint (Bypasses Browser CORS) 🌟
app.get('/api/sheets/discover-tabs', async (req, res) => {
  try {
    const rawSheetId = String(req.query.sheetId || '').trim();
    const rawUrl = String(req.query.url || '').trim();
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.query.token || '');

    let sheetId = rawSheetId;
    if (!sheetId && rawUrl) {
      const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      sheetId = match ? match[1] : '';
    }

    if (!sheetId) {
      return res.status(400).json({ success: false, message: 'معرف الشيت مطلوب (sheetId is required)' });
    }

    const discoveredTabs: { gid: string; name: string; isDefault?: boolean; rowCount?: number }[] = [];
    const visitedGids = new Set<string>();
    const visitedNames = new Set<string>();
    let spreadsheetTitle = '';

    const addTab = (gid: string, name: string, rowCount?: number) => {
      const cleanGid = String(gid ?? '0').trim();
      const cleanName = (name || '').trim();
      if (!cleanName) return;
      if (visitedGids.has(cleanGid) && visitedNames.has(cleanName.toLowerCase())) return;

      visitedGids.add(cleanGid);
      visitedNames.add(cleanName.toLowerCase());
      discoveredTabs.push({
        gid: cleanGid,
        name: cleanName,
        isDefault: cleanGid === '0' || discoveredTabs.length === 0,
        rowCount
      });
    };

    // Method 1: If OAuth Token is present, query official Google Sheets API v4
    if (token) {
      try {
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties(sheetId,title,gridProperties.rowCount)`;
        const apiRes = await fetch(apiUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (apiRes.ok) {
          const apiData: any = await apiRes.json();
          spreadsheetTitle = apiData?.properties?.title || '';
          const sheetsList = apiData?.sheets || [];
          sheetsList.forEach((s: any, idx: number) => {
            const gid = String(s?.properties?.sheetId ?? idx);
            const name = String(s?.properties?.title || `Sheet ${idx + 1}`);
            const rowCount = s?.properties?.gridProperties?.rowCount;
            addTab(gid, name, rowCount);
          });

          if (discoveredTabs.length > 0) {
            return res.json({
              success: true,
              sheetId,
              title: spreadsheetTitle,
              tabs: discoveredTabs,
              source: 'sheets_api_v4'
            });
          }
        }
      } catch (oauthErr) {
        console.warn('OAuth API discovery failed, falling back to direct web parsing:', oauthErr);
      }
    }

    // Method 2: Fetch spreadsheet web representations (htmlview, pubhtml, edit) server-side
    const candidateUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`
    ];

    for (const testUrl of candidateUrls) {
      try {
        const fetchRes = await fetch(testUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ar,en-US,en;q=0.9'
          },
          redirect: 'follow'
        });

        if (!fetchRes.ok) continue;

        const html = await fetchRes.text();

        // Extract Spreadsheet Title from <meta property="og:title"> or <title>
        if (!spreadsheetTitle) {
          const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          if (ogTitleMatch && ogTitleMatch[1]) {
            spreadsheetTitle = ogTitleMatch[1].trim();
          } else {
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              spreadsheetTitle = titleMatch[1]
                .replace(/ - Google Sheets/i, '')
                .replace(/ - جداول بيانات Google/i, '')
                .replace(/ - Google Drive/i, '')
                .trim();
            }
          }
        }

        // Pattern 1 (Google Sheets htmlview - Highest Accuracy): items.push({name: "SheetName", ... gid: "0"});
        const itemsRegex = /items\.push\((\{[\s\S]*?\})\);/g;
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemsRegex.exec(html)) !== null) {
          const objStr = itemMatch[1];
          const nameMatch = objStr.match(/name:\s*["']([^"']+)["']/);
          const gidMatch = objStr.match(/gid:\s*["']?(-?[0-9]+)["']?/);
          if (nameMatch && gidMatch) {
            addTab(gidMatch[1], nameMatch[1]);
          }
        }

        // If items.push found real tabs, we have the complete list
        if (discoveredTabs.length > 0) break;

        // Pattern 2: <li id="sheet-button-([0-9]+)"[^>]*><a[^>]*>([^<]+)</a>
        const btnRegex = /<li\s+id="sheet-button-([0-9]+)"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
        let match: RegExpExecArray | null;
        while ((match = btnRegex.exec(html)) !== null) {
          addTab(match[1], match[2]);
        }

        // Pattern 3: <a href="[^"]*gid=([0-9]+)[^"]*"[^>]*>([^<]+)<\/a>
        const linkRegex = /<a[^>]*href="[^"]*(?:#|[?&])gid=([0-9]+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
        while ((match = linkRegex.exec(html)) !== null) {
          addTab(match[1], match[2]);
        }

        // Pattern 4: {"name":"...","id":0} or {"title":"...","sheetId":0}
        const jsonMatches = html.match(/\{"(?:name|title)":"([^"]+)","(?:id|sheetId)":([0-9]+)[^}]*\}/g);
        if (jsonMatches) {
          jsonMatches.forEach(jm => {
            const nm = jm.match(/"(?:name|title)":"([^"]+)"/);
            const idm = jm.match(/"(?:id|sheetId)":([0-9]+)/);
            if (nm && idm) {
              addTab(idm[1], nm[1]);
            }
          });
        }

        if (discoveredTabs.length > 0) break;
      } catch (fetchErr) {
        console.warn(`Fetch error for ${testUrl}:`, fetchErr);
      }
    }

    // Default tab if still empty
    if (discoveredTabs.length === 0) {
      discoveredTabs.push({ gid: '0', name: 'الورقة 1 (الرئيسية)', isDefault: true });
    }

    return res.json({
      success: true,
      sheetId,
      title: spreadsheetTitle || 'Google Spreadsheet',
      tabs: discoveredTabs,
      totalTabs: discoveredTabs.length
    });
  } catch (error: any) {
    console.error('Discover tabs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'فشل في استكشاف أوراق العمل'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
