/* ============================================================
   ÁLBUM DA FAMÍLIA DOS SANTOS
   Todo o JavaScript do projeto está aqui, dividido em blocos.
   ============================================================ */


/* ============================================================
   BLOCO 1 — ABRIR A CAPA DO LIVRO
   Quando o usuário clica em "Abrir o Álbum" (ou em qualquer
   lugar da capa), o CSS faz as duas portas girarem.
   ============================================================ */
const capa       = document.getElementById('capa');
const botaoAbrir = document.getElementById('botaoAbrir');

function abrirCapa() {
  capa.classList.add('aberta'); // ativa a animação no CSS
}

botaoAbrir.addEventListener('click', abrirCapa);
capa.addEventListener('click', abrirCapa); // clique em qualquer parte também abre


/* ============================================================
   BLOCO 2 — TROCAR DE ABA (Álbum ↔ Livro de Visitas)
   ============================================================ */
const botoesAba = document.querySelectorAll('.aba-botao');
const paineis   = document.querySelectorAll('.painel');

botoesAba.forEach(botao => {
  botao.addEventListener('click', () => {
    const destino = botao.dataset.aba;

    // Tira "ativo" de todos os botões e painéis
    botoesAba.forEach(b => b.classList.remove('ativo'));
    paineis.forEach(p => p.classList.remove('ativo'));

    // Coloca "ativo" só no clicado
    botao.classList.add('ativo');
    document.getElementById(destino).classList.add('ativo');
  });
});


/* ============================================================
   BLOCO 3 — CRIAR OS 55 ESPAÇOS DO ÁLBUM
   ============================================================ */
const TOTAL_SLOTS = 55;
const grade       = document.getElementById('gradeAlbum');
const contador    = document.getElementById('contador');

// Objeto que guarda as mídias (chave = número do slot, valor = {tipo, dados, nome})
let midias = {};

// Cria os 55 quadradinhos na tela
for (let i = 1; i <= TOTAL_SLOTS; i++) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.dataset.id = i;
  slot.addEventListener('click', () => clicarSlot(i));
  grade.appendChild(slot);
}


/* ============================================================
   BLOCO 4 — ABRIR O BANCO DE DADOS (IndexedDB)
   Guarda fotos e vídeos grandes no navegador.
   ============================================================ */
let banco;

const pedidoBanco = indexedDB.open('albumSantosDB', 1);

pedidoBanco.onupgradeneeded = (evento) => {
  banco = evento.target.result;
  if (!banco.objectStoreNames.contains('midias')) {
    banco.createObjectStore('midias'); // cria a "gaveta" de mídias
  }
};

pedidoBanco.onsuccess = (evento) => {
  banco = evento.target.result;
  carregarTodasMidias(); // assim que abrir, carrega o que já existe
};

pedidoBanco.onerror = () => {
  console.warn('IndexedDB não disponível. Usando apenas memória.');
};

// Lê tudo do banco e guarda no objeto "midias", depois desenha os slots
function carregarTodasMidias() {
  const transacao = banco.transaction('midias', 'readonly');
  const gaveta    = transacao.objectStore('midias');
  const pedido    = gaveta.openCursor();

  pedido.onsuccess = (evento) => {
    const cursor = evento.target.result;
    if (cursor) {
      midias[cursor.key] = cursor.value;
      cursor.continue();
    } else {
      // Terminou a leitura → desenha todos os slots
      for (let i = 1; i <= TOTAL_SLOTS; i++) desenharSlot(i);
      atualizarContador();
    }
  };
}

// Salva uma mídia no banco
function salvarMidia(id, valor) {
  if (!banco) return;
  const transacao = banco.transaction('midias', 'readwrite');
  transacao.objectStore('midias').put(valor, id);
}

// Remove uma mídia do banco
function removerMidiaBanco(id) {
  if (!banco) return;
  const transacao = banco.transaction('midias', 'readwrite');
  transacao.objectStore('midias').delete(id);
}


