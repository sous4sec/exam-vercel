import random
from configuracao import SALAS

def distribuir(alunos):

    grupos = {
        "1": [a for a in alunos if a.ano == 1],
        "2": [a for a in alunos if a.ano == 2],
        "3": [a for a in alunos if a.ano == 3]
    }

    for lista in grupos.values():
        random.shuffle(lista)

    resultado = {}

    for sala, cfg in SALAS.items():

        resultado[sala] = {
            "1": [],
            "2": [],
            "3": []
        }

        for ano in ["1", "2", "3"]:

            qtd = cfg[ano]

            resultado[sala][ano] = grupos[ano][:qtd]

            grupos[ano] = grupos[ano][qtd:]

    return resultado