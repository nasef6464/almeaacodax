import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev";
const ITEMS = [
  {
    "questionCode": "QDR-QNT-COL2627-P005-Q01",
    "imageHash": "8d870f7e6fcb691926bc17b57994364c54d958b2b5c1cb83d3cea661d02d7e4b"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P005-Q02",
    "imageHash": "993e6775aa3279fe5297dbad0d5933365f8dedf66b76ee7d8ed225975e8ff5b8"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P005-Q03",
    "imageHash": "210fb7b35e2b34e7ef7601bbe42339f0d1ad9ec68a61f52df2f0d4e09eb569d5"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P005-Q04",
    "imageHash": "4b83c555def0e5c4d8ed5c9f2c23782da2ac717c881f5136292b0d4291533e2a"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P005-Q05",
    "imageHash": "6947d08a16c9bae354459a85f8742b7cd89ca0f076fdc69adeaf1fda2eb927d1"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P006-Q01",
    "imageHash": "88721addc372fec80ba2bed3472585189be06d0ab3a2a076d9ff601c61319d2d"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P006-Q02",
    "imageHash": "db2cf8c8903c90465ab05dcf81a7e432576d1dd44338e2daa2b7e50fb9ebecc9"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P006-Q03",
    "imageHash": "b83285cd924154f54db52776835e79fb60eb249d69796d8857cf2c98a772e27b"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P009-Q01",
    "imageHash": "ee1e59d354587c1fedb89ebc132c2f32581a8a08d197dc42f17c5a5bcebd10a5"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P009-Q02",
    "imageHash": "2cada61d0495b1477fe5630f8590bcd6177a20cd0e4c7d1b92e28db33cbf8169"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P017-Q01",
    "imageHash": "2313114e3f50ec08cbaeb86c7633e2199d78f031a175cdb05516c8808a0a68a0"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P017-Q02",
    "imageHash": "28a639ee88454fd71342a3bc1d932a7362a41f26c06b27dd2e091e9c5fc3cadc"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P017-Q03",
    "imageHash": "4de697dc6e39aeff6c716bd6d21f0e846bcdaa2b1795cbe18ee73d6d3b60c07a"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P020-Q01",
    "imageHash": "24abeb825555a9e3a9af32709075225781e04af6133ed8c9dc3c80b590605500"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P020-Q02",
    "imageHash": "e704eccbba021e3c92c392f09ba02c3df9e44ebbf6a83c17d83f54f03067ec6d"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P020-Q03",
    "imageHash": "505cfdeb93428b1421cc9e0fd34c70cda8d918b73980420ae92fe490c9c96451"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P020-Q04",
    "imageHash": "e8e82fee8f98f4e5674bd45e6ee5ec8ebbf012e8feaf6e4c59b468f5140bda67"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P020-Q05",
    "imageHash": "597173022313b5864d86985abc4de2797126dad6afc6576b23fa878cb2301077"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P020-Q06",
    "imageHash": "bc616f7ad85d500e495c3ebfd5413a11233661c5f3b12a0c8a7e3ef2d0574ea7"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P020-Q07",
    "imageHash": "a90e4836e5704bcfa0873ec7b5680d6341ec438cee492712c8632c2ed7cc88d9"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P021-Q01",
    "imageHash": "0864e5fad4facbfdbda1dfcbf5090aa82b1e471e8872e2f3fbfee431767a0349"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P024-Q01",
    "imageHash": "91cc0366d48206a1a9a30d0c2b7b01a839d9ce860e9fdfbb5201d20ba93d82bd"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P024-Q02",
    "imageHash": "c76583c7b2fd1972eb2572bbab9699b95222b561a83086e10bf325f676743fd2"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P024-Q03",
    "imageHash": "a9793546ca30b4aa15c40da405a72270dbafad228e5d89b9159062d7558ce894"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P025-Q01",
    "imageHash": "45ec54fc99d2a2be430dc4add1a78029390fa12bd75a5996e44f22feb120fc5b"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P025-Q02",
    "imageHash": "b5e8a4833b7e6983df451e0db853857878716366862a4067799fbeb4e46a9c6c"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P025-Q03",
    "imageHash": "18a6cedaec114b02f30fc5db7779bbf715bad0f007084031a934c98075e3859a"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P025-Q04",
    "imageHash": "f40a1e594d469214d783d7bd4a936b7b126698d864562cd32afe51c8209e81b3"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P026-Q01",
    "imageHash": "ffcf462a4c5f9ac207b0732ca3f0e6e4bae4144ee29319caff2283610dbf63ee"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P039-Q01",
    "imageHash": "550e156558a11b509d8c56edcc74c4c304852a483ece5f653d53cd4c4cd9bb52"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P039-Q02",
    "imageHash": "bfe6b614a4204e37f6a1c6d4ee6c258d000820a738e218ced70e2b4055d6b7df"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P042-Q01",
    "imageHash": "40acfd980257acf877ae507cb58c3b7387c71cf7a7c7fca656bc5e562feb2263"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P048-Q01",
    "imageHash": "b04391a5604c7fb08f96d80c7f40a187c3e287dc6fbbb9c18ba2df617e18965b"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P053-Q01",
    "imageHash": "144dfb378b163e33449fce6ba87648f0fbc85a35a7f0a40a6bce9523548e997f"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P058-Q01",
    "imageHash": "1feb187e6c10668f5944108325797156e0568040559e25791b3662be0ea2da18"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P061-Q01",
    "imageHash": "fea3eddde2892be747167c0a6683cb701388e02c81aad8d8fcd0ea4cbc3c151d"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P067-Q01",
    "imageHash": "8689c31f55fa4e9b6618e7260f576d88b5207781fe3adfdc932e0e676a8a6ad2"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P067-Q02",
    "imageHash": "6d82c0a33b4895b1ecf86ee8211aabfc4bcdcd490b465dd56fda82449af13b8f"
  },
  {
    "questionCode": "QDR-QNT-COL2627-P076-Q01",
    "imageHash": "7c15f157034500f44f78224969e2491b8f9e7aa4eb02845363aa38dc026815be"
  }
];
const SAMPLE_CODES = new Set([
  "QDR-QNT-COL2627-P005-Q01",
  "QDR-QNT-COL2627-P024-Q02",
  "QDR-QNT-COL2627-P067-Q01",
]);

