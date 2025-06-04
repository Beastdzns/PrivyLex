FROM python:3.13.3-alpine3.21

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    libxml2-dev \
    libxslt-dev \
    cargo \
    rust

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Clean up build dependencies to reduce image size
RUN apk del gcc musl-dev libffi-dev cargo rust

COPY src/ ./

# Use ENTRYPOINT instead of CMD to properly handle arguments
ENTRYPOINT ["python", "app.py"]