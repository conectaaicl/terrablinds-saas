FROM python:3.12-slim

WORKDIR /app

# Dependencias del sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Script de inicio: espera DB, aplica migraciones SQL, inicia uvicorn
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Para crear el primer superadmin:
#   docker exec -it workshopos-backend python create_superadmin.py
CMD ["/app/start.sh"]
