async function salvarNoGitHub(mensagem) {
  try {
    await git.add(arquivosParaCommit); // adiciona os arquivos alterados
    await git.commit(mensagem);        // cria o commit
    // Faz push usando token
    await git.push(`https://${GITHUB_TOKEN}@github.com/SasoriAutoPecas/bot-rota.git`, "main");
    console.log("✅ Alterações salvas no GitHub!");
  } catch (err) {
    console.error("❌ Erro ao salvar no GitHub:", err);
  }
}
