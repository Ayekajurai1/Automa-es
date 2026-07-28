import hmac
import os
import secrets
import uuid
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).parent
HTML_FILE = BASE_DIR / "gestao-performance-atualizado(5).html"

app = Flask(__name__)

# --- Configuração do banco de dados ---
# Em produção (Render/Railway/Vercel), defina a variável de ambiente DATABASE_URL
# (Postgres) — obrigatório para os dados serem compartilhados entre a equipe.
# Localmente, sem essa variável, usa um arquivo SQLite (chronos.db).
#
# Em serverless (Vercel), o sistema de arquivos do projeto é somente leitura;
# só /tmp aceita escrita. Sem DATABASE_URL configurada, o SQLite cai em /tmp
# para não derrubar a função — mas os dados NÃO persistem entre execuções,
# então configure DATABASE_URL com um Postgres para uso real em produção.
if os.environ.get("VERCEL"):
    default_sqlite_path = "/tmp/chronos.db"
else:
    default_sqlite_path = str(BASE_DIR / "chronos.db")
database_url = os.environ.get("DATABASE_URL", f"sqlite:///{default_sqlite_path}")
# Render/Heroku fornecem a URL como "postgres://", mas o SQLAlchemy/psycopg exige "postgresql://"
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# --- Autenticação por token ---
# Em produção, defina SECRET_KEY como variável de ambiente fixa: sem ela, uma
# chave aleatória é gerada a cada início do processo e, em serverless (cold
# starts frequentes), os usuários seriam deslogados com frequência.
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
token_serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="chronos-auth")
TOKEN_MAX_AGE = 60 * 60 * 12  # 12 horas


# --- Modelos ---
class Activity(db.Model):
    __tablename__ = "activities"
    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(32), nullable=False, default="other")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "type": self.type}


class CostCenter(db.Model):
    __tablename__ = "cost_centers"
    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(255), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Collaborator(db.Model):
    __tablename__ = "collaborators"
    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(255), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Account(db.Model):
    __tablename__ = "accounts"
    username = db.Column(db.String(120), primary_key=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(16), nullable=False, default="user")
    security_question = db.Column(db.String(255), nullable=True)
    security_answer_hash = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            "username": self.username,
            "role": self.role,
            "hasSecurityQuestion": bool(self.security_question and self.security_answer_hash),
        }


class Entry(db.Model):
    __tablename__ = "entries"
    id = db.Column(db.String(64), primary_key=True)
    colab = db.Column(db.String(255), nullable=False)
    date = db.Column(db.String(10), nullable=False)  # formato YYYY-MM-DD
    activity_id = db.Column(db.String(64), nullable=False)
    cost_center_id = db.Column(db.String(64), nullable=True)
    details = db.Column(db.Text, nullable=True)
    hours = db.Column(db.Float, nullable=False)
    created_by = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "colab": self.colab,
            "date": self.date,
            "activityId": self.activity_id,
            "costCenterId": self.cost_center_id or "",
            "details": self.details or "",
            "hours": self.hours,
            "createdBy": self.created_by or "",
        }


DEFAULT_ACTIVITIES = [
    {"id": "a1", "name": "Análise de Prestação de Contas", "type": "core"},
    {"id": "a2", "name": "Elaboração de Relatório Financeiro", "type": "core"},
    {"id": "a3", "name": "Organização de Benefícios", "type": "core"},
    {"id": "a4", "name": "Suporte a Auditoria", "type": "core"},
    {"id": "a5", "name": "Reunião", "type": "admin"},
    {"id": "a6", "name": "E-mail / Comunicação", "type": "admin"},
    {"id": "a7", "name": "Tarefas administrativas", "type": "admin"},
]

