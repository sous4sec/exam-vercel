import json
from pathlib import Path
from typing import Dict, List


def carregar_mapeamento(caminho: str) -> Dict:
    """
    Carrega o arquivo de mapeamento de células do Excel.
    
    Args:
        caminho: Caminho para o arquivo JSON de mapeamento
        
    Returns:
        Dicionário com o mapeamento organizado por sala
    """
    with open(caminho, 'r', encoding='utf-8') as f:
        dados_brutos = json.load(f)
    
    mapeamento = {}
    
    for sala_data in dados_brutos:
        nome_sala = sala_data['nome']
        layout = sala_data['layout']
        
        # Extrair número da sala (ex: "Sala 13" -> 13)
        numero_sala = int(nome_sala.split()[-1])
        
        # Processar fileiras e suas carteiras
        carteiras_por_serie = {}
        
        for fileira in layout['fileiras']:
            for carteira_data in fileira:
                serie = carteira_data['serie']
                if serie not in carteiras_por_serie:
                    carteiras_por_serie[serie] = []
                
                carteiras_por_serie[serie].append({
                    'carteira': carteira_data['carteira'],
                    'celula_numero': carteira_data['celula_numero'],
                    'celula_serie_base': carteira_data['celula_serie_base'],
                    'cor': carteira_data['cor']
                })
        
        mapeamento[numero_sala] = {
            'nome': nome_sala,
            'carteiras_por_serie': carteiras_por_serie,
            'elementos_extras': layout['elementos_extras'],
            'celula_cabecalho': layout['celula_cabecalho']
        }
    
    return mapeamento


def obter_celula_aluno(mapeamento: Dict, numero_sala: int, serie: str, indice: int) -> str:
    """
    Obtém a célula do Excel para um aluno em uma posição específica.
    
    Args:
        mapeamento: Dicionário de mapeamento
        numero_sala: Número da sala
        serie: Série do aluno (ex: "1º ano")
        indice: Índice na série (0-based)
        
    Returns:
        Célula do Excel (ex: "A5")
    """
    if numero_sala not in mapeamento:
        return None
    
    sala = mapeamento[numero_sala]
    
    if serie not in sala['carteiras_por_serie']:
        return None
    
    carteiras = sala['carteiras_por_serie'][serie]
    
    if indice >= len(carteiras):
        return None
    
    return carteiras[indice]['celula_numero']


def obter_todas_celulas_sala(mapeamento: Dict, numero_sala: int) -> Dict[str, List[str]]:
    """
    Obtém todas as células de uma sala organizadas por série.
    
    Args:
        mapeamento: Dicionário de mapeamento
        numero_sala: Número da sala
        
    Returns:
        Dicionário com células por série
    """
    if numero_sala not in mapeamento:
        return {}
    
    sala = mapeamento[numero_sala]
    celulas_por_serie = {}
    
    for serie, carteiras in sala['carteiras_por_serie'].items():
        celulas_por_serie[serie] = [c['celula_numero'] for c in carteiras]
    
    return celulas_por_serie
