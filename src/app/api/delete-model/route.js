import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export async function DELETE(request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL do ficheiro em falta.' }, { status: 400 });
    }

    // Extrai o nome do ficheiro a partir do URL
    // ex: https://pub-xxx.r2.dev/1234-modelo.glb  →  1234-modelo.glb
    const fileName = url.split('/').pop();

    if (!fileName) {
      return NextResponse.json({ error: 'Não foi possível extrair o nome do ficheiro.' }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME ?? 'media3d-modelos';

    const r2 = getR2Client();
    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key:    fileName,
      })
    );

    return NextResponse.json({ ok: true, fileName }, { status: 200 });

  } catch (err) {
    console.error('[API/delete-model] Erro:', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