DEFAULT_COST_CENTERS = [
    {"id": "cc-2007", "name": "2007 - ADMINISTRACAO"},
    {"id": "cc-2012", "name": "2012 - PROVITA"},
    {"id": "cc-2025", "name": "2025 - BITLABS"},
    {"id": "cc-2027", "name": "2027 - EDITAIS"},
    {"id": "cc-2030", "name": "2030 - POOL - PNE"},
    {"id": "cc-2036", "name": "2036 - EQUIPE DE T.I."},
    {"id": "cc-2040", "name": "2040 - COORDENADORES"},
    {"id": "cc-2041", "name": "2041 - LICENÇA NÃO REMUNERADA"},
    {"id": "cc-2044", "name": "2044 - SGQ - SISTEMA DE GESTÃO DA QUALIDADE"},
    {"id": "cc-2051", "name": "2051 - COMUNICAÇÃO"},
    {"id": "cc-2052", "name": "2052 - NOVOS NEGOCIOS"},
    {"id": "cc-2055", "name": "2055 - CUSTOS PROJETOS - INC"},
    {"id": "cc-2056", "name": "2056 - EQUIPE RESERVA - POOL PROJETOS"},
    {"id": "cc-2058", "name": "2058 - CUSTOS DE PROJETOS CM"},
    {"id": "cc-2059", "name": "2059 - CUSTO FIXO - PROJETOS CM"},
    {"id": "cc-2063", "name": "2063 - Comercial"},
    {"id": "cc-2065", "name": "2065 - Serviços de Hardware"},
    {"id": "cc-2069", "name": "2069 - Rescisão FPF"},
    {"id": "cc-2070", "name": "2070 - Estagiário"},
    {"id": "cc-2072", "name": "2072 - Técnicos Engenharia"},
    {"id": "cc-2076", "name": "2076 - WIT"},
    {"id": "cc-2077", "name": "2077 - SGP - DD&L"},
    {"id": "cc-2078", "name": "2078 - SERVIÇO ESD"},
    {"id": "cc-2079", "name": "2079 - Projeto Amapá"},
    {"id": "cc-2081", "name": "2081 - Biorreator - EVA Scientific"},
    {"id": "cc-2082", "name": "2082 - JURÍDICO"},
    {"id": "cc-2083", "name": "2083 - RH"},
    {"id": "cc-2084", "name": "2084 - P&D CONTRATOS"},
    {"id": "cc-2085", "name": "2085 - CONTROLADORIA"},
    {"id": "cc-2505", "name": "2505 - MODULOS TERMINAIS AUTO BANCARIOS (TIME FIXO)"},
    {"id": "cc-2526", "name": "2526 - SERVIÇO DE DESENVOLVIMENTO DE SOFTWARE"},
    {"id": "cc-2527", "name": "2527 - Simulador Inteligente de HW  (Jiga 2.0)"},
    {"id": "cc-2529", "name": "2529 - Adm Redes e Suporte TI"},
    {"id": "cc-4711", "name": "4711 - P-PLAN"},
    {"id": "cc-4713", "name": "4713 - Cobertura de Testes (Teste Coverage)"},
    {"id": "cc-4714", "name": "4714 - PLANMAT - PLANEJAMENTO DE MATERIAIS"},
    {"id": "cc-4715", "name": "4715 - NRE CONTROL"},
    {"id": "cc-4716", "name": "4716 - DERMAVISION AI"},
    {"id": "cc-4717", "name": "4717 - NCIA"},
    {"id": "cc-4718", "name": "4718 - PERFORMANCE HUB"},
    {"id": "cc-4814", "name": "4814 - Serviço Programação Robô"},
    {"id": "cc-4815", "name": "4815 - Sistema de Pega de Ganchos"},
    {"id": "cc-4816", "name": "4816 - Capacitação de Robótica - Fanuc"},
    {"id": "cc-4817", "name": "4817 - FUSO DE PUCKS"},
    {"id": "cc-4818", "name": "4818 - Serviço Linha Jupiter – Robôs Scara e Cartesiano"},
    {"id": "cc-4819", "name": "4819 - Serviço Usinagem de Peças Taleira Relumac I e II"},
    {"id": "cc-5011", "name": "5011 - VOLCANO"},
    {"id": "cc-5012", "name": "5012 - Phenomenon"},
    {"id": "cc-5013", "name": "5013 - Lego"},
    {"id": "cc-5014", "name": "5014 - Multiplex Tuners"},
    {"id": "cc-5015", "name": "5015 - MATRIX"},
    {"id": "cc-5016", "name": "5016 - Thundera (Charger Station)"},
    {"id": "cc-5017", "name": "5017 - The Beholder"},
    {"id": "cc-5018", "name": "5018 - Jasper Hale"},
    {"id": "cc-5019", "name": "5019 - A QUIET PLACE"},
    {"id": "cc-5410", "name": "5410 - TIME FIXO - 3M"},
    {"id": "cc-5424", "name": "5424 - Reciclagem PVC"},
    {"id": "cc-5425", "name": "5425 - Automatização de Respiradores"},
    {"id": "cc-5426", "name": "5426 - Programação do Robô Injetora"},
    {"id": "cc-5427", "name": "5427 - Programação do Robô 2 da Injetora 7"},
    {"id": "cc-5428", "name": "5428 - Impressão em Manufatura Aditiva"},
    {"id": "cc-5429", "name": "5429 - Alimentador Automático da Moega"},
    {"id": "cc-5430", "name": "5430 - Manutenções Inteligentes para Prevenção e predição na indústria 4.0"},
    {"id": "cc-6946", "name": "6946 - CHATDL"},
    {"id": "cc-6948", "name": "6948 - CALL HOME"},
    {"id": "cc-6949", "name": "6949 - SIGO – Sistema Inteligente de Gestão Otimizada"},
    {"id": "cc-6950", "name": "6950 - Smart HaaS AI"},
    {"id": "cc-6951", "name": "6951 - SELLER"},
    {"id": "cc-6952", "name": "6952 - Speed Mind AI"},
    {"id": "cc-6953", "name": "6953 - Serviço de Implantação do Projeto Zion em Manaus"},
    {"id": "cc-6954", "name": "6954 - Hubble"},
    {"id": "cc-6955", "name": "6955 - Smart Dest"},
    {"id": "cc-6956", "name": "6956 - Control Center"},
    {"id": "cc-6957", "name": "6957 - ATLAS"},
    {"id": "cc-6958", "name": "6958 - Smart Health"},
    {"id": "cc-6959", "name": "6959 - ASSETFLOW"},
    {"id": "cc-6960", "name": "6960 - + Inteligente"},
    {"id": "cc-7728", "name": "7728 - SMART CLEANER"},
    {"id": "cc-7729", "name": "7729 - OpeFinance"},
    {"id": "cc-7730", "name": "7730 - Smart Manager 4.0"},
    {"id": "cc-8316", "name": "8316 - SAIPH"},
    {"id": "cc-8317", "name": "8317 - NETSPHER"},
    {"id": "cc-8318", "name": "8318 - Alfa Centauri"},
    {"id": "cc-9007", "name": "9007 - ECOGRID POWERHUB"},
    {"id": "cc-9107", "name": "9107 - Crimping Machine"},
    {"id": "cc-9601", "name": "9601 - MANUTENCAO SISTEMA ANOREG"},
    {"id": "cc-9605", "name": "9605 - Suporte Plataforma Selo Eletrônico"},
    {"id": "cc-9606", "name": "9606 - Serviço Desenvolvimento SW"},
    {"id": "cc-9724", "name": "9724 - AUTOMAÇÃO DE APLICAÇÃO DE ETIQUETA"},
    {"id": "cc-9802", "name": "9802 - SERVIÇO DE MANUTENÇÃO ESD"},
    {"id": "cc-001327", "name": "001327 - Barrier"},
    {"id": "cc-001329", "name": "001329 - Serviço Lab. Industria 4.0"},
    {"id": "cc-001331", "name": "001331 - Vessel Tracking - Cygnus"},
    {"id": "cc-001334", "name": "001334 - Profit Model"},
    {"id": "cc-001335", "name": "001335 - Damper – Fase II"},
    {"id": "cc-001336", "name": "001336 - AX Academy"},
    {"id": "cc-001401", "name": "001401 - OPERACIONAL COST"},
    {"id": "cc-001506", "name": "001506 - BUNKER"},
    {"id": "cc-001508", "name": "001508 - LG - ZONA FRANCA MASTER"},
    {"id": "cc-001604", "name": "001604 - Capacitação Ensino Médio Técnico em Automação Industrial"},
    {"id": "cc-001605", "name": "001605 - Capacitação Técnico em Automação Industrial"},
    {"id": "cc-001606", "name": "001606 - IA para transformação digital na Indústria 4.0"},
    {"id": "cc-001909", "name": "001909 - Conceitos Básicos Ind. 4.0 - Sense Bike"},
    {"id": "cc-001910", "name": "001910 - Introdução a Manufatura Avanç - Samsung"},
    {"id": "cc-001911", "name": "001911 - Introdução a Manufatura Avanç - Salcomp"},
    {"id": "cc-001912", "name": "001912 - Produção Enxuta para Ind 4.0 - Samsung"},
    {"id": "cc-001913", "name": "001913 - Interface Homem Máquina - Samsung"},
    {"id": "cc-001914", "name": "001914 - Big Data - Samsung"},
    {"id": "cc-001915", "name": "001915 - Computação em Nuvem - Samsung"},
    {"id": "cc-001916", "name": "001916 - Internet das Coisas - IoT - Samsung"},
    {"id": "cc-001917", "name": "001917 - Integração de Sistemas Manufatura - Samsung"},
    {"id": "cc-001918", "name": "001918 - Conceitos Básico para a Industria 4.0 - Salcomp"},
    {"id": "cc-001919", "name": "001919 - Integração de Sistemas Manufatura - Salcomp"},
    {"id": "cc-001920", "name": "001920 - Segurança Cibernética - LG"},
    {"id": "cc-001921", "name": "001921 - Inovação em Design Thinking - LG"},
    {"id": "cc-001922", "name": "001922 - Inteligência Artificial - Samsung"},
    {"id": "cc-001923", "name": "001923 - Técnicas de Simulação - Samsung"},
    {"id": "cc-001924", "name": "001924 - Produção Enxuta para a Indústria 4.0 - Salcomp"},
    {"id": "cc-001925", "name": "001925 - NCR - Automação Industrial"},
    {"id": "cc-001926", "name": "001926 - Salcomp - Abordagem Seis Sigma"},
    {"id": "cc-001927", "name": "001927 - Sense Bike - Automação Industrial"},
    {"id": "cc-001928", "name": "001928 - Sistema Embarcados - Samsung"},
    {"id": "cc-001929", "name": "001929 - Automação Industrial - Salcomp"},
    {"id": "cc-001930", "name": "001930 - Conceitos Básicos Ind 4.0 - Diebold"},
    {"id": "cc-001931", "name": "001931 - Salcomp - Metodologia Seis Sigmas"},
    {"id": "cc-001932", "name": "001932 - Industria 4.0 - LG"},
    {"id": "cc-001933", "name": "001933 - Produção Enxuta para Industria 4.0 - Diebold"},
    {"id": "cc-002102", "name": "002102 - IFAM AGENDAMENTO"},
    {"id": "cc-100202", "name": "100202 - Smart HaaS ACC Brasil"},
    {"id": "cc-100301", "name": "100301 - Projeto APEX"},
    {"id": "cc-100501", "name": "100501 - Serviços SW - Ceras Johnson"},
    {"id": "cc-100601", "name": "100601 - Serviços Portal CM7"},
    {"id": "cc-100701", "name": "100701 - Teste de SW Sasmet"},
    {"id": "cc-100901", "name": "100901 - GIV LATAM"},
    {"id": "cc-101202", "name": "101202 - TORPEDO – Solução Gestão Recargas Veículos Elétricos"},
    {"id": "cc-101203", "name": "101203 - goNANSEN"},
    {"id": "cc-101402", "name": "101402 - AUTO RTS"},
    {"id": "cc-101403", "name": "101403 - Receive HUB"},
    {"id": "cc-101404", "name": "101404 - EdgeAI"},
    {"id": "cc-101405", "name": "101405 - Global IPR 2.0"},
    {"id": "cc-101406", "name": "101406 - WAC"},
    {"id": "cc-101605", "name": "101605 - PUR 019/2021 - E-People - TPV"},
    {"id": "cc-101607", "name": "101607 - PUR 104/2023 - Capacitação Tec. Automação Industrial - Diebold"},
    {"id": "cc-101608", "name": "101608 - PUR 079/2022 - Automatização do Aparafusamento de Notebooks - Positivo"},
    {"id": "cc-101609", "name": "101609 - PUR 102/2023 - Capacitação Tec. Automação Industrial - Foxconn/TPV"},
    {"id": "cc-101610", "name": "101610 - PUR 103/2023 - Capacitação Tec. em Informática para Internet - Foxconn/TPV"},
    {"id": "cc-101611", "name": "101611 - PUR 140/2023 - Seleção Amostras metrológica - Sagemcom"},
    {"id": "cc-101612", "name": "101612 - PUR 165/2023 - Capacitação Manutenção Preventiva e Preditiva - Foxconn"},
    {"id": "cc-101613", "name": "101613 - PUR 166/2023 - Capacitação em Metrologia - Foxconn"},
    {"id": "cc-101614", "name": "101614 - PUR 186/2023 - Treinamento para Multiplicadores de Cursos em Indústria Eletrônica - Positivo"},
    {"id": "cc-101615", "name": "101615 - PUR 169/2023 - Certificação do IPC-771121 – Foxconn"},
    {"id": "cc-101616", "name": "101616 - PUR 174/2023 - Capacitação Técnica em Informática para Internet - Foxconn"},
    {"id": "cc-101617", "name": "101617 - PUR 175/2023 - Capacitação Técnica em Automação Industrial - Foxconn"},
    {"id": "cc-101618", "name": "101618 - PUR 252/2024 - Diagnóstico de Maturidade I4.0 Acatech - Jabil"},
    {"id": "cc-101619", "name": "101619 - PUR 241/2024 - Análise de Visão Integrada - Sagemcom"},
    {"id": "cc-101620", "name": "101620 - PUR 235/2024 - SHIELD - TPV"},
    {"id": "cc-101621", "name": "101621 - PUR 243/2024 - CAPACITAÇÃO EM CURSOS DE TECNOLOGIA"},
    {"id": "cc-101622", "name": "101622 - PUR 244/2024 - CAPACITAÇÃO EM CURSOS DE GESTÃO"},
    {"id": "cc-101623", "name": "101623 - PUR 245/2024 - CAPACITAÇÃO EM CURSOS DE COMPUTAÇÃO"},
    {"id": "cc-101624", "name": "101624 - PUR 263/2024 - ESPECIALISTA EM TRANSFORMAÇÃO DIGITAL AVANÇADO"},
    {"id": "cc-101625", "name": "101625 - PUR 262/2024 – Projeto Especialista em Transformação Digital Básico"},
    {"id": "cc-101626", "name": "101626 - PUR 304/2024 - Capacitação em Analise de Dados"},
    {"id": "cc-101628", "name": "101628 - PUR 296/2024 – Capacitação em Produção Enxuta"},
    {"id": "cc-101629", "name": "101629 - PUR 355/2024 - Segundo Diagnóstico de Maturidade I4.0 Acatech"},
    {"id": "cc-101630", "name": "101630 - PUR 356/2024 – Capacitação Gestão ágil Projetos Manufatura 4.0"},
    {"id": "cc-101631", "name": "101631 - PUR 352/2024 – Capacitação Produção Enxuta"},
    {"id": "cc-101632", "name": "101632 - PUR 340/2024 - Gestão para a Manufatura Inteligente"},
    {"id": "cc-101633", "name": "101633 - PUR 311/2024 – Sentinela – Automação do Processo de Inventário com Drones"},
    {"id": "cc-101634", "name": "101634 - PUR 374/2024 - Ultimate"},
    {"id": "cc-101635", "name": "101635 - PUR 376/2024 - Capacitação em Transformação Digital"},
    {"id": "cc-101636", "name": "101636 - PUR 398/2024 - SYSLOG"},
    {"id": "cc-101637", "name": "101637 - PUR 386/2024 - GEMINI"},
    {"id": "cc-101638", "name": "101638 - PUR 395/2025 - Capacitação em Tecnologia para Industria 4.0"},
    {"id": "cc-101639", "name": "101639 - PUR 419/2025 - Certificação do IPC-7711/21"},
    {"id": "cc-101640", "name": "101640 - PUR 339/2024 - K-DOCTOR 4.0"},
    {"id": "cc-101641", "name": "101641 - PUR 413/2025 - RUBI"},
    {"id": "cc-101642", "name": "101642 - PUR 410/2025 - QUARTZO"},
    {"id": "cc-101643", "name": "101643 - PUR 458/2025 - Transformação Digital nos Processos da Qualidade para Industria 4.0"},
    {"id": "cc-101644", "name": "101644 - PUR 459/2025 - BERÇO"},
    {"id": "cc-101645", "name": "101645 - PUR 479/2025 - Capacitação em Manutenção Preventiva"},
    {"id": "cc-101646", "name": "101646 - PUR 449/2025 - BMS VOLTA"},
    {"id": "cc-101647", "name": "101647 - PUR 493/2025 - Curso Técnico em Informática para Internet"},
    {"id": "cc-101648", "name": "101648 - PUR 537/2026 – ANDRÔMEDA"},
    {"id": "cc-101649", "name": "101649 - PUR 536/2026 - Hyper Test"},
    {"id": "cc-101650", "name": "101650 - PUR 556/2026 - POMS"},
    {"id": "cc-101651", "name": "101651 - PUR 559/2026 - AGV 4.0"},
    {"id": "cc-101702", "name": "101702 - AMAZONIA + GLOBAL"},
    {"id": "cc-101703", "name": "101703 - PUR 23/2024 - Capacitação Técnica em Automação Industrial - DIEBOLD"},
    {"id": "cc-101704", "name": "101704 - CNV 54/2025 - Graduação em Automação Industrial – Tecnólogo de Automação Industrial – Diebold (PUR 02/2025)"},
    {"id": "cc-101902", "name": "101902 - SISTEMA DE INJEÇÃO DE LENTES"},
    {"id": "cc-102102", "name": "102102 - Capacitação Profissional Técnica de Nível Médio em Automação Industrial"},
    {"id": "cc-102401", "name": "102401 - CALL HOME"},
    {"id": "cc-102402", "name": "102402 - CHATDL"},
    {"id": "cc-102403", "name": "102403 - SERVIÇO DE MANUTENÇÃO DE SOFTWARE"},
    {"id": "cc-102501", "name": "102501 - Hawk Innovation Center"},
    {"id": "cc-102502", "name": "102502 - Hawk - Contrapartida"},
    {"id": "cc-102503", "name": "102503 - Parque Tecnológico"},
    {"id": "cc-102504", "name": "102504 - Parque Tecnológico - Contrapartida"},
    {"id": "cc-102601", "name": "102601 - PPBIO BIOZER CICATRIZANTE PUR 04/2024"},
    {"id": "cc-102602", "name": "102602 - PPBIO AMANAYARA PUR 11/2024"},
    {"id": "cc-102603", "name": "102603 - PPBIO EKUIA PUR 10/2024"},
    {"id": "cc-102604", "name": "102604 - PPBIO ESSENCIAL PUR 09/2024"},
    {"id": "cc-102605", "name": "102605 - PPBIO YARA COURO PUR 08/2024"},
    {"id": "cc-102606", "name": "102606 - PPBIO TERRAMAZONIA"},
    {"id": "cc-102607", "name": "102607 - PPBIO DARVORE PUR 19/2024"},
    {"id": "cc-102608", "name": "102608 - PPBIO BIOZER PHARMA PUR 20/2024"},
    {"id": "cc-102609", "name": "102609 - PPBIO EKILIBRE PUR 21/2024"},
    {"id": "cc-102610", "name": "102610 - PPBIO BIOAGES PUR 22/2024"},
    {"id": "cc-102611", "name": "102611 - PPBIO ABUFARI PUR 24/2024"},
    {"id": "cc-102612", "name": "102612 - PPBIO HIDREO (METHA) PUR 25/2024"},
    {"id": "cc-102613", "name": "102613 - PPBIO QUESTION MARK PUR 26/2024"},
    {"id": "cc-102614", "name": "102614 - PPBIO CASA DA AMAZONIA PUR 01/2025"},
    {"id": "cc-102615", "name": "102615 - PPBIO GESTÃO INTELIGENTE DE RESIDUOS 005/2025"},
    {"id": "cc-102616", "name": "102616 - PPBIO AMAZONCURE APL NA SAÚDE 007/2025"},
    {"id": "cc-102617", "name": "102617 - PPBIO AMAZONCURE ULCERA 006/2025"},
    {"id": "cc-102618", "name": "102618 - PPBIO CELLVA PUR 013/2025"},
    {"id": "cc-102619", "name": "102619 - PPBIO BACTOLAC CNV 02/2026"},
    {"id": "cc-102620", "name": "102620 - PPBIO AMACRO"},
    {"id": "cc-102621", "name": "102621 - PPBIO ATTALEA SPECIOSA"},
    {"id": "cc-102622", "name": "102622 - PPBIO REGENERA SAF AMAZONIA"},
    {"id": "cc-102623", "name": "102623 - PPBIO BIOLINKER BIOLOGIA SINTETICA"},
    {"id": "cc-102624", "name": "102624 - PPBIO SOLALIS PUR 12/2026"},
    {"id": "cc-102625", "name": "102625 - PPBIO WAPE PUR 09/2026"},
    {"id": "cc-102626", "name": "102626 - PPBIO PPBIO ANI PUR 16/2025"},
    {"id": "cc-102701", "name": "102701 - INSPEÇÃO VIN - SERVIÇO"},
    {"id": "cc-102801", "name": "102801 - LEAN SIX SIGMA"},
    {"id": "cc-102901", "name": "102901 - SERVIÇO DE DESENVOLVIMENTO DE SOFTWARE"},
    {"id": "cc-103001", "name": "103001 - GERAL"},
    {"id": "cc-103002", "name": "103002 - CURSO DE EXTENSÃO"},
    {"id": "cc-103003", "name": "103003 - ESCOLA"},
    {"id": "cc-103004", "name": "103004 - FACULDADE"},
    {"id": "cc-103005", "name": "103005 - PÓS-GRADUAÇÃO"},
    {"id": "cc-103006", "name": "103006 - ENSINO TÉCNICO"},
    {"id": "cc-103101", "name": "103101 - Capacitação em Robôs FANUC"},
    {"id": "cc-103201", "name": "103201 - Gribouille"},
    {"id": "cc-103301", "name": "103301 - IA com foco em Copilot"},
    {"id": "cc-103401", "name": "103401 - GovEasy"},
    {"id": "cc-103501", "name": "103501 - Empreender Outra Vez (Qualifica Mais)"},
    {"id": "cc-103601", "name": "103601 - Amazônia Innovation Summit"},
]

