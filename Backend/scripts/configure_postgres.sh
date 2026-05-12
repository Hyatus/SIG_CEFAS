#!/usr/bin/env bash

set -euo pipefail

PG_ROOT="/Library/PostgreSQL/18"
DB_NAME="sig_bakery"
DB_USER="postgres"
DB_PASSWORD="postgres"
LOAD_SCHEMA=1
AUTO_YES=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCHEMA_FILE="${BACKEND_DIR}/schema.sql"
ENV_EXAMPLE_FILE="${BACKEND_DIR}/.env.example"
ENV_FILE="${BACKEND_DIR}/.env"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/configure_postgres.sh [opciones]

Opciones:
  --pg-root PATH        Ruta raíz de PostgreSQL (default: /Library/PostgreSQL/18)
  --db-name NAME        Nombre de la base (default: sig_bakery)
  --db-user USER        Usuario a configurar (default: postgres)
  --db-password PASS    Contraseña del usuario (default: postgres)
  --schema FILE         Ruta al schema.sql (default: Backend/schema.sql)
  --env-file FILE       Ruta del .env a crear/actualizar (default: Backend/.env)
  --skip-schema         No ejecutar schema.sql
  --yes                 Ejecutar sin pedir confirmación
  -h, --help            Mostrar esta ayuda

Qué hace el script:
  1) Respalda pg_hba.conf
  2) Habilita auth trust temporal para postgres
  3) Reinicia PostgreSQL
  4) Cambia contraseña del usuario indicado
  5) Crea la base si no existe
  6) Ejecuta schema.sql (opcional)
  7) Restaura pg_hba.conf original y reinicia
  8) Crea/actualiza .env con los valores finales
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pg-root)
      PG_ROOT="$2"
      shift 2
      ;;
    --db-name)
      DB_NAME="$2"
      shift 2
      ;;
    --db-user)
      DB_USER="$2"
      shift 2
      ;;
    --db-password)
      DB_PASSWORD="$2"
      shift 2
      ;;
    --schema)
      SCHEMA_FILE="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --skip-schema)
      LOAD_SCHEMA=0
      shift
      ;;
    --yes)
      AUTO_YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      usage
      exit 1
      ;;
  esac
done

PG_CTL="${PG_ROOT}/bin/pg_ctl"
PSQL="${PG_ROOT}/bin/psql"
DATA_DIR="${PG_ROOT}/data"
PG_HBA_FILE="${DATA_DIR}/pg_hba.conf"

if [[ ! -x "${PG_CTL}" || ! -x "${PSQL}" ]]; then
  echo "No se encontraron binarios en ${PG_ROOT}/bin (pg_ctl/psql)." >&2
  exit 1
fi

if [[ ! -d "${DATA_DIR}" || ! -f "${PG_HBA_FILE}" ]]; then
  echo "No se encontró data dir o pg_hba.conf en ${DATA_DIR}." >&2
  exit 1
fi

if [[ ${LOAD_SCHEMA} -eq 1 && ! -f "${SCHEMA_FILE}" ]]; then
  echo "No se encontró schema file en ${SCHEMA_FILE}." >&2
  exit 1
fi