/* ============================================================
   BLOCO 5 — DESENHAR CADA SLOT (vazio ou preenchido)
   ============================================================ */
function desenharSlot(id) {
  const slot = document.querySelector(`.slot[data-id="${id}"]`);
  if (!slot) return;

  const item = midias[id];

  if (item) {
    slot.classList.add('preenchido');
    // Usa o endereço temporário (URL) da mídia
    const url = URL.createObjectURL(item.dados);

    if (item.tipo.startsWith('image')) {
      slot.innerHTML = `<img src="${url}" alt="Memória ${id}">`;
    } else {
      slot.innerHTML = `
        <video src="${url}" muted></video>
        <span class="play-icone">▶</span>`;
    }
  } else {
    slot.classList.remove('preenchido');
    slot.innerHTML = `
      <span class="numero">${id}</span>
      <span class="mais">+</span>`;
  }
}

// Atualiza o texto "X de 55 espaços preenchidos"
function atualizarContador() {
  const preenchidos = Object.keys(midias).length;
  contador.textContent = `${preenchidos} de ${TOTAL_SLOTS} espaços preenchidos`;
}


/* ============================================================
   BLOCO 6 — ADICIONAR FOTO/VÍDEO
   ============================================================ */
const inputArquivo = document.getElementById('inputArquivo');
let slotAtual = null;

function clicarSlot(id) {
  if (midias[id]) {
    abrirModal(id); // já tem mídia → abre visualização
  } else {
    slotAtual = id;
    inputArquivo.click(); // vazio → abre seletor de arquivos
  }
}

// Quando o usuário escolhe um arquivo
inputArquivo.addEventListener('change', (evento) => {
  const arquivo = evento.target.files[0];
  if (!arquivo || slotAtual === null) return;

  const leitor = new FileReader();

  leitor.onload = (e) => {
    const dados = e.target.result; // conteúdo do arquivo

    midias[slotAtual] = {
      tipo:  arquivo.type,
      nome:  arquivo.name,
      dados: dados
    };

    salvarMidia(slotAtual, midias[slotAtual]);
    desenharSlot(slotAtual);
    atualizarContador();

    slotAtual = null;
    inputArquivo.value = ''; // limpa o input para permitir escolher o mesmo arquivo depois
  };

  leitor.readAsDataURL(arquivo); // lê o arquivo como texto base64
});


/* ============================================================
   BLOCO 7 — MODAL (ver, baixar e remover mídia)
   ============================================================ */
const modal        = document.getElementById('modal');
const modalMidia   = document.getElementById('modalMidia');
const modalFechar  = document.getElementById('modalFechar');
const botaoBaixar  = document.getElementById('botaoBaixar');
const botaoRemover = document.getElementById('botaoRemover');

let idNoModal = null;

function abrirModal(id) {
  const item = midias[id];
  if (!item) return;

  idNoModal = id;
  const url = URL.createObjectURL(item.dados);

  modalMidia.innerHTML = item.tipo.startsWith('image')
    ? `<img src="${url}" alt="Memória ${id}">`
    : `<video src="${url}" controls autoplay></video>`;

  modal.classList.add('aberto');
}

function fecharModal() {
  modal.classList.remove('aberto');
  modalMidia.innerHTML = '';
  idNoModal = null;
}

modalFechar.addEventListener('click', fecharModal);

// Fecha se clicar fora da caixa
modal.addEventListener('click', (e) => {
  if (e.target === modal) fecharModal();
});