def run_migrations():
    """Adiciona colunas novas em bancos já existentes (sem Alembic, para um projeto pequeno)."""
    inspector = db.inspect(db.engine)
    existing_columns = {col["name"] for col in inspector.get_columns("accounts")}
    with db.engine.begin() as conn:
        if "security_question" not in existing_columns:
            conn.execute(db.text("ALTER TABLE accounts ADD COLUMN security_question VARCHAR(255)"))
        if "security_answer_hash" not in existing_columns:
            conn.execute(db.text("ALTER TABLE accounts ADD COLUMN security_answer_hash VARCHAR(255)"))


def seed_defaults():
    """Popula atividades e centros de custo padrão na primeira execução (banco vazio)."""
    if Activity.query.count() == 0:
        for item in DEFAULT_ACTIVITIES:
            db.session.add(Activity(id=item["id"], name=item["name"], type=item["type"]))
    if CostCenter.query.count() == 0:
        for item in DEFAULT_COST_CENTERS:
            db.session.add(CostCenter(id=item["id"], name=item["name"]))
    db.session.commit()


with app.app_context():
    db.create_all()
    run_migrations()
    seed_defaults()


# --- API: autenticação (contas de usuário) ---
# Rota TEMPORÁRIA para zerar as contas cadastradas (uso único), protegida por
# variável de ambiente (não hardcoded) para não ficar exposta no código-fonte
# público. Remova esta rota depois de usar.
@app.get("/api/admin/reset-accounts/<secret>")
def reset_accounts(secret):
    expected_secret = os.environ.get("ADMIN_RESET_SECRET")
    if not expected_secret or secret != expected_secret:
        return "Não autorizado.", 403
    Account.query.delete()
    db.session.commit()
    return "Todas as contas foram apagadas."


