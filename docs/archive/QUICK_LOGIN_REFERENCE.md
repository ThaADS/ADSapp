# Quick Login Reference

## Demo Accounts - Quick Access

### Owner Account (Full Access)
```
Email:    owner@demo-company.com
Password: Demo2024!Owner
```

### Admin Account (Team Management)
```
Email:    admin@demo-company.com
Password: Demo2024!Admin
```

### Agent Account (Message Handling)
```
Email:    agent@demo-company.com
Password: Demo2024!Agent
```

### Super Admin (System-Wide)
```
Email:    superadmin@adsapp.com
Password: [Use existing super admin password]
```

---

## Organization Details

**Organization ID:** `d6c6e3de-cab8-42d0-b478-69818f9773e9`
**Company Name:** Demo Company
**Subdomain:** demo-company

---

## Utility Scripts

### Create Demo Accounts
```bash
node create-demo-accounts.js
```

### Cleanup Demo Accounts
```bash
node cleanup-demo-accounts.js
```

### Verify Demo Accounts
```bash
node verify-demo-accounts.js
```

---

## Role Access Summary

| Route | Owner | Admin | Agent |
|-------|-------|-------|-------|
| `/dashboard` | ✅ | ✅ | ✅ |
| `/dashboard/conversations` | ✅ All | ✅ All | ✅ Assigned |
| `/dashboard/contacts` | ✅ | ✅ | ✅ View |
| `/dashboard/templates` | ✅ | ✅ | ❌ |
| `/dashboard/automation` | ✅ | ✅ | ❌ |
| `/dashboard/analytics` | ✅ Full | ✅ Full | ✅ Personal |
| `/dashboard/settings` | ✅ | ✅ | ✅ Profile |
| `/dashboard/settings/team` | ✅ | ✅ | ❌ |
| `/dashboard/settings/organization` | ✅ | ❌ | ❌ |
| `/dashboard/settings/billing` | ✅ | ❌ | ❌ |
| `/admin` | ❌ | ❌ | ❌ |

---

For full documentation, see **DEMO_ACCOUNTS.md**