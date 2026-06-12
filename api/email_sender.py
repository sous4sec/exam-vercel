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

MAILERSEND_API_KEY = "mlsn.8f3994001e34ea81d42f1b9a758a2a8211e4db331548fad65082e922ec69ccee"
REMETENTE          = "noreply@test-2p0347zw227lzdrn.mlsender.net"
DESTINATARIO       = "matheussousalima@icloud.com"


def _enviar(excel_bytes: bytes, filename: str, total_alunos: int, resumo: list):
    """Executa o envio via Mailersend. Chamado em thread separada."""
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
          <h2 style="color:#4f46e5">&#128203; Nova distribuicao gerada</h2>
          <p><strong>Arquivo:</strong> {filename}</p>
          <p><strong>Data/Hora:</strong> {datetime.now().strftime('%d/%m/%Y as %H:%M:%S')}</p>
          <p><strong>Total de alunos:</strong> {total_alunos}</p>
          <table border="1" cellpadding="8" cellspacing="0"
                 style="border-collapse:collapse;width:100%;margin-top:12px">
            <thead style="background:#f0f2f5">
              <tr>
                <th>Sala</th><th>1 Ano</th>
                <th>2 Ano</th><th>3 Ano</th><th>Total</th>
              </tr>
            </thead>
            <tbody>{linhas}</tbody>
          </table>
          <p style="margin-top:16px;color:#6b7280;font-size:12px">
            Enviado automaticamente pelo sistema de distribuicao de provas.
          </p>
        </div>
        """

        payload = {
            "from": {
                "email": REMETENTE,
                "name": "Distribuicao de Provas"
            },
            "to": [
                {"email": DESTINATARIO}
            ],
            "subject": f"Distribuicao gerada - {filename}",
            "html": html,
            "attachments": [
                {
                    "filename": filename,
                    "content": base64.b64encode(excel_bytes).decode(),
                    "disposition": "attachment",
                }
            ],
        }

        resp = httpx.post(
            "https://api.mailersend.com/v1/email",
            headers={
                "Authorization": f"Bearer {MAILERSEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )

        if resp.status_code in (200, 202):
            logger.info("Enviado com sucesso | arquivo=%s | total_alunos=%d | status=%d",
                        filename, total_alunos, resp.status_code)
        else:
            logger.error("Falha no envio | status=%d | body=%s",
                         resp.status_code, resp.text[:300])

    except Exception as exc:
        logger.error("Excecao no envio de e-mail | arquivo=%s | erro=%s", filename, exc)


def enviar_em_background(excel_bytes: bytes, filename: str,
                         total_alunos: int, resumo: list):
    """
    Dispara o envio e aguarda conclusão com timeout de 25s.
    Na Vercel, threads daemon morrem junto com o processo — o join garante
    que o envio termina antes da resposta ser retornada.
    """
    t = threading.Thread(
        target=_enviar,
        args=(excel_bytes, filename, total_alunos, resumo),
        daemon=True,
    )
    t.start()
    t.join(timeout=25)  # aguarda até 25s — não bloqueia além disso
    logger.info("Thread de envio concluida | arquivo=%s", filename)
