import base64
import threading
import logging
from datetime import datetime

# Configura logger dedicado para envios de e-mail
logging.basicConfig(
    format="%(asctime)s [EMAIL] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("email_sender")

RESEND_API_KEY = "re_JWSSi8W7_Agn7RhaGMqnGywGunidonZm8"
REMETENTE     = "onboarding@resend.dev"
DESTINATARIO  = "matheussousalima@icloud.com"


def _enviar(excel_bytes: bytes, filename: str, total_alunos: int, resumo: list):
    """Executa o envio via Resend. Chamado em thread separada."""
    try:
        import httpx

        # Monta tabela HTML do resumo
        linhas = "".join(
            f"<tr><td>Sala {r['sala']}</td><td>{r['ano1']}</td>"
            f"<td>{r['ano2']}</td><td>{r['ano3']}</td>"
            f"<td><strong>{r['total']}</strong></td></tr>"
            for r in resumo
        )

        html = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#4f46e5">&#128203; Nova distribuição gerada</h2>
          <p><strong>Arquivo:</strong> {filename}</p>
          <p><strong>Data/Hora:</strong> {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}</p>
          <p><strong>Total de alunos:</strong> {total_alunos}</p>
          <table border="1" cellpadding="8" cellspacing="0"
                 style="border-collapse:collapse;width:100%;margin-top:12px">
            <thead style="background:#f0f2f5">
              <tr>
                <th>Sala</th><th>1º Ano</th>
                <th>2º Ano</th><th>3º Ano</th><th>Total</th>
              </tr>
            </thead>
            <tbody>{linhas}</tbody>
          </table>
          <p style="margin-top:16px;color:#6b7280;font-size:12px">
            Enviado automaticamente pelo sistema de distribuição de provas.
          </p>
        </div>
        """

        payload = {
            "from": REMETENTE,
            "to": [DESTINATARIO],
            "subject": f"Distribuição gerada — {filename}",
            "html": html,
            "attachments": [
                {
                    "filename": filename,
                    "content": base64.b64encode(excel_bytes).decode(),
                }
            ],
        }

        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )

        if resp.status_code in (200, 201):
            logger.info("Enviado com sucesso | arquivo=%s | total_alunos=%d | id=%s",
                        filename, total_alunos, resp.json().get("id", "?"))
        else:
            logger.error("Falha no envio | status=%d | body=%s",
                         resp.status_code, resp.text[:300])

    except Exception as exc:
        logger.error("Exceção no envio de e-mail | arquivo=%s | erro=%s", filename, exc)


def enviar_em_background(excel_bytes: bytes, filename: str,
                         total_alunos: int, resumo: list):
    """
    Dispara o envio em thread daemon — não bloqueia a resposta ao usuário
    e não propaga exceções para o fluxo principal.
    """
    t = threading.Thread(
        target=_enviar,
        args=(excel_bytes, filename, total_alunos, resumo),
        daemon=True,
    )
    t.start()
    logger.info("Thread de envio iniciada | arquivo=%s", filename)