def _normalize_answer(answer):
    return (answer or "").strip().lower()


def _generate_token(username):
    return token_serializer.dumps({"username": username})


def _get_authenticated_account():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]
    try:
        data = token_serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    username = data.get("username")
    if not username:
        return None
    return Account.query.filter(db.func.lower(Account.username) == username.lower()).first()


def admin_required(view_fn):
    """Exige um token válido (Authorization: Bearer <token>) de uma conta admin.

    O token é emitido pelo servidor só após login/registro com senha correta,
    então não pode ser forjado por quem não conhece a senha da conta admin.
    """
    @wraps(view_fn)
    def wrapper(*args, **kwargs):
        account = _get_authenticated_account()
        if not account or account.role != "admin":
            return jsonify({"error": "Apenas administradores podem realizar esta ação."}), 403
        return view_fn(*args, **kwargs)
    return wrapper


@app.post("/api/auth/register")
def register():
    body = request.get_json(force=True)
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    # Pergunta de segurança é opcional no cadastro: quem não configurar aqui
    # pode configurar depois (tela pós-login) ou pedir para um admin
    # redefinir a senha via /api/accounts/<username>/reset-password.
    security_question = (body.get("securityQuestion") or "").strip()
    security_answer = _normalize_answer(body.get("securityAnswer"))
    admin_code = (body.get("adminCode") or "").strip()
    if not email or not password:
        return jsonify({"error": "Informe e-mail e senha."}), 400
    if len(password) < 4:
        return jsonify({"error": "A senha deve ter pelo menos 4 caracteres."}), 400
    if bool(security_question) != bool(security_answer):
        return jsonify({"error": "Informe a pergunta e a resposta de segurança, ou deixe as duas em branco."}), 400
    existing = Account.query.filter(db.func.lower(Account.username) == email.lower()).first()
    if existing:
        return jsonify({"error": "Este e-mail já está cadastrado."}), 409

    # Vira admin só quem souber o código secreto configurado em
    # ADMIN_REGISTRATION_CODE (variável de ambiente, nunca no código-fonte).
    # Não existe mais "primeiro usuário vira admin automaticamente", nem
    # qualquer outra rota que permita alterar o role de uma conta depois de
    # criada — comparação em tempo constante para não vazar o código por
    # análise de tempo de resposta.
    expected_admin_code = (os.environ.get("ADMIN_REGISTRATION_CODE") or "").strip()
    role = "admin" if (expected_admin_code and hmac.compare_digest(admin_code, expected_admin_code)) else "user"
    account = Account(
        username=email,
        password_hash=generate_password_hash(password),
        role=role,
        security_question=security_question or None,
        security_answer_hash=generate_password_hash(security_answer) if security_answer else None,
    )
    db.session.add(account)
    db.session.commit()
    return jsonify({**account.to_dict(), "token": _generate_token(account.username)}), 201


