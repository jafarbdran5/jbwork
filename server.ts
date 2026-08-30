import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

    // Method 2: Fetch spreadsheet web representations (htmlview, edit, pubhtml) server-side
    const candidateUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml`
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

        // Extract Spreadsheet Title
        if (!spreadsheetTitle) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            spreadsheetTitle = titleMatch[1]
              .replace(/ - Google Sheets/i, '')
              .replace(/ - جداول بيانات Google/i, '')
              .replace(/ - Google Drive/i, '')
              .trim();
          }
        }

        // Pattern A: <li id="sheet-button-([0-9]+)"[^>]*><a[^>]*>([^<]+)</a>
        const btnRegex = /<li\s+id="sheet-button-([0-9]+)"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
        let match: RegExpExecArray | null;
        while ((match = btnRegex.exec(html)) !== null) {
          addTab(match[1], match[2]);
        }

        // Pattern B: <a href="[^"]*gid=([0-9]+)[^"]*"[^>]*>([^<]+)<\/a>
        const linkRegex = /<a[^>]*href="[^"]*(?:#|[?&])gid=([0-9]+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
        while ((match = linkRegex.exec(html)) !== null) {
          addTab(match[1], match[2]);
        }

        // Pattern C: {"name":"...","id":0} or {"title":"...","sheetId":0}
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

        // Pattern D: Array pattern in JS model: [null, 0, "SheetName"] or [null, "SheetName", 0]
        const arrRegex1 = /\[(?:null|true|false),\s*([0-9]+),\s*"([^"\\]{1,100})",/g;
        while ((match = arrRegex1.exec(html)) !== null) {
          addTab(match[1], match[2]);
        }

        const arrRegex2 = /\[(?:null|true|false),\s*"([^"\\]{1,100})",\s*([0-9]+),/g;
        while ((match = arrRegex2.exec(html)) !== null) {
          addTab(match[2], match[1]);
        }

        // Pattern E: DOCS_timing or bootstrapData
        const modelChunkRegex = /\[(?:null|true|false|\d+),\s*"([^"\\]{1,80})",\s*([0-9]{1,12})\s*\]/g;
        while ((match = modelChunkRegex.exec(html)) !== null) {
          addTab(match[2], match[1]);
        }

        if (discoveredTabs.length > 1) break;
      } catch (fetchErr) {
        console.warn(`Fetch error for ${testUrl}:`, fetchErr);
      }
    }

    // Method 3: Parallel GViz Tab Name Prober (Tests common Arabic & English worksheet names)
    if (discoveredTabs.length < 2) {
      const probeTabNames = [
        'Sheet1', 'Sheet2', 'Sheet3', 'Sheet4', 'Sheet5', 'Sheet6', 'Sheet7', 'Sheet8',
        'الورقة 1', 'الورقة 2', 'الورقة 3', 'الورقة 4', 'الورقة 5', 'الورقة 6',
        'ورقة 1', 'ورقة 2', 'ورقة 3', 'ورقة1', 'ورقة2', 'ورقة3',
        'Form Responses 1', 'Form Responses 2', 'Form Responses 3',
        'ردود النموذج 1', 'ردود النموذج 2', 'استجابات النموذج 1', 'استجابات النموذج 2',
        'الاستجابات', 'الردود', 'استجابات النموذج', 'ردود النموذج',
        'Data', 'البيانات', 'Cases', 'القضايا', 'Clients', 'العملاء', 'Tasks', 'المهمات',
        'Summary', 'الملخص', 'Archive', 'الأرشيف', 'Main', 'الرئيسية'
      ];

      const probePromises = probeTabNames.map(async (name, idx) => {
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(name)}`;
          const gvizRes = await fetch(gvizUrl);
          if (gvizRes.ok) {
            const gvizText = await gvizRes.text();
            if (gvizText.includes('google.visualization.Query.setResponse')) {
              const jsonMatch = gvizText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
              if (jsonMatch && jsonMatch[1]) {
                const data = JSON.parse(jsonMatch[1]);
                if (data.status === 'ok' && data.table) {
                  const rowCount = data.table.rows?.length || 0;
                  return { name, gid: String(idx), rowCount };
                }
              }
            }
          }
        } catch (_) {}
        return null;
      });

      const probeResults = await Promise.all(probePromises);
      probeResults.filter(Boolean).forEach((res) => {
        if (res) {
          addTab(res.gid, res.name, res.rowCount);
        }
      });
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
