# Certificados SSL — Cloudflare Origin Certificate

Esta carpeta debe contener DOS archivos generados desde el dashboard de Cloudflare:

    cloudflare-origin.crt   ← certificado
    cloudflare-origin.key   ← clave privada

## Cómo generarlos

1. Ir a: Cloudflare Dashboard → Tu dominio (conectaai.cl) → SSL/TLS → Origin Server
2. Hacer clic en "Create Certificate"
3. Tipo: RSA 2048
4. Hostnames: works.conectaai.cl, *.works.conectaai.cl
5. Validez: 15 años
6. Copiar el contenido en estos archivos

## Permisos después de copiar

    chmod 600 cloudflare-origin.key
    chmod 644 cloudflare-origin.crt

## IMPORTANTE

- Estos archivos NO deben commitearse a git (ver .gitignore)
- El certificado Origin de Cloudflare solo funciona cuando Cloudflare proxea el tráfico
- En Cloudflare Dashboard configurar SSL/TLS → modo: "Full (strict)"
