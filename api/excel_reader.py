import pandas as pd
from models import Aluno

def ler_alunos(caminho):

    alunos = []

    xls = pd.ExcelFile(caminho)

    for aba in xls.sheet_names:

        df = pd.read_excel(xls, sheet_name=aba)

        for _, row in df.iterrows():

            nome = str(row["NOME"]).strip()
            ra = str(row["RA"]).strip()
            turma = str(row["TURMA"]).strip()

            try:
                ano = int(str(row["ANO"]).strip())
            except:
                ano = int(turma[0])

            alunos.append(
                Aluno(
                    nome=nome,
                    ra=ra,
                    turma=turma,
                    ano=ano
                )
            )

    return alunos