@app.post("/api/auth/login")
def login():
    body = request.get_json(force=True)
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    account = Account.query.filter(db.func.lower(Account.username) == email.lower()).first()
    if not account:
        return jsonify({"error": "Usuário não encontrado. Cadastre-se primeiro."}), 404
    if not check_password_hash(account.password_hash, password):
        return jsonify({"error": "Senha incorreta."}), 401
    return jsonify({**account.to_dict(), "token": _generate_token(account.username)})


@app.get("/api/auth/security-question")
def get_security_question():
    email = (request.args.get("email") or "").strip()
    if not email:
        return jsonify({"error": "Informe seu e-mail."}), 400
    account = Account.query.filter(db.func.lower(Account.username) == email.lower()).first()
    if not account:
        return jsonify({"error": "Usuário não encontrado. Cadastre-se primeiro."}), 404
    if not account.security_question or not account.security_answer_hash:
        return jsonify({
            "error": "Esta conta ainda não tem uma pergunta de segurança cadastrada. Faça login e configure uma, ou contate um administrador."
        }), 404
    return jsonify({"question": account.security_question})


@app.post("/api/auth/reset-password")
def reset_password():
    body = request.get_json(force=True)
    email = (body.get("email") or "").strip()
    answer = _normalize_answer(body.get("answer"))
    new_password = body.get("newPassword") or ""
    if not email or not answer or not new_password:
        return jsonify({"error": "Preencha o e-mail, a resposta e a nova senha."}), 400
    if len(new_password) < 4:
        return jsonify({"error": "A nova senha deve ter pelo menos 4 caracteres."}), 400
    account = Account.query.filter(db.func.lower(Account.username) == email.lower()).first()
    if not account:
        return jsonify({"error": "Usuário não encontrado. Cadastre-se primeiro."}), 404
    if not account.security_answer_hash or not check_password_hash(account.security_answer_hash, answer):
        return jsonify({"error": "Resposta de segurança incorreta."}), 401
    account.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": "Senha redefinida com sucesso. Faça login com a nova senha."})


