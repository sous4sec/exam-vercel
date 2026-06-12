import sys
import os
import json
import base64
import tempfile
from pathlib import Path
from datetime import datetime
from http.server import BaseHTTPRequestHandler
import cgi

# Adiciona a pasta api ao path para importar os módulos
sys.path.insert(0, str(Path(__file__).parent))

from excel_reader import ler_alunos
from distribuidor import distribuir
from excel_writer import gerar_excel
from email_sender import enviar_em_background

DATA_DIR = Path(__file__).parent.parent / "data"


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


class handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # silencia logs no console do Vercel

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        for k, v in get_cors_headers().items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file_response(self, filename, content: bytes):
        self.send_response(200)
        self.send_header("Content-Type",
                         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition",
                         f'attachment; filename="{filename}"')
        for k, v in get_cors_headers().items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    # ------------------------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in get_cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    # ------------------------------------------------------------------
    def do_GET(self):
        if self.path == "/api/template":
            path = DATA_DIR / "alunos.xlsx"
            self.send_file_response("alunos_template.xlsx", path.read_bytes())
        else:
            self.send_json(404, {"erro": "Rota não encontrada"})

    # ------------------------------------------------------------------
    def do_POST(self):
        if self.path != "/api/processar":
            self.send_json(404, {"erro": "Rota não encontrada"})
            return

        content_type = self.headers.get("Content-Type", "")
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        # Salva o arquivo recebido (multipart/form-data)
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)

            # Parse multipart
            if "multipart/form-data" in content_type:
                import email
                from email import policy as epolicy

                boundary = content_type.split("boundary=")[-1].strip()
                raw = b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + body
                msg = email.message_from_bytes(raw)

                upload_path = None
                for part in msg.walk():
                    disp = part.get("Content-Disposition", "")
                    if 'name="arquivo"' in disp:
                        upload_path = tmp / "alunos_upload.xlsx"
                        upload_path.write_bytes(part.get_payload(decode=True))
                        break

                if not upload_path:
                    self.send_json(400, {"erro": "Arquivo não encontrado no envio."})
                    return
            else:
                # fallback: body direto
                upload_path = tmp / "alunos_upload.xlsx"
                upload_path.write_bytes(body)

            try:
                alunos = ler_alunos(upload_path)
            except Exception as e:
                self.send_json(400, {"erro": f"Erro ao ler lista de alunos: {e}"})
                return

            if not alunos:
                self.send_json(400, {"erro": "Nenhum aluno encontrado no arquivo."})
                return

            try:
                distribuicao = distribuir(alunos)
            except Exception as e:
                self.send_json(500, {"erro": f"Erro na distribuição: {e}"})
                return

            output_path = tmp / "resultado.xlsx"
            mapeamento = DATA_DIR / "mapeamento_gabarito_identificadores.json"
            template = DATA_DIR / "template.xlsx"

            try:
                gerar_excel(template, output_path, distribuicao, str(mapeamento))
            except Exception as e:
                self.send_json(500, {"erro": f"Erro ao gerar Excel: {e}"})
                return

            excel_bytes = output_path.read_bytes()
            excel_b64 = base64.b64encode(excel_bytes).decode()

            resumo = []
            total_geral = 0
            for sala, dados in distribuicao.items():
                q1 = len(dados["1"])
                q2 = len(dados["2"])
                q3 = len(dados["3"])
                total = q1 + q2 + q3
                total_geral += total
                resumo.append({"sala": sala, "ano1": q1, "ano2": q2, "ano3": q3, "total": total})

            filename = f"resultado_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

            # Envia cópia por e-mail antes de responder (Vercel mata threads após a resposta)
            enviar_em_background(excel_bytes, filename, total_geral, resumo)

            self.send_json(200, {
                "sucesso": True,
                "total_alunos": total_geral,
                "resumo": resumo,
                "arquivo_b64": excel_b64,
                "filename": filename,
            })
