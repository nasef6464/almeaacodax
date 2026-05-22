# Backup And Restore Production

## MongoDB Backup

```bash
MONGODB_URI="mongodb+srv://..." bash scripts/backup-db.sh
```

## MongoDB Restore

```bash
MONGODB_URI="mongodb+srv://..." BACKUP_PATH="backups/mongodb/20260522-120000" bash scripts/restore-db.sh
```

The restore script requires typing `RESTORE` and uses `mongorestore --drop`.

## Uploads Backup

```bash
UPLOAD_DIR=server/uploads bash scripts/backup-uploads.sh
```

## Uploads Restore

```bash
ARCHIVE_PATH=backups/uploads/uploads-20260522-120000.tar.gz bash scripts/restore-uploads.sh
```

## Cron Example

```cron
0 2 * * * cd /var/www/almeaa-codax/current && MONGODB_URI="mongodb+srv://..." bash scripts/backup-db.sh
15 2 * * * cd /var/www/almeaa-codax/current && UPLOAD_DIR=server/uploads bash scripts/backup-uploads.sh
```

## Migration Checklist

1. Backup DB.
2. Backup uploads.
3. Deploy VPS.
4. Configure env.
5. Run PM2 or Docker.
6. Configure Nginx.
7. Configure SSL.
8. Verify health.
9. Verify login.
10. Verify admin/student flows.
11. Verify package/path/course navigation.
12. Verify payment dry-run.
13. Switch DNS.
14. Keep Vercel/Render rollback for 48 hours.