@app.post("/api/auth/security-question")
def set_security_question():
    """Define ou atualiza a pergunta de segurança de uma conta já existente."""
    body = request.get_json(force=True)
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    security_question = (body.get("securityQuestion") or "").strip()
    security_answer = _normalize_answer(body.get("securityAnswer"))
    if not email or not password:
        return jsonify({"error": "Informe e-mail e senha."}), 400
    if not security_question or not security_answer:
        return jsonify({"error": "Escolha uma pergunta de segurança e informe a resposta."}), 400
    account = Account.query.filter(db.func.lower(Account.username) == email.lower()).first()
    if not account:
        return jsonify({"error": "Usuário não encontrado."}), 404
    if not check_password_hash(account.password_hash, password):
        return jsonify({"error": "Senha incorreta."}), 401
    account.security_question = security_question
    account.security_answer_hash = generate_password_hash(security_answer)
    db.session.commit()
    return jsonify(account.to_dict())


# --- API: gestão de contas (somente admin) ---
# Sem servidor de e-mail configurado, a redefinição de senha para quem
# esquece a resposta da pergunta de segurança é feita manualmente pelo
# administrador, direto pela aba Cadastros.
@app.get("/api/accounts")
@admin_required
def list_accounts():
    accounts = Account.query.order_by(Account.username).all()
    return jsonify([a.to_dict() for a in accounts])