const outDir = path.resolve("audit-artifacts/r2-v2");
const sampleDir = path.join(outDir, "samples");
fs.mkdirSync(sampleDir, { recursive: true });

const rows = [];
for (const item of ITEMS) {
  const url = `${BASE_URL}/questions/v2/${item.questionCode}/${item.imageHash}.webp`;
  let response;
  try {
    response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!response.ok || !String(response.headers.get("content-type") || "").toLowerCase().includes("image")) {
      response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-63" }, redirect: "follow" });
    }
    const contentType = String(response.headers.get("content-type") || "");
    const ok = response.ok && contentType.toLowerCase().includes("image");
    rows.push({
      ...item,
      url,
      status: response.status,
      contentType,
      contentLength: response.headers.get("content-length") || "",
      ok,
    });

    if (ok) {
      const full = await fetch(url, { redirect: "follow" });
      if (!full.ok) throw new Error(`image GET failed ${full.status}`);
      const bytes = Buffer.from(await full.arrayBuffer());
      fs.writeFileSync(path.join(sampleDir, `${item.questionCode}.webp`), bytes);
    }
  } catch (error) {
    rows.push({
      ...item,
      url,
      status: 0,
      contentType: "",
      contentLength: "",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const failures = rows.filter((row) => !row.ok);
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  totalKnownHashes: ITEMS.length,
  reachable: rows.length - failures.length,
  failures: failures.length,
  unresolvedWithoutHash: ["QDR-QNT-COL2627-P060-Q01"],
  downloadedForVisualAudit: ITEMS.length,
  visuallySensitive: [
    "QDR-QNT-COL2627-P005-Q01",
    "QDR-QNT-COL2627-P024-Q02",
    "QDR-QNT-COL2627-P067-Q01",
  ],
  rows,
};
fs.writeFileSync(path.join(outDir, "COL2627_R2_AUDIT.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({total:ITEMS.length,reachable:report.reachable,failures:failures.length}, null, 2));
if (failures.length) process.exit(1);
