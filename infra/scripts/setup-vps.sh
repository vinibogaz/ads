#!/bin/bash
# VPS Setup Script — Ubuntu 24.04
# Run as root: bash setup-vps.sh
set -euo pipefail

echo "=== Synthex VPS Setup ==="

# Update system
apt-get update && apt-get upgrade -y

# Install essentials
apt-get install -y \
  curl wget git unzip \
  ca-certificates \
  gnupg lsb-release \
  ufw \
  fail2ban \
  htop \
  jq \
  awscli

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# Install Docker Compose v2
apt-get install -y docker-compose-plugin

# Configure firewall (UFW)
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Create app directory
mkdir -p /opt/synthex
chown ubuntu:ubuntu /opt/synthex

# Setup swap (4GB)
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Kernel optimizations for Node.js/PostgreSQL
cat >> /etc/sysctl.conf << 'EOF'
# Network performance
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
# PostgreSQL
vm.overcommit_memory = 2
vm.swappiness = 10
# Redis
vm.overcommit_memory = 1
EOF
sysctl -p

# Setup log rotation
cat > /etc/logrotate.d/synthex << 'EOF'
/opt/synthex/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
EOF

# Setup backup cron (daily pg_dump to S3)
cat > /opt/synthex/backup.sh << 'BACKUP'
#!/bin/bash
set -e
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="/tmp/synthex-backup-$DATE.sql.gz"

docker exec synthex-postgres pg_dump \
  -U synthex_app synthex | gzip > $BACKUP_FILE

aws s3 cp $BACKUP_FILE s3://synthex-backups/postgres/$DATE.sql.gz \
  --region sa-east-1 --storage-class STANDARD_IA

rm -f $BACKUP_FILE
echo "Backup completed: $DATE"
BACKUP
chmod +x /opt/synthex/backup.sh

(crontab -l 2>/dev/null; echo "0 3 * * * /opt/synthex/backup.sh >> /var/log/synthex-backup.log 2>&1") | crontab -

echo ""
echo "=== VPS Setup Complete ==="
echo "Next steps:"
echo "1. Copy your .env.production to /opt/synthex/"
echo "2. Copy docker-compose.prod.yml to /opt/synthex/infra/compose/"
echo "3. Setup SSL: certbot certonly --nginx -d synthex.com.br"
echo "4. Run: docker compose -f infra/compose/docker-compose.prod.yml up -d"