run_privileged() {
  if [[ ${EUID} -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

restart_postgres() {
  if [[ -z "${OWNER_USER}" ]]; then
    echo "No se pudo determinar el usuario propietario de PostgreSQL." >&2
    return 1
  fi

  if [[ ${EUID} -eq 0 ]]; then
    su - "${OWNER_USER}" -c "\"${PG_CTL}\" -D \"${DATA_DIR}\" restart >/dev/null"
  else
    sudo -u "${OWNER_USER}" "${PG_CTL}" -D "${DATA_DIR}" restart >/dev/null
  fi
}

set_env_key() {
  local env_file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "${env_file}"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "${env_file}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${env_file}"
  fi
}

BACKUP_FILE=""
TMP_FILE=""
TEMP_TRUST_ACTIVE=0
OWNER_USER=""
OWNER_GROUP=""
FILE_MODE=""

cleanup() {
  local status=$?

  if [[ ${TEMP_TRUST_ACTIVE} -eq 1 && -n "${BACKUP_FILE}" && -f "${BACKUP_FILE}" ]]; then
    echo "[INFO] Restaurando pg_hba.conf original..."
    run_privileged cp "${BACKUP_FILE}" "${PG_HBA_FILE}" || true
    if [[ -n "${OWNER_USER}" && -n "${OWNER_GROUP}" ]]; then
      run_privileged chown "${OWNER_USER}:${OWNER_GROUP}" "${PG_HBA_FILE}" || true
    fi
    if [[ -n "${FILE_MODE}" ]]; then
      run_privileged chmod "${FILE_MODE}" "${PG_HBA_FILE}" || true
    fi
    restart_postgres >/dev/null 2>&1 || true
  fi

  [[ -n "${TMP_FILE}" && -f "${TMP_FILE}" ]] && rm -f "${TMP_FILE}"
  [[ -n "${BACKUP_FILE}" && -f "${BACKUP_FILE}" ]] && rm -f "${BACKUP_FILE}"

  exit ${status}
}

trap cleanup EXIT

if [[ ${AUTO_YES} -ne 1 ]]; then
  echo "Este script modificará temporalmente pg_hba.conf y usará sudo para reiniciar PostgreSQL."
  read -r -p "¿Deseas continuar? [y/N]: " answer
  if [[ ! "${answer}" =~ ^[Yy]$ ]]; then
    echo "Operación cancelada."
    exit 0
  fi
fi

OWNER_USER="$(stat -f %Su "${PG_HBA_FILE}")"
OWNER_GROUP="$(stat -f %Sg "${PG_HBA_FILE}")"
FILE_MODE="$(stat -f %OLp "${PG_HBA_FILE}")"
BACKUP_FILE="$(mktemp /tmp/pg_hba.conf.backup.XXXXXX)"
TMP_FILE="$(mktemp /tmp/pg_hba.conf.tmp.XXXXXX)"

cp "${PG_HBA_FILE}" "${BACKUP_FILE}" 2>/dev/null || run_privileged cp "${PG_HBA_FILE}" "${BACKUP_FILE}"

cat > "${TMP_FILE}" <<EOF
# SIG_BAKERY_AUTOCONFIG_BEGIN
local   all   postgres   trust
host    all   postgres   127.0.0.1/32   trust
host    all   postgres   ::1/128        trust
# SIG_BAKERY_AUTOCONFIG_END

EOF
cat "${BACKUP_FILE}" >> "${TMP_FILE}"

run_privileged cp "${TMP_FILE}" "${PG_HBA_FILE}"
run_privileged chown "${OWNER_USER}:${OWNER_GROUP}" "${PG_HBA_FILE}"
run_privileged chmod "${FILE_MODE}" "${PG_HBA_FILE}"

echo "[INFO] Reiniciando PostgreSQL con auth temporal trust..."
restart_postgres
TEMP_TRUST_ACTIVE=1

SQL_SAFE_PASSWORD="${DB_PASSWORD//\'/\'\'}"
SQL_SAFE_DB_NAME="${DB_NAME//\'/\'\'}"

echo "[INFO] Actualizando contraseña de ${DB_USER}..."
"${PSQL}" -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${SQL_SAFE_PASSWORD}';"

DB_EXISTS="$(${PSQL} -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -Atc "SELECT 1 FROM pg_database WHERE datname='${SQL_SAFE_DB_NAME}'")"
if [[ "${DB_EXISTS}" != "1" ]]; then
  echo "[INFO] Creando base ${DB_NAME}..."
  "${PSQL}" -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE \"${DB_NAME}\";"
fi

if [[ ${LOAD_SCHEMA} -eq 1 ]]; then
  echo "[INFO] Aplicando schema en ${DB_NAME}..."
  "${PSQL}" -h localhost -U postgres -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "${SCHEMA_FILE}"
fi

echo "[INFO] Restaurando auth segura de pg_hba.conf..."
run_privileged cp "${BACKUP_FILE}" "${PG_HBA_FILE}"
run_privileged chown "${OWNER_USER}:${OWNER_GROUP}" "${PG_HBA_FILE}"
run_privileged chmod "${FILE_MODE}" "${PG_HBA_FILE}"
restart_postgres
TEMP_TRUST_ACTIVE=0

if [[ -f "${ENV_EXAMPLE_FILE}" && ! -f "${ENV_FILE}" ]]; then
  cp "${ENV_EXAMPLE_FILE}" "${ENV_FILE}"
fi

if [[ -f "${ENV_FILE}" ]]; then
  set_env_key "${ENV_FILE}" "DB_HOST" "localhost"
  set_env_key "${ENV_FILE}" "DB_PORT" "5432"
  set_env_key "${ENV_FILE}" "DB_NAME" "${DB_NAME}"
  set_env_key "${ENV_FILE}" "DB_USER" "${DB_USER}"
  set_env_key "${ENV_FILE}" "DB_PASSWORD" "${DB_PASSWORD}"
fi

echo "[INFO] Validando conexión final..."
PGPASSWORD="${DB_PASSWORD}" "${PSQL}" -h localhost -p 5432 -U "${DB_USER}" -d "${DB_NAME}" \
  -v ON_ERROR_STOP=1 -c "SELECT current_user, current_database();"

echo "[OK] Configuración completada."
echo "[OK] Usuario: ${DB_USER}"
echo "[OK] Base: ${DB_NAME}"
echo "[OK] Host/Puerto: localhost:5432"
