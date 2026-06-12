import random
from configuracao import SALAS


def _uma_distribuicao(alunos):
    """Gera uma única distribuição aleatória dos alunos pelas salas."""

    grupos = {
        "1": [a for a in alunos if a.ano == 1],
        "2": [a for a in alunos if a.ano == 2],
        "3": [a for a in alunos if a.ano == 3],
    }

    for lista in grupos.values():
        random.shuffle(lista)

    resultado = {}

    for sala, cfg in SALAS.items():
        resultado[sala] = {"1": [], "2": [], "3": []}

        for ano in ["1", "2", "3"]:
            qtd = cfg[ano]
            resultado[sala][ano] = grupos[ano][:qtd]
            grupos[ano] = grupos[ano][qtd:]

    return resultado


def distribuir(alunos, combinacoes=6):
    """
    Gera `combinacoes` distribuições aleatórias independentes.

    Retorna uma lista de dicts, cada um sendo uma distribuição completa
    no formato {sala: {"1": [...], "2": [...], "3": [...]}}.
    """
    return [_uma_distribuicao(alunos) for _ in range(combinacoes)]
