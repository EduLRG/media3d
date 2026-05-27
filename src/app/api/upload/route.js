import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

/* ─── Cliente R2 (compatível com S3) ───────────────────────────── */
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error('R2_ACCOUNT_ID não definido no .env.local');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file     = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 });
    }

    // Valida extensão
    const originalName = file.name ?? 'modelo.glb';
    if (!originalName.toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ error: 'Apenas ficheiros .glb são aceites.' }, { status: 400 });
    }

    // Gera nome único: timestamp + nome original (sem espaços)
    const safeName   = originalName.replace(/\s+/g, '-');
    const fileName   = `${Date.now()}-${safeName}`;
    const bucketName = process.env.R2_BUCKET_NAME ?? 'media3d-modelos';
    const publicUrl  = process.env.R2_PUBLIC_URL   ?? '';

    // Converte para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Upload para R2
    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket:      bucketName,
        Key:         fileName,
        Body:        buffer,
        ContentType: 'model/gltf-binary',
      })
    );

    const url = `${publicUrl.replace(/\/$/, '')}/${fileName}`;

    return NextResponse.json({ url, fileName }, { status: 200 });

  } catch (err) {
    console.error('[API/upload] Erro:', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
