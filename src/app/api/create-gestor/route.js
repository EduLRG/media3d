import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { nome, email, password, id_entidade, id_programa, disciplinas } = body;

    // Iniciamos o Supabase com a chave de ADMIN (Service Role)
    // Garanta que tem a SUPABASE_SERVICE_ROLE_KEY no seu ficheiro .env.local!
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Criar o utilizador no Supabase Auth (a "Caverna Secreta")
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Valida o email automaticamente
    });

    if (authError) throw new Error("Erro no Auth: " + authError.message);

    const userId = authUser.user.id; // O famoso UUID gerado!

    // 2. Inserir na sua tabela pública 'utilizadores'
    const { error: userError } = await supabaseAdmin.from('utilizadores').insert([
      {
        id_utilizadores: userId,
        nome: nome,
        email: email,
        id_entidade: id_entidade
      }
    ]);

    if (userError) throw new Error("Erro na tabela utilizadores: " + userError.message);

    // 3. Criar a role 'gestor' genérica
    const { error: roleError } = await supabaseAdmin.from('tipo_utilizador').insert([
      {
        id_utilizador: userId,
        id_entidade: id_entidade,
        role: 'gestor'
      }
    ]);

    if (roleError) throw new Error("Erro na role gestor: " + roleError.message);

    // 4. Associar as disciplinas (Várias linhas, como falámos!)
    if (disciplinas && disciplinas.length > 0) {
      const disciplinasInserts = disciplinas.map(id_modulo => ({
        id_utilizador: userId,
        id_entidade: id_entidade,
        id_programa: id_programa,
        id_modulo: Number(id_modulo),
        role: "gestor_disciplina"
      }));

      const { error: discError } = await supabaseAdmin.from('tipo_utilizador').insert(disciplinasInserts);
      
      if (discError) throw new Error("Erro ao associar disciplinas: " + discError.message);
    }

    // Se chegou até aqui, tudo correu bem!
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro na API create-gestor:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}