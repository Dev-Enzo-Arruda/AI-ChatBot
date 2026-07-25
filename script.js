const lista = [
    "Oi, bom dia",
    "sou uma fake IA Generativa",
    "criada em uma aula de IA",
    "IA é Inteligência Artificial",
    "ainda não sou muito inteligente",
    "sou apenas um texto em uma lista de frases",
    "que aparece quando você clica em um botão"
];

function funcao() {
    const n = Math.floor(Math.random() * lista.length);
    resposta.innerHTML = lista[n];
}