// Botão Baixar
botaoBaixar.addEventListener('click', () => {
  if (idNoModal === null) return;
  const item = midias[idNoModal];

  const link = document.createElement('a');
  link.href = item.dados;
  link.download = item.nome || `memoria-${idNoModal}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Botão Remover
botaoRemover.addEventListener('click', () => {
  if (idNoModal === null) return;
  if (!confirm('Remover esta memória do álbum?')) return;

  const id = idNoModal;
  delete midias[id];
  removerMidiaBanco(id);
  desenharSlot(id);
  atualizarContador();
  fecharModal();
});


/* ============================================================
   BLOCO 8 — LIVRO DE VISITAS (comentários)
   Guarda os recados no localStorage do navegador.
   ============================================================ */
const formRecado     = document.getElementById('formRecado');
const listaRecados   = document.getElementById('listaRecados');
const inputNome      = document.getElementById('nomeRecado');
const inputTexto     = document.getElementById('textoRecado');

// Carrega os recados salvos ou cria uma lista vazia
let recados = JSON.parse(localStorage.getItem('recadosSantos') || '[]');

// Salva a lista atual no localStorage
function salvarRecados() {
  localStorage.setItem('recadosSantos', JSON.stringify(recados));
}

// Desenha todos os recados na tela
function desenharRecados() {
  listaRecados.innerHTML = '';

  if (recados.length === 0) {
    listaRecados.innerHTML = `
      <p class="lista-vazia">
        Ainda não há recados. Seja a primeira pessoa a escrever! ✒
      </p>`;
    return;
  }

  // Ordena do mais recente para o mais antigo
  const ordenados = [...recados].sort((a, b) => b.id - a.id);

  ordenados.forEach(recado => {
    const div = document.createElement('div');
    div.className = 'recado';

    // Formata a data para o padrão brasileiro
    const data = new Date(recado.id).toLocaleString('pt-BR', {
      day:   '2-digit',
      month: 'long',
      year:  'numeric',
      hour:  '2-digit',
      minute:'2-digit'
    });

    div.innerHTML = `
      <div class="recado-topo">
        <span class="recado-nome">${escaparHTML(recado.nome)}</span>
        <span class="recado-data">${data}</span>
      </div>
      <p class="recado-texto">${escaparHTML(recado.texto)}</p>
      <div class="recado-acoes">
        <button data-acao="editar"  data-id="${recado.id}">✎ Editar</button>
        <button data-acao="excluir" data-id="${recado.id}" class="btn-excluir">🗑 Excluir</button>
      </div>
    `;

    listaRecados.appendChild(div);
  });
}

// Função que impede comandos HTML maliciosos dentro do recado
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Envio de um novo recado
formRecado.addEventListener('submit', (evento) => {
  evento.preventDefault();

  const nome  = inputNome.value.trim();
  const texto = inputTexto.value.trim();

  if (!nome || !texto) return;

  recados.push({
    id:    Date.now(), // usa o horário atual como "identidade única"
    nome:  nome,
    texto: texto
  });

  salvarRecados();
  desenharRecados();

  // Limpa os campos do formulário
  inputNome.value  = '';
  inputTexto.value = '';
  inputNome.focus();
});

// Editar e Excluir (delegação de eventos)
listaRecados.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;

  const id   = Number(botao.dataset.id);
  const acao = botao.dataset.acao;

  if (acao === 'excluir') {
    if (!confirm('Deseja apagar este recado?')) return;
    recados = recados.filter(r => r.id !== id);
    salvarRecados();
    desenharRecados();

  } else if (acao === 'editar') {
    const recado = recados.find(r => r.id === id);
    if (!recado) return;

    const novoNome  = prompt('Editar nome:', recado.nome);
    if (novoNome === null) return; // usuário cancelou

    const novoTexto = prompt('Editar recado:', recado.texto);
    if (novoTexto === null) return;

    if (novoNome.trim() && novoTexto.trim()) {
      recado.nome  = novoNome.trim();
      recado.texto = novoTexto.trim();
      salvarRecados();
      desenharRecados();
    }
  }
});


/* ============================================================
   BLOCO 9 — INICIAR TUDO QUANDO A PÁGINA CARREGAR
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  // Se o IndexedDB não estiver pronto ainda, desenha os slots vazios assim mesmo
  setTimeout(() => {
    if (Object.keys(midias).length === 0) {
      for (let i = 1; i <= TOTAL_SLOTS; i++) desenharSlot(i);
      atualizarContador();
    }
  }, 300);

  desenharRecados(); // mostra os recados salvos
});