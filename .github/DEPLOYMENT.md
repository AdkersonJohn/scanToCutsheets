# Deployment Configuration Guide

This document outlines the required configuration for the CI/CD pipeline to deploy the Scan to Cut Sheets application to Azure Static Web Apps.

## GitHub Repository Configuration

### Required Secrets

Configure these in: **Repository Settings > Secrets and variables > Actions > Secrets**

| Secret Name | Description | Where to Get It |
|------------|-------------|-----------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token for Azure Static Web Apps | Azure Portal > Static Web App resource > Manage deployment token |
| `AZURE_CLIENT_ID` | Azure AD App Registration Client ID | Azure Portal > App Registration > Overview |
| `AZURE_CLIENT_SECRET` | Azure AD App Registration Client Secret | Azure Portal > App Registration > Certificates & secrets |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | Azure Portal > App Registration > Overview |

### Required Variables

Configure these in: **Repository Settings > Secrets and variables > Actions > Variables**

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `VITE_AZURE_CLIENT_ID` | Azure AD App Client ID (frontend) | `2f32f0cc-9c19-43f2-9c1c-6dd2b7b8b749` |
| `VITE_AZURE_TENANT_ID` | Azure AD Tenant ID | `d5a7739d-02bc-4ac7-8edd-9c2253141e57` |
| `VITE_AZURE_REDIRECT_URI` | OAuth redirect URI | `https://your-app.azurestaticapps.net` |
| `VITE_TEAMS_APP_ID_URI` | Teams App ID URI | `api://your-app.azurestaticapps.net/your-client-id` |
| `VITE_API_BASE_URL` | Backend API base URL | `https://your-app.azurestaticapps.net/api` |
| `VITE_SHAREPOINT_SITE_ID` | SharePoint site ID | `your-sharepoint-site-id` |
| `VITE_SHAREPOINT_LIST_ID` | SharePoint list ID | `your-sharepoint-list-id` |
| `PRODUCTION_URL` | Production URL for health checks | `https://your-app.azurestaticapps.net` |

## Azure Configuration

### Azure Static Web App

1. Create an Azure Static Web App in the Azure Portal
2. Link it to your GitHub repository
3. The deployment token will be automatically added as a secret by Azure
4. Configure the following Application Settings in the Azure Portal:
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`

### Azure AD App Registration

1. Register an application in Azure AD
2. Configure the following:
   - **Redirect URIs (SPA):**
     - `https://your-app.azurestaticapps.net`
     - `https://your-app.azurestaticapps.net/auth-end`
   - **API Permissions (Delegated):**
     - `User.Read`
     - `Sites.ReadWrite.All`
   - **Pre-authorized applications** (for Teams SSO):
     - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams desktop/mobile)
     - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web)
3. Create a client secret and save it securely

### Teams Manifest

Update `teams/manifest.json` with production values:

```json
{
  "staticTabs": [
    {
      "contentUrl": "https://your-app.azurestaticapps.net"
    }
  ],
  "validDomains": [
    "your-app.azurestaticapps.net",
    "*.login.microsoftonline.com",
    "*.sharepoint.com"
  ],
  "webApplicationInfo": {
    "id": "your-client-id",
    "resource": "api://your-app.azurestaticapps.net/your-client-id"
  }
}
```

## Pipeline Overview

### Stages

1. **Lint & Type Check** - Static analysis (ESLint, TypeScript)
2. **Security Scan** - Dependency vulnerability scanning (npm audit)
3. **Test** - Unit tests with coverage (Vitest)
4. **Build Frontend** - Production Vite build
5. **Build Backend** - TypeScript compilation for Azure Functions
6. **Deploy** - Upload to Azure Static Web Apps
7. **Verify** - Post-deployment health checks

### Triggers

- **Push to main**: Full pipeline with production deployment
- **Pull Request**: Full pipeline with preview environment deployment
- **PR Closed**: Cleanup preview environment

## Rollback Procedure

If a deployment fails or causes issues:

1. **Identify the problem:**
   ```bash
   # Check GitHub Actions logs
   gh run view --log-failed
   ```

2. **Rollback to previous deployment:**
   - Go to Azure Portal > Static Web App > Deployments
   - Find the last known good deployment
   - Click "Redeploy" or use the deployment URL

3. **Or revert the commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

## Troubleshooting

### Pipeline Failures

| Error | Cause | Solution |
|-------|-------|----------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN not found` | Secret not configured | Add the secret in repository settings |
| `npm audit found vulnerabilities` | Security issues in dependencies | Run `npm audit fix` locally |
| `TypeScript errors` | Type check failed | Fix TypeScript errors before pushing |
| `Tests failed` | Unit tests failing | Run `npm test` locally to debug |

### Deployment Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 on page refresh | SPA routing not configured | Check `staticwebapp.config.json` navigationFallback |
| API returns 500 | Backend misconfiguration | Check Azure Functions logs in portal |
| Auth failures | MSAL misconfiguration | Verify redirect URIs match exactly |

## Monitoring

- **GitHub Actions**: Check workflow runs at `https://github.com/AdkersonJohn/scanToCutsheets/actions`
- **Azure Portal**: Monitor application insights and deployment logs
- **Static Web App Logs**: Azure Portal > Static Web App > Application Insights