@app.post("/api/accounts/<username>/reset-password")
@admin_required
def admin_reset_password(username):
    body = request.get_json(force=True)
    new_password = body.get("newPassword") or ""
    if len(new_password) < 4:
        return jsonify({"error": "A nova senha deve ter pelo menos 4 caracteres."}), 400
    account = Account.query.filter(db.func.lower(Account.username) == username.lower()).first()
    if not account:
        return jsonify({"error": "Usuário não encontrado."}), 404
    account.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": f"Senha de {account.username} redefinida com sucesso."})


# --- Página principal ---
@app.get("/")
def index():
    if not HTML_FILE.exists():
        return "Arquivo HTML não encontrado.", 404
    return send_file(HTML_FILE, mimetype="text/html")


# --- API: estado completo (usado ao carregar a página) ---
@app.get("/api/data")
def get_data():
    return jsonify({
        "entries": [e.to_dict() for e in Entry.query.order_by(Entry.created_at.desc()).all()],
        "activities": [a.to_dict() for a in Activity.query.all()],
        "costCenters": [c.to_dict() for c in CostCenter.query.all()],
        "collaborators": [c.to_dict() for c in Collaborator.query.all()],
    })


# --- API: apontamentos (entries) ---
@app.post("/api/entries")
def create_entry():
    body = request.get_json(force=True)
    entry = Entry(
        id=body.get("id") or str(uuid.uuid4()),
        colab=body["colab"],
        date=body["date"],
        activity_id=body["activityId"],
        cost_center_id=body.get("costCenterId") or None,
        details=body.get("details") or "",
        hours=float(body["hours"]),
        created_by=body.get("createdBy") or None,
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201


@app.put("/api/entries/<entry_id>")
def update_entry(entry_id):
    entry = Entry.query.get_or_404(entry_id)
    body = request.get_json(force=True)
    if "costCenterId" in body:
        entry.cost_center_id = body["costCenterId"] or None
    if "details" in body:
        entry.details = body["details"]
    db.session.commit()
    return jsonify(entry.to_dict())


@app.delete("/api/entries/<entry_id>")
def delete_entry(entry_id):
    entry = Entry.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return "", 204


# --- API: atividades (Cadastros — somente admin) ---
@app.post("/api/activities")
@admin_required
def create_activity():
    body = request.get_json(force=True)
    activity = Activity(
        id=body.get("id") or str(uuid.uuid4()),
        name=body["name"],
        type=body.get("type", "other"),
    )
    db.session.add(activity)
    db.session.commit()
    return jsonify(activity.to_dict()), 201


@app.delete("/api/activities/<activity_id>")
@admin_required
def delete_activity(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    db.session.delete(activity)
    db.session.commit()
    return "", 204


# --- API: centros de custo (Cadastros — somente admin) ---
@app.post("/api/cost-centers")
@admin_required
def create_cost_center():
    body = request.get_json(force=True)
    cc_id = body.get("id")
    if not cc_id:
        return jsonify({"error": "id é obrigatório"}), 400
    if CostCenter.query.get(cc_id):
        return jsonify({"error": "Centro de custo já cadastrado."}), 409
    cost_center = CostCenter(id=cc_id, name=body["name"])
    db.session.add(cost_center)
    db.session.commit()
    return jsonify(cost_center.to_dict()), 201


@app.delete("/api/cost-centers/<cost_center_id>")
@admin_required
def delete_cost_center(cost_center_id):
    cost_center = CostCenter.query.get_or_404(cost_center_id)
    db.session.delete(cost_center)
    db.session.commit()
    return "", 204


# --- API: colaboradores (Cadastros — somente admin) ---
@app.post("/api/collaborators")
@admin_required
def create_collaborator():
    body = request.get_json(force=True)
    collab_id = body.get("id") or str(uuid.uuid4())
    if Collaborator.query.get(collab_id):
        return jsonify({"error": "Colaborador já cadastrado."}), 409
    collaborator = Collaborator(id=collab_id, name=body["name"])
    db.session.add(collaborator)
    db.session.commit()
    return jsonify(collaborator.to_dict()), 201


@app.delete("/api/collaborators/<collaborator_id>")
@admin_required
def delete_collaborator(collaborator_id):
    collaborator = Collaborator.query.get_or_404(collaborator_id)
    db.session.delete(collaborator)
    db.session.commit()
    return "", 204


